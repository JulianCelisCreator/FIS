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
import { navegacionDe, pantallasPermitidas } from './accesos-por-rol.ts'
import { MarcoAplicacion } from './marco-aplicacion.tsx'
import { PanelInicio } from './panel-Inicio.tsx'

const PESTANAS_PAGO: PestanaPago[] = ['cobro', 'sesion', 'matricula']

/** Aplicación interna por roles (/app/): pantallas de M1 y M5. Qué ve cada rol: ver accesos-por-rol.ts. */
export function Aplicacion() {
  const { sesion, cargando, error } = useSesion()
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

  // Sin sesión: ingreso de M1 (HU-M1-02), sin el marco interno ni la navegación por rol.
  if (!sesion) return <PantallaAcceso />

  // HU-M1-07: solo lo que el rol puede ver llega al menú, al inicio y a las rutas.
  const permitidas = pantallasPermitidas(sesion)
  const actual = pagina || 'inicio'
  const navegacion = [
    { grupo: 'General', enlaces: [{ pagina: 'inicio', texto: 'Inicio' }] },
    ...navegacionDe(permitidas),
  ]

  let contenido
  if (actual === 'inicio') {
    contenido = <PanelInicio sesion={sesion} pantallas={permitidas} error={error} />
  } else if (!permitidas.some((pantalla) => pantalla.pagina === actual)) {
    contenido = (
      <div className="app-page">
        <h1>Sin acceso</h1>
        <Alerta tono="warning" titulo="No tienes acceso a esta pantalla">
          <p>
            Tu rol no incluye esta pantalla. Vuelve al <a href="#/inicio">inicio</a> o usa el menú para ir a las
            pantallas de tu rol.
          </p>
        </Alerta>
      </div>
    )
  } else if (actual === 'nueva-cuenta') {
    contenido = <NuevaCuenta key={sesion.id} />
  } else if (actual === 'planes') {
    contenido = <PlanesTarifas key={sesion.id} />
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