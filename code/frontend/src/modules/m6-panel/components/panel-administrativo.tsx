import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Alerta, Campo } from '../../../shared/ui/componentes.tsx'
import { formatoCop, formatoFecha, hoyEnClub } from '../../../shared/utils/formato.ts'
import { enlace } from '../../../shared/utils/use-ruta.ts'
import { validarRango, type ErroresRango } from '../../m6-reportes/types/reportes.types.ts'
import { consultarPanel } from '../services/panel.service.ts'
import type { PanelAdministrativo as DatosPanel } from '../types/panel.types.ts'

const numero = new Intl.NumberFormat('es-CO')

// Íconos de las tarjetas (trazo de 24 px, heredan el color del texto).
const ICONOS: Record<string, ReactNode> = {
  patinadores: <><circle cx="12" cy="7" r="3.5" /><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6" /></>,
  grupos: <><circle cx="8" cy="8" r="3" /><circle cx="16.5" cy="9" r="2.5" /><path d="M2.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M14 14.3c.8-.2 1.6-.3 2.5-.3 2.4 0 4.3 1.6 4.9 4.5" /></>,
  profesores: <><path d="M3 9l9-4 9 4-9 4-9-4z" /><path d="M7 11v4.5c1.4 1.3 3 2 5 2s3.6-.7 5-2V11M21 9v5" /></>,
  cartera: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 15h2" /></>,
  ingresos: <><path d="M4 19V5M4 19h16" /><path d="M7 15l4-4 3 3 5-6" /></>,
  inventario: <><path d="M4 8l8-4 8 4v8l-8 4-8-4V8z" /><path d="M4 8l8 4 8-4M12 12v8" /></>,
}

function Tarjeta({ icono, etiqueta, valor, nota, alerta = false, href }: {
  icono: keyof typeof ICONOS
  etiqueta: string
  valor: string
  nota: string
  alerta?: boolean
  href?: string
}) {
  return (
    <div className={`app-stat app-kpi${alerta ? ' app-stat--alerta' : ''}`}>
      <dt>
        <svg className="app-kpi__icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONOS[icono]}</svg>
        {etiqueta}
      </dt>
      <dd>
        <span className="app-stat__valor">{valor}</span>
        <span className="app-stat__nota">{href ? <a className="vl-link" href={href}>{nota}</a> : nota}</span>
      </dd>
    </div>
  )
}

/**
 * Panel general administrativo (HU-6.1 / RF-M6-01), solo para el Administrador.
 * Los conteos son de hoy; los ingresos se recalculan al cambiar el período.
 */
export function PanelAdministrativo() {
  const hoy = hoyEnClub()
  const [desde, setDesde] = useState(`${hoy.slice(0, 8)}01`)
  const [hasta, setHasta] = useState(hoy)
  const [errores, setErrores] = useState<ErroresRango>({})
  const [panel, setPanel] = useState<DatosPanel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  const mostrar = (peticion: Promise<DatosPanel>, vigente: () => boolean = () => true) =>
    peticion
      .then((datos) => { if (vigente()) { setPanel(datos); setError(null) } })
      .catch((e: Error) => { if (vigente()) setError(e.message || 'No se pudo cargar el panel.') })
      .finally(() => { if (vigente()) setCargando(false) })

  // Primera carga: ingresos del mes en curso.
  useEffect(() => {
    let vigente = true
    void mostrar(consultarPanel(), () => vigente)
    return () => {
      vigente = false
    }
  }, [])

  // HU-6.1: los ingresos se recalculan al cambiar el período.
  const recalcular = (evento: FormEvent) => {
    evento.preventDefault()
    if (cargando) return
    const encontrados = validarRango(desde, hasta)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return
    setCargando(true)
    void mostrar(consultarPanel(desde, hasta))
  }

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb"><span>Administración</span><span>/</span><span>Panel general</span></nav>
          <h1>Panel general</h1>
          <p className="vl-text-body-sm">Indicadores de la escuela para tomar decisiones. Los ingresos dependen del período elegido.</p>
        </div>
      </header>

      <form className="vl-filter-bar" onSubmit={recalcular} noValidate aria-label="Período de ingresos">
        <Campo etiqueta="Ingresos desde" id="panel-desde" obligatorio error={errores.desde}>
          <input id="panel-desde" className="vl-input" type="date" value={desde} max={hasta || undefined}
            aria-invalid={!!errores.desde || undefined} onChange={(e) => setDesde(e.target.value)} />
        </Campo>
        <Campo etiqueta="Hasta" id="panel-hasta" obligatorio error={errores.hasta}>
          <input id="panel-hasta" className="vl-input" type="date" value={hasta} min={desde || undefined}
            aria-invalid={!!errores.hasta || undefined} onChange={(e) => setHasta(e.target.value)} />
        </Campo>
        <button className="vl-button vl-button--primary" type="submit" aria-disabled={cargando || undefined}>
          {cargando ? 'Actualizando…' : 'Actualizar ingresos'}
        </button>
      </form>

      {error && <Alerta tono="error" titulo="No se pudo cargar el panel"><p>{error}</p></Alerta>}

      {panel && (
        <dl className="app-stats app-kpis" aria-label="Indicadores de la escuela" aria-busy={cargando || undefined}>
          <Tarjeta icono="patinadores" etiqueta="Patinadores activos"
            valor={numero.format(panel.patinadoresActivos)} nota="registrados y activos" />
          <Tarjeta icono="grupos" etiqueta="Grupos activos"
            valor={numero.format(panel.gruposActivos)}
            nota={panel.gruposActivos === 0 ? 'aún no hay grupos registrados' : 'en todas las sedes'} />
          <Tarjeta icono="profesores" etiqueta="Profesores activos"
            valor={numero.format(panel.profesoresActivos)} nota="en el registro de personal" href={enlace('personal')} />
          <Tarjeta icono="cartera" etiqueta="Cartera pendiente"
            valor={formatoCop(panel.carteraPendiente)} alerta={panel.patinadoresEnMora > 0}
            nota={panel.patinadoresEnMora > 0
              ? `${panel.patinadoresEnMora} patinador${panel.patinadoresEnMora === 1 ? '' : 'es'} en mora`
              : 'sin patinadores en mora'} />
          <Tarjeta icono="ingresos" etiqueta="Ingresos del período"
            valor={formatoCop(panel.ingresosPeriodo)}
            nota={`${formatoFecha(panel.desde)} – ${formatoFecha(panel.hasta)}`} href={enlace('reportes')} />
          <Tarjeta icono="inventario" etiqueta="Existencias de uniformes"
            valor={`${numero.format(panel.unidadesDisponibles)} unidades`} alerta={panel.referenciasBajoMinimo > 0}
            nota={panel.referenciasBajoMinimo > 0
              ? `${panel.referenciasBajoMinimo} de ${panel.referenciasActivas} referencias bajo el mínimo`
              : `${panel.referenciasActivas} referencias, ninguna bajo el mínimo`}
            href={enlace('inventario')} />
        </dl>
      )}
    </div>
  )
}
