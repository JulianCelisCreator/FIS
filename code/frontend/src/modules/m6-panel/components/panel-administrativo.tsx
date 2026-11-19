import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Alerta, Campo } from '../../../shared/ui/componentes.tsx'
import { Icono } from '../../../shared/ui/icono.tsx'
import { formatoCop, formatoFecha, hoyEnClub } from '../../../shared/utils/formato.ts'
import { enlace } from '../../../shared/utils/use-ruta.ts'
import { validarRango, type ErroresRango } from '../../m6-reportes/types/reportes.types.ts'
import { consultarPanel } from '../services/panel.service.ts'
import type { PanelAdministrativo as DatosPanel } from '../types/panel.types.ts'

const numero = new Intl.NumberFormat('es-CO')
const fechaHora = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
})

// Íconos propios del panel (trazo de 1.8 px sobre retícula de 24 px).
const ICONOS: Record<string, ReactNode> = {
  patinadores: <><circle cx="12" cy="7" r="3.5" /><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6" /></>,
  grupos: <><circle cx="8" cy="8" r="3" /><circle cx="16.5" cy="9" r="2.5" /><path d="M2.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M14 14.3c.8-.2 1.6-.3 2.5-.3 2.4 0 4.3 1.6 4.9 4.5" /></>,
  profesores: <><path d="M3 9l9-4 9 4-9 4-9-4z" /><path d="M7 11v4.5c1.4 1.3 3 2 5 2s3.6-.7 5-2V11M21 9v5" /></>,
  cartera: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 15h2" /></>,
  ingresos: <><path d="M4 19V5M4 19h16" /><path d="M7 15l4-4 3 3 5-6" /></>,
  inventario: <><path d="M4 8l8-4 8 4v8l-8 4-8-4V8z" /><path d="M4 8l8 4 8-4M12 12v8" /></>,
  pago: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" /><path d="M9 8h6M9 12h6" /></>,
  reporte: <><path d="M4 4h16v16H4z" /><path d="M8 16v-5M12 16V8M16 16v-3" /></>,
  flecha: <path d="M5 12h14M13 6l6 6-6 6" />,
  actualizar: <><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v4h-4" /></>,
}

function Trazo({ nombre, clase }: { nombre: keyof typeof ICONOS; clase: string }) {
  return (
    <svg className={clase} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {ICONOS[nombre]}
    </svg>
  )
}

function Indicador({ icono, etiqueta, valor, nota, href, alerta = false }: {
  icono: keyof typeof ICONOS
  etiqueta: string
  valor: string
  nota: string
  href?: string
  alerta?: boolean
}) {
  return (
    <div className={`app-panel-kpi${alerta ? ' app-panel-kpi--alerta' : ''}`}>
      <dt>
        <Trazo nombre={icono} clase="app-panel-kpi__icono" />
        {etiqueta}
      </dt>
      <dd>
        <span className="app-panel-kpi__valor">{valor}</span>
        <span className="app-panel-kpi__nota">
          {href ? <a className="vl-link" href={href}>{nota}</a> : nota}
        </span>
      </dd>
    </div>
  )
}

type Pendiente = {
  tono: 'error' | 'warning' | 'info'
  titulo: string
  detalle: string
  accion: string
  destino: string
}

const TONOS: Record<Pendiente['tono'], 'error' | 'advertencia' | 'info'> = {
  error: 'error',
  warning: 'advertencia',
  info: 'info',
}

/** Pendientes derivados de los indicadores, con el enlace donde se resuelven. */
function construirPendientes(panel: DatosPanel): Pendiente[] {
  const pendientes: Pendiente[] = []
  const enMora = panel.patinadoresEnMora

  if (enMora > 0) {
    pendientes.push({
      tono: 'error',
      titulo: `${numero.format(enMora)} ${enMora === 1 ? 'patinador en mora' : 'patinadores en mora'}`,
      detalle: `Cartera pendiente por ${formatoCop(panel.carteraPendiente)}.`,
      accion: 'Revisar cartera',
      destino: enlace('reportes'),
    })
  } else if (panel.carteraPendiente > 0) {
    pendientes.push({
      tono: 'warning',
      titulo: `Cartera por cobrar: ${formatoCop(panel.carteraPendiente)}`,
      detalle: 'Ningún patinador está en mora.',
      accion: 'Revisar cartera',
      destino: enlace('reportes'),
    })
  }

  if (panel.referenciasBajoMinimo > 0) {
    const bajoMinimo = panel.referenciasBajoMinimo
    pendientes.push({
      tono: 'warning',
      titulo: `${numero.format(bajoMinimo)} ${bajoMinimo === 1 ? 'referencia bajo el mínimo' : 'referencias bajo el mínimo'}`,
      detalle: `${numero.format(bajoMinimo)} de ${numero.format(panel.referenciasActivas)} referencias activas necesitan reposición.`,
      accion: 'Revisar inventario',
      destino: enlace('inventario'),
    })
  }

  if (panel.profesoresActivos === 0) {
    pendientes.push({
      tono: 'info',
      titulo: 'Sin profesores activos',
      detalle: 'El registro de personal no tiene profesores activos.',
      accion: 'Registrar personal',
      destino: enlace('personal'),
    })
  }

  return pendientes
}

const ATAJOS = [
  {
    icono: 'pago' as const,
    titulo: 'Registrar pago',
    nota: 'Cobros, matrículas y sesiones.',
    href: enlace('registrar-pago'),
  },
  {
    icono: 'reporte' as const,
    titulo: 'Reportes financieros',
    nota: 'Ingresos, cartera y movimientos.',
    href: enlace('reportes'),
  },
  {
    icono: 'inventario' as const,
    titulo: 'Inventario',
    nota: 'Stock, mínimos y proveedores.',
    href: enlace('inventario'),
  },
  {
    icono: 'profesores' as const,
    titulo: 'Personal',
    nota: 'Altas, cargos y estado.',
    href: enlace('personal'),
  },
]

/**
 * Panel general administrativo (HU-6.1 / RF-M6-01), solo para el Administrador.
 * El tablero de ingresos lleva su propio período; los conteos son de hoy.
 */
export function PanelAdministrativo() {
  const hoy = hoyEnClub()
  const [desde, setDesde] = useState(`${hoy.slice(0, 8)}01`)
  const [hasta, setHasta] = useState(hoy)
  const [errores, setErrores] = useState<ErroresRango>({})
  const [panel, setPanel] = useState<DatosPanel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const ultimaSolicitud = useRef(0)

  // Solo la respuesta de la última solicitud puede pisar la pantalla.
  const mostrar = (peticion: Promise<DatosPanel>) => {
    const solicitud = ++ultimaSolicitud.current
    return peticion
      .then((datos) => {
        if (solicitud !== ultimaSolicitud.current) return
        setPanel(datos)
        setError(null)
      })
      .catch((e: Error) => {
        if (solicitud === ultimaSolicitud.current) setError(e.message || 'No se pudo cargar el panel.')
      })
      .finally(() => {
        if (solicitud === ultimaSolicitud.current) setCargando(false)
      })
  }

  // Primera carga: ingresos del mes en curso.
  useEffect(() => {
    void mostrar(consultarPanel())
  }, [])

  // HU-6.1: el formulario del tablero solo recalcula las cifras del período.
  const recalcular = (evento: FormEvent) => {
    evento.preventDefault()
    if (cargando) return
    const encontrados = validarRango(desde, hasta)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return
    setCargando(true)
    void mostrar(consultarPanel(desde, hasta))
  }

  // Relee el panel con el último período aplicado (o el mes en curso al abrir).
  const actualizar = () => {
    if (cargando) return
    setCargando(true)
    setError(null)
    void mostrar(consultarPanel(panel?.desde, panel?.hasta))
  }

  const pendientes = panel ? construirPendientes(panel) : []

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb" aria-label="Ruta">
            <span>Administración</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Panel general</span>
          </nav>
          <h1>Panel general</h1>
          <p className="vl-text-body-sm">
            Ingresos, cartera, personal e inventario de la escuela en un solo tablero.
          </p>
        </div>
        <div className="app-panel-frescura">
          {panel && (
            <p className="vl-text-caption">
              Actualizado el {fechaHora.format(new Date(panel.generadoEn))} · hora de Bogotá
            </p>
          )}
          <button
            className="vl-button vl-button--secondary vl-button--sm"
            type="button"
            aria-disabled={cargando || undefined}
            onClick={actualizar}
          >
            <Trazo nombre="actualizar" clase="app-panel-frescura__icono" />
            {cargando ? 'Actualizando…' : 'Actualizar panel'}
          </button>
        </div>
      </header>

      {error && (
        <Alerta tono="error" titulo="No se pudo cargar el panel">
          <p>{error}</p>
          <div className="app-actions">
            <button
              className="vl-button vl-button--secondary vl-button--sm"
              type="button"
              aria-disabled={cargando || undefined}
              onClick={actualizar}
            >
              Reintentar
            </button>
          </div>
        </Alerta>
      )}

      {!panel && cargando && (
        <div className="app-panel-esqueleto">
          <p className="app-oculto" role="status">Cargando panel…</p>
          <div className="app-esqueleto app-esqueleto--tablero" aria-hidden="true" />
          <div className="app-esqueleto app-esqueleto--lado" aria-hidden="true" />
          <div className="app-esqueleto app-esqueleto--fila" aria-hidden="true" />
          <div className="app-esqueleto app-esqueleto--fila" aria-hidden="true" />
        </div>
      )}

      {panel && (
        <>
          <div className="app-panel-hero" aria-busy={cargando || undefined}>
            <section className="app-scoreboard" aria-labelledby="ingresos-titulo">
              <div className="app-scoreboard__head">
                <div className="vl-stack">
                  <h2 id="ingresos-titulo" className="vl-text-heading-h5">Ingresos del período</h2>
                  <p className="app-scoreboard__periodo">
                    Del {formatoFecha(panel.desde)} al {formatoFecha(panel.hasta)}
                  </p>
                </div>
                <a className="app-scoreboard__enlace" href={enlace('reportes')}>
                  Abrir reportes
                  <Trazo nombre="flecha" clase="app-flecha" />
                </a>
              </div>

              <p className="app-scoreboard__valor">{formatoCop(panel.ingresosPeriodo)}</p>

              <form className="app-scoreboard__filtro" onSubmit={recalcular} noValidate
                aria-label="Período de los ingresos">
                <Campo etiqueta="Desde" id="panel-desde" error={errores.desde}>
                  <input id="panel-desde" className="vl-input" type="date" value={desde}
                    max={hasta || undefined} aria-invalid={!!errores.desde || undefined}
                    aria-describedby={errores.desde ? 'panel-desde-error' : undefined}
                    onChange={(e) => setDesde(e.target.value)} />
                </Campo>
                <Campo etiqueta="Hasta" id="panel-hasta" error={errores.hasta}>
                  <input id="panel-hasta" className="vl-input" type="date" value={hasta}
                    min={desde || undefined} aria-invalid={!!errores.hasta || undefined}
                    aria-describedby={errores.hasta ? 'panel-hasta-error' : undefined}
                    onChange={(e) => setHasta(e.target.value)} />
                </Campo>
                <button className="vl-button vl-button--primary vl-button--sm" type="submit"
                  aria-disabled={cargando || undefined}>
                  Aplicar período
                </button>
              </form>

              <p className="app-scoreboard__nota">
                Ingresos netos: pagos del período menos reembolsos. Los demás indicadores son de hoy.
              </p>
            </section>

            <aside className="vl-card app-attention" aria-labelledby="atencion-titulo">
              <div className="app-attention__head">
                <h2 id="atencion-titulo" className="vl-text-heading-h5">Requieren atención</h2>
                <span className="vl-text-caption">
                  {pendientes.length === 0
                    ? 'Sin pendientes'
                    : `${numero.format(pendientes.length)} ${pendientes.length === 1 ? 'pendiente' : 'pendientes'}`}
                </span>
              </div>

              {pendientes.length === 0 ? (
                <div className="app-attention__vacio">
                  <Icono nombre="correcto" />
                  <div>
                    <p className="app-attention__vacio-titulo">Todo al día</p>
                    <p className="vl-text-caption">
                      Sin cartera vencida, stock bajo ni personal pendiente.
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="app-attention__lista">
                  {pendientes.map((pendiente) => (
                    <li key={pendiente.titulo} className={`app-attention__item app-attention__item--${pendiente.tono}`}>
                      <div className="app-attention__contenido">
                        <Icono nombre={TONOS[pendiente.tono]} />
                        <div>
                          <p className="app-attention__titulo">{pendiente.titulo}</p>
                          <p className="app-attention__detalle">{pendiente.detalle}</p>
                        </div>
                      </div>
                      <a className="app-attention__accion" href={pendiente.destino}>
                        {pendiente.accion}
                        <Trazo nombre="flecha" clase="app-flecha" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>

          <section aria-labelledby="operacion-titulo">
            <div className="app-panel-head app-panel-head--seccion">
              <h2 id="operacion-titulo" className="vl-text-heading-h5">Operación de hoy</h2>
              <p className="vl-text-caption">Estado actual del registro de la escuela</p>
            </div>
            <dl className="app-panel-kpis" aria-busy={cargando || undefined}>
              <Indicador icono="patinadores" etiqueta="Patinadores activos"
                valor={numero.format(panel.patinadoresActivos)} nota="en el registro de patinadores" />
              <Indicador icono="grupos" etiqueta="Grupos activos"
                valor={numero.format(panel.gruposActivos)}
                nota={panel.gruposActivos === 0 ? 'aún no hay grupos registrados' : 'en todas las sedes'} />
              <Indicador icono="profesores" etiqueta="Profesores activos"
                valor={numero.format(panel.profesoresActivos)}
                nota={panel.profesoresActivos === 0 ? 'registrar en personal' : 'en el registro de personal'}
                href={enlace('personal')} />
              <Indicador icono="inventario" etiqueta="Unidades disponibles"
                valor={numero.format(panel.unidadesDisponibles)}
                alerta={panel.referenciasBajoMinimo > 0}
                nota={panel.referenciasActivas === 0
                  ? 'sin referencias activas'
                  : panel.referenciasBajoMinimo > 0
                    ? `${numero.format(panel.referenciasActivas)} referencias · ${numero.format(panel.referenciasBajoMinimo)} bajo el mínimo`
                    : `${numero.format(panel.referenciasActivas)} referencias, sin alertas`}
                href={enlace('inventario')} />
            </dl>
          </section>

          <section aria-labelledby="accesos-titulo">
            <div className="app-panel-head app-panel-head--seccion">
              <h2 id="accesos-titulo" className="vl-text-heading-h5">Accesos rápidos</h2>
              <p className="vl-text-caption">Las tareas que siguen después de revisar el panel</p>
            </div>
            <ul className="app-shortcuts">
              {ATAJOS.map((atajo) => (
                <li key={atajo.titulo}>
                  <a className="vl-card vl-card--selectable app-shortcut" href={atajo.href}>
                    <Trazo nombre={atajo.icono} clase="app-shortcut__icono" />
                    <span className="app-shortcut__texto">
                      <span className="app-shortcut__titulo">{atajo.titulo}</span>
                      <span className="app-shortcut__nota">{atajo.nota}</span>
                    </span>
                    <Trazo nombre="flecha" clase="app-shortcut__flecha" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
