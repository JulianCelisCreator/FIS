import { Alerta } from '../shared/ui/componentes.tsx'
import { useSesion } from '../shared/sesion/use-sesion.ts'
import { useRuta } from '../shared/utils/use-ruta.ts'
import { FamiliaMenor } from '../modules/m1-usuarios-acceso/components/familia-menor.tsx'
import { NuevaCuenta } from '../modules/m1-usuarios-acceso/components/nueva-cuenta.tsx'
import { Usuarios } from '../modules/m1-usuarios-acceso/components/usuarios.tsx'
import { PantallaAcceso } from '../modules/m1-usuarios-acceso/components/pantalla-acceso.tsx'
import { AsignarCambiarPlan } from '../modules/m5-planes-tarifas-pagos/components/asignar-cambiar-plan.tsx'
import { Cartera } from '../modules/m5-planes-tarifas-pagos/components/cartera.tsx'
import { HistorialPagos } from '../modules/m5-planes-tarifas-pagos/components/historial-pagos.tsx'
import { MisPagos } from '../modules/m5-planes-tarifas-pagos/components/mis-pagos.tsx'
import { PlanesTarifas } from '../modules/m5-planes-tarifas-pagos/components/planes-tarifas.tsx'
import {
  RegistrarPago,
  type PestanaPago,
} from '../modules/m5-planes-tarifas-pagos/components/registrar-pago.tsx'
import { PERMISOS_M5 } from '../modules/m5-planes-tarifas-pagos/types/m5.types.ts'
import { M4Modulo } from '../modules/m4-competencias-resultados/components/m4-modulo.tsx'
import { PERMISOS_M4 } from '../modules/m4-competencias-resultados/types/m4.types.ts'
import { ConfiguracionGrupos } from '../modules/m3-grupos-horarios/components/configuracion-grupos.tsx'
import { MarcoAplicacion } from './marco-aplicacion.tsx'

/** Pantallas disponibles y el permiso que exige cada una. */
const PANTALLAS = [
  { pagina: 'm4', texto: 'Competencias y resultados', permiso: PERMISOS_M4.consultar },
  { pagina: 'planes', texto: 'Planes y tarifas', permiso: PERMISOS_M5.planGestionar },
  { pagina: 'asignar-plan', texto: 'Asignar o cambiar plan', permiso: PERMISOS_M5.planAsignar },
  { pagina: 'cartera', texto: 'Cartera', permiso: PERMISOS_M5.carteraConsultar },
  { pagina: 'registrar-pago', texto: 'Registrar pago', permiso: PERMISOS_M5.pagoRegistrar },
  { pagina: 'historial-pagos', texto: 'Historial de pagos', permiso: PERMISOS_M5.pagoHistorial },
]

/** Pantallas de M1 solo para el Administrador (HU-M1-01 y 05; la matriz de permisos llega con HU-M1-07). */
const PANTALLAS_ADMINISTRADOR = [{ pagina: 'usuarios', texto: 'Usuarios' }]
/** Pantallas del Módulo 3 (Grupos, horarios y programación) para Administrador. */
const PANTALLAS_M3_ADMIN = [{ pagina: 'grupos', texto: 'Configuración de grupos' }]
/** Pantallas que no van en el menú: se abren desde otra y resaltan a su pantalla de origen. */
const SUBPANTALLAS_ADMINISTRADOR: Record<string, string> = { 'nueva-cuenta': 'usuarios' }

/** HU-M1-09: el Administrador y el Acudiente consultan la autorización del menor. */
const PANTALLA_FAMILIA = { pagina: 'familia-menor', texto: 'Familia del menor' }

const PESTANAS_PAGO: PestanaPago[] = ['cobro', 'sesion', 'matricula']

/** Aplicación interna por roles (/app/): pantallas de M1 y M5. */
export function Aplicacion() {
  const { sesion, cargando, error, tienePermiso, tieneRol } = useSesion()
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

  // Modo directo para demostración de Módulo 3 si no hay sesión activa en BD M1
  if (!sesion && pagina === 'grupos') {
    return (
      <MarcoAplicacion
        navegacion={[{ grupo: 'Grupos y horarios', enlaces: PANTALLAS_M3_ADMIN }]}
        paginaActual="grupos"
      >
        <ConfiguracionGrupos />
      </MarcoAplicacion>
    )
  }

  // Sin sesión: ingreso de M1 (HU-M1-02), sin el marco interno ni la navegación por rol.
  if (!sesion) return <PantallaAcceso />

  const usuarios = [
    ...(tieneRol('ADMINISTRADOR') ? PANTALLAS_ADMINISTRADOR : []),
    ...(tieneRol('ADMINISTRADOR') || tieneRol('ACUDIENTE') ? [PANTALLA_FAMILIA] : []),
  ]
  const gruposHorarios = tieneRol('ADMINISTRADOR') ? PANTALLAS_M3_ADMIN : []
  // «Mis pagos» es la vista del Acudiente y del Patinador (RF-M5-17 y 18); el backend acota los patinadores.
  const misPagos =
    tieneRol('ACUDIENTE') || tieneRol('PATINADOR')
      ? [{ pagina: 'mis-pagos', texto: tieneRol('ACUDIENTE') ? 'Pagos de mis patinadores' : 'Mis pagos' }]
      : []
  const pagos = [...PANTALLAS.filter((pantalla) => tienePermiso(pantalla.permiso)), ...misPagos]
  const subpantallas = tieneRol('ADMINISTRADOR') ? Object.keys(SUBPANTALLAS_ADMINISTRADOR) : []
  const permitidas = [
    ...usuarios,
    ...gruposHorarios,
    ...pagos,
    ...subpantallas.map((p) => ({ pagina: p, texto: p })),
  ]
  const actual = pagina || permitidas[0]?.pagina || ''
  const navegacion = [
    { grupo: 'Usuarios', enlaces: usuarios },
    { grupo: 'Grupos y horarios', enlaces: gruposHorarios },
    { grupo: 'Planes y pagos', enlaces: pagos },
    { grupo: 'Competencias y resultados', enlaces: permitidas.filter((p) => p.pagina === 'm4') },
    { grupo: 'Planes y pagos', enlaces: permitidas.filter((p) => p.pagina !== 'm4') },
  ]

  let contenido
  if (permitidas.length === 0) {
    contenido = (
      <div className="app-page">
        <h1>Hola, {sesion.nombre}</h1>
        {error && <Alerta tono="error" titulo="Algo salió mal">{error}</Alerta>}
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
          <p>
            {permitidas.length > 0
              ? 'Usa el menú para ir a las pantallas de tu rol.'
              : 'Tu rol no tiene pantallas habilitadas.'}
          </p>
        </Alerta>
      </div>
    )
  } else if (actual === 'usuarios') {
    contenido = <Usuarios key={sesion.id} />
  } else if (actual === 'grupos') {
    contenido = <ConfiguracionGrupos key={sesion.id} />
  } else if (actual === 'nueva-cuenta') {
    contenido = <NuevaCuenta key={sesion.id} />
  } else if (actual === 'familia-menor') {
    const patinador = Number(parametros.get('patinador'))
    contenido = (
      <FamiliaMenor
        key={`${sesion.id}-${parametros}`}
        patinadorInicial={Number.isInteger(patinador) && patinador > 0 ? patinador : undefined}
      />
    )
  } else if (actual === 'm4') {
    contenido = <M4Modulo key={sesion.id} />
  } else if (actual === 'planes') {
    contenido = <PlanesTarifas key={sesion.id} />
  } else if (actual === 'cartera') {
    contenido = <Cartera key={sesion.id} />
  } else if (actual === 'historial-pagos') {
    contenido = <HistorialPagos key={sesion.id} />
  } else if (actual === 'mis-pagos') {
    contenido = <MisPagos key={sesion.id} />
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
    <MarcoAplicacion navegacion={navegacion} paginaActual={SUBPANTALLAS_ADMINISTRADOR[actual] ?? actual}>
      {contenido}
    </MarcoAplicacion>
  )
}
