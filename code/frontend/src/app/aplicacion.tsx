import { Alerta } from '../shared/ui/componentes.tsx'
import { useSesion } from '../shared/sesion/use-sesion.ts'
import { useRuta } from '../shared/utils/use-ruta.ts'
import { NuevaCuenta } from '../modules/m1-usuarios-acceso/components/nueva-cuenta.tsx'
import { PantallaAcceso } from '../modules/m1-usuarios-acceso/components/pantalla-acceso.tsx'
import { AsignarCambiarPlan } from '../modules/m5-planes-tarifas-pagos/components/asignar-cambiar-plan.tsx'
import { PlanesTarifas } from '../modules/m5-planes-tarifas-pagos/components/planes-tarifas.tsx'
import {
  RegistrarPago,
  type PestanaPago,
} from '../modules/m5-planes-tarifas-pagos/components/registrar-pago.tsx'
import { PERMISOS_M5 } from '../modules/m5-planes-tarifas-pagos/types/m5.types.ts'
import { InventarioUniformes } from '../modules/m6-inventario-uniformes/components/inventario-uniformes.tsx'
import { PrestamosUniformes } from '../modules/m6-inventario-uniformes/components/prestamos-uniformes.tsx'
import { VentasUniformes } from '../modules/m6-inventario-uniformes/components/ventas-uniformes.tsx'
import { PERMISOS_M6 } from '../modules/m6-inventario-uniformes/types/inventario.types.ts'
import { MarcoAplicacion } from './marco-aplicacion.tsx'

const PANTALLAS = [
  { pagina: 'planes', texto: 'Planes y tarifas', grupo: 'Planes y pagos', permiso: PERMISOS_M5.planGestionar },
  { pagina: 'asignar-plan', texto: 'Asignar o cambiar plan', grupo: 'Planes y pagos', permiso: PERMISOS_M5.planAsignar },
  { pagina: 'registrar-pago', texto: 'Registrar pago', grupo: 'Planes y pagos', permiso: PERMISOS_M5.pagoRegistrar },
  { pagina: 'inventario', texto: 'Inventario de uniformes', grupo: 'Uniformes', permiso: PERMISOS_M6.inventarioGestionar },
  { pagina: 'ventas', texto: 'Venta de uniformes', grupo: 'Uniformes', permiso: PERMISOS_M6.inventarioGestionar },
  { pagina: 'prestamos', texto: 'Préstamos de implementos', grupo: 'Uniformes', permiso: PERMISOS_M6.inventarioGestionar },
]

const PESTANAS_PAGO: PestanaPago[] = ['cobro', 'sesion', 'matricula']

/** Aplicación interna con las pantallas de M1, M5 y M6 habilitadas por rol. */
export function Aplicacion() {
  const { sesion, cargando, tienePermiso, tieneRol } = useSesion()
  const { pagina, parametros } = useRuta()

  if (cargando) {
    return (
      <main className="vl-main">
        <div className="app-page">
          <p className="vl-text-body-sm" role="status">
            Cargando…
          </p>
        </div>
      </main>
    )
  }

  if (!sesion) return <PantallaAcceso />

  const usuarios = tieneRol('ADMINISTRADOR')
    ? [{ pagina: 'nueva-cuenta', texto: 'Nueva cuenta', grupo: 'Usuarios' }]
    : []
  const permitidas = [
    ...usuarios,
    ...PANTALLAS.filter((pantalla) => tienePermiso(pantalla.permiso)),
  ]
  const actual = pagina || permitidas[0]?.pagina || ''
  const navegacion = ['Usuarios', 'Planes y pagos', 'Uniformes'].map((grupo) => ({
    grupo,
    enlaces: permitidas.filter((pantalla) => pantalla.grupo === grupo),
  }))

  let contenido
  if (permitidas.length === 0) {
    contenido = (
      <div className="app-page">
        <h1>Hola, {sesion.nombre}</h1>
        <Alerta tono="info" titulo="Aún no hay pantallas para tu rol">
          <p>Las pantallas de tu rol se irán habilitando a medida que la escuela active los módulos.</p>
        </Alerta>
      </div>
    )
  } else if (!permitidas.some((pantalla) => pantalla.pagina === actual)) {
    contenido = (
      <div className="app-page">
        <h1>Sin acceso</h1>
        <Alerta tono="warning" titulo="No tienes acceso a esta pantalla">
          <p>Usa el menú para ir a las pantallas de tu rol.</p>
        </Alerta>
      </div>
    )
  } else if (actual === 'nueva-cuenta') {
    contenido = <NuevaCuenta key={sesion.id} />
  } else if (actual === 'planes') {
    contenido = <PlanesTarifas key={sesion.id} />
  } else if (actual === 'inventario') {
    contenido = <InventarioUniformes key={sesion.id} />
  } else if (actual === 'ventas') {
    contenido = <VentasUniformes key={sesion.id} />
  } else if (actual === 'prestamos') {
    contenido = <PrestamosUniformes key={sesion.id} />
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
    <MarcoAplicacion navegacion={navegacion} paginaActual={actual}>
      {contenido}
    </MarcoAplicacion>
  )
}
