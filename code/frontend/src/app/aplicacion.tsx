import { Alerta } from '../shared/ui/componentes.tsx'
import { useSesion } from '../shared/sesion/use-sesion.ts'
import { useRuta } from '../shared/utils/use-ruta.ts'
import { AsignarCambiarPlan } from '../modules/m5-planes-tarifas-pagos/components/asignar-cambiar-plan.tsx'
import { PlanesTarifas } from '../modules/m5-planes-tarifas-pagos/components/planes-tarifas.tsx'
import {
  RegistrarPago,
  type PestanaPago,
} from '../modules/m5-planes-tarifas-pagos/components/registrar-pago.tsx'
import { PERMISOS_M5 } from '../modules/m5-planes-tarifas-pagos/types/m5.types.ts'
import { InventarioUniformes } from '../modules/m6-inventario-uniformes/components/inventario-uniformes.tsx'
import { PERMISOS_M6 } from '../modules/m6-inventario-uniformes/types/inventario.types.ts'
import { MarcoAplicacion } from './marco-aplicacion.tsx'

/** Pantallas disponibles, su grupo de navegación y el permiso que exigen. */
const PANTALLAS = [
  {
    pagina: 'planes',
    texto: 'Planes y tarifas',
    grupo: 'Planes y pagos',
    permiso: PERMISOS_M5.planGestionar,
  },
  {
    pagina: 'asignar-plan',
    texto: 'Asignar o cambiar plan',
    grupo: 'Planes y pagos',
    permiso: PERMISOS_M5.planAsignar,
  },
  {
    pagina: 'registrar-pago',
    texto: 'Registrar pago',
    grupo: 'Planes y pagos',
    permiso: PERMISOS_M5.pagoRegistrar,
  },
  {
    pagina: 'inventario',
    texto: 'Inventario de uniformes',
    grupo: 'Uniformes',
    permiso: PERMISOS_M6.inventarioGestionar,
  },
]

const PESTANAS_PAGO: PestanaPago[] = ['cobro', 'sesion', 'matricula']

/** Aplicación interna por roles (/app/): pantallas de M5 y el inventario de M6. */
export function Aplicacion() {
  const { sesion, cargando, error, tienePermiso } = useSesion()
  const { pagina, parametros } = useRuta()

  const permitidas = PANTALLAS.filter((pantalla) => tienePermiso(pantalla.permiso))
  const actual = pagina || permitidas[0]?.pagina || ''
  const navegacion = ['Planes y pagos', 'Uniformes'].map((grupo) => ({
    grupo,
    enlaces: permitidas.filter((pantalla) => pantalla.grupo === grupo),
  }))

  let contenido
  if (cargando) {
    contenido = <p className="vl-text-body-sm" role="status">Cargando…</p>
  } else if (!sesion) {
    contenido = (
      <div className="app-page">
        <h1>Escuela de patinaje</h1>
        {error && <Alerta tono="error" titulo="No se pudo iniciar la sesión">{error}</Alerta>}
        <Alerta tono="info" titulo="Elige un usuario de prueba">
          <p>
            Mientras el módulo de Usuarios y Acceso (M1) implementa el inicio de sesión, elige con qué usuario probar en la barra
            superior.
          </p>
        </Alerta>
      </div>
    )
  } else if (!permitidas.some((pantalla) => pantalla.pagina === actual)) {
    contenido = (
      <div className="app-page">
        <h1>Sin acceso</h1>
        <Alerta tono="warning" titulo="No tienes acceso a esta pantalla">
          <p>
            {permitidas.length > 0
              ? 'Usa el menú para ir a las pantallas de tu rol.'
              : 'Tu rol no tiene pantallas habilitadas en esta aplicación.'}
          </p>
        </Alerta>
      </div>
    )
  } else if (actual === 'planes') {
    contenido = <PlanesTarifas key={sesion.id} />
  } else if (actual === 'inventario') {
    contenido = <InventarioUniformes key={sesion.id} />
  } else if (actual === 'asignar-plan') {
    contenido = (
      <AsignarCambiarPlan
        key={`${sesion.id}-${parametros}`}
        pestanaInicial={parametros.get('pestana') === 'cambiar' ? 'cambiar' : 'asignar'}
      />
    )
  } else {
    const pestana = parametros.get('pestana') as PestanaPago | null
    const patinador = Number(parametros.get('patinador'))
    contenido = (
      <RegistrarPago
        key={`${sesion.id}-${parametros}`}
        pestanaInicial={pestana && PESTANAS_PAGO.includes(pestana) ? pestana : 'cobro'}
        patinadorInicial={Number.isInteger(patinador) && patinador > 0 ? patinador : undefined}
      />
    )
  }

  return (
    <MarcoAplicacion navegacion={sesion ? navegacion : []} paginaActual={actual}>
      {contenido}
    </MarcoAplicacion>
  )
}
