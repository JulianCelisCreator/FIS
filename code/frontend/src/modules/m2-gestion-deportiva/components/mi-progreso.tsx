import { useEffect, useMemo, useState } from 'react'
import { Alerta, Campo } from '../../../shared/ui/componentes.tsx'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'
import { ErrorApi } from '../../../shared/services/cliente-api.ts'
import { formatoFecha } from '../../../shared/utils/formato.ts'
import {
  listarMisObservaciones,
  obtenerCategoriasActuales,
  obtenerHistorial,
} from '../services/seguimiento.service.ts'
import {
  PERMISOS_M2_SEGUIMIENTO,
  type CategoriaActualPatinador,
  type HistorialPatinador,
  type ObservacionPatinador,
} from '../types/seguimiento.types.ts'

/** RF-M2-18, RF-M2-21, RF-M2-22 y RF-M2-23: consulta propia o de los patinadores a cargo. */
export function MiProgreso() {
  const { tienePermiso, tieneRol } = useSesion()
  const esPatinador = tieneRol('PATINADOR')
  const puedeConsultarHistorial = tienePermiso(PERMISOS_M2_SEGUIMIENTO.historialConsultar)
  const puedeConsultarObservaciones = tienePermiso(PERMISOS_M2_SEGUIMIENTO.observacionPropiaConsultar)
  const [patinadores, setPatinadores] = useState<CategoriaActualPatinador[]>([])
  const [patinadorId, setPatinadorId] = useState('')
  const [historial, setHistorial] = useState<HistorialPatinador | null>(null)
  const [observaciones, setObservaciones] = useState<ObservacionPatinador[]>([])
  const [observacionesHabilitadas, setObservacionesHabilitadas] = useState(true)
  const [cargando, setCargando] = useState(true)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    const cargar = async () => {
      setCargando(true)
      try {
        const lista = await obtenerCategoriasActuales()
        if (!vigente) return
        setPatinadores(lista)
        setPatinadorId((actual) => lista.some((patinador) => String(patinador.patinadorId) === actual)
          ? actual
          : lista[0] ? String(lista[0].patinadorId) : '')
        setError(null)
      } catch (e) {
        if (vigente) setError(e instanceof Error ? e.message : 'No se pudo consultar la categoría actual.')
      } finally {
        if (vigente) setCargando(false)
      }
    }
    void cargar()
    return () => { vigente = false }
  }, [version])

  useEffect(() => {
    if (!patinadorId) {
      setHistorial(null)
      setObservaciones([])
      return
    }
    let vigente = true
    const cargarDetalle = async () => {
      setCargandoDetalle(true)
      setHistorial(null)
      setObservaciones([])
      setObservacionesHabilitadas(true)
      try {
        const [trayectoria, notas] = await Promise.all([
          puedeConsultarHistorial ? obtenerHistorial(Number(patinadorId)) : Promise.resolve(null),
          puedeConsultarObservaciones
            ? listarMisObservaciones().catch((e: unknown) => {
              if (e instanceof ErrorApi && e.estado === 403) {
                if (vigente) setObservacionesHabilitadas(false)
                return []
              }
              throw e
            })
            : Promise.resolve([]),
        ])
        if (!vigente) return
        setHistorial(trayectoria)
        setObservaciones(notas)
        if (puedeConsultarObservaciones && notas.length > 0) setObservacionesHabilitadas(true)
        setError(null)
      } catch (e) {
        if (vigente) setError(e instanceof Error ? e.message : 'No se pudo cargar el progreso.')
      } finally {
        if (vigente) setCargandoDetalle(false)
      }
    }
    void cargarDetalle()
    return () => { vigente = false }
  }, [patinadorId, puedeConsultarHistorial, puedeConsultarObservaciones, version])

  const seleccionado = useMemo(
    () => patinadores.find((patinador) => String(patinador.patinadorId) === patinadorId) ?? null,
    [patinadores, patinadorId],
  )

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb" aria-label="Ruta">
            <span>Gestión deportiva</span><span aria-hidden="true">/</span><span aria-current="page">Mi progreso</span>
          </nav>
          <h1>{esPatinador ? 'Mi progreso deportivo' : 'Progreso de mis patinadores'}</h1>
          <p className="vl-text-body-sm">Consulta la categoría vigente y la trayectoria registrada por el club.</p>
        </div>
      </header>

      {error && <Alerta tono="error" titulo="No se pudo completar la consulta">{error}</Alerta>}
      {cargando && <p className="vl-text-body-sm" role="status">Cargando perfiles…</p>}
      {!cargando && patinadores.length === 0 && !error && (
        <Alerta tono="info" titulo={esPatinador ? 'No encontramos tu perfil deportivo' : 'No hay patinadores vinculados'}>
          {esPatinador
            ? 'Tu cuenta todavía no tiene un perfil de patinador activo asociado.'
            : 'Cuando haya patinadores vinculados a tu cuenta, podrás consultar aquí su categoría.'}
        </Alerta>
      )}

      {patinadores.length > 1 && (
        <div className="vl-filter-bar">
          <Campo etiqueta="Patinador" id="m2-progreso-patinador">
            <select id="m2-progreso-patinador" className="vl-select" value={patinadorId} onChange={(e) => setPatinadorId(e.target.value)}>
              {patinadores.map((patinador) => <option key={patinador.patinadorId} value={patinador.patinadorId}>{patinador.nombre}</option>)}
            </select>
          </Campo>
        </div>
      )}

      {seleccionado && (
        <>
          <section className="vl-card vl-stack" aria-labelledby="m2-progreso-categoria">
            <h2 id="m2-progreso-categoria" className="vl-text-heading-h4">{seleccionado.nombre}</h2>
            {seleccionado.categoria
              ? (
                <dl className="vl-dl">
                  <div><dt>Categoría vigente</dt><dd>{seleccionado.categoria.nombre}</dd></div>
                  <div><dt>Asignada desde</dt><dd>{formatoFecha(seleccionado.categoria.desde)}</dd></div>
                </dl>
              )
              : <Alerta tono="info" titulo="Sin categoría vigente">El club aún no ha asignado una categoría.</Alerta>}
          </section>

          {cargandoDetalle && <p className="vl-text-body-sm" role="status">Cargando trayectoria…</p>}

          {puedeConsultarHistorial && historial && (
            <section className="vl-stack" aria-labelledby="m2-progreso-historial">
              <h2 id="m2-progreso-historial" className="vl-text-heading-h4">Trayectoria deportiva</h2>
              {historial.trayectoria.length === 0
                ? <Alerta tono="info" titulo="Aún no hay trayectoria">Los cambios de nivel y categoría quedarán registrados aquí.</Alerta>
                : (
                  <div className="app-m2-lista">
                    {historial.trayectoria.map((entrada) => (
                      <article key={`${entrada.tipo}-${entrada.id}`} className="app-m2-lista__fila">
                        <div className="app-m2-propuesta__cabecera">
                          <strong>{entrada.tipo === 'NIVEL' ? 'Nivel' : 'Categoría'} · {entrada.nombre}{entrada.vigente ? ' · Vigente' : ''}</strong>
                          <span className="vl-text-caption">{formatoFecha(entrada.desde)}{entrada.hasta ? ` – ${formatoFecha(entrada.hasta)}` : ''}</span>
                        </div>
                        {entrada.motivo && <p>{entrada.motivo}</p>}
                      </article>
                    ))}
                  </div>
                )}
            </section>
          )}

          {puedeConsultarObservaciones && (
            <section className="vl-stack" aria-labelledby="m2-progreso-observaciones">
              <h2 id="m2-progreso-observaciones" className="vl-text-heading-h4">Observaciones del profesor</h2>
              {!observacionesHabilitadas
                ? <Alerta tono="info" titulo="Consulta no habilitada">El club aún no ha habilitado la consulta de observaciones para patinadores.</Alerta>
                : observaciones.length === 0
                  ? <Alerta tono="info" titulo="Sin observaciones visibles">No hay observaciones disponibles para consultar.</Alerta>
                  : (
                    <div className="app-m2-lista">
                      {observaciones.map((observacion) => (
                        <article key={observacion.id} className="app-m2-lista__fila">
                          <div className="app-m2-propuesta__cabecera">
                            <strong>{observacion.profesor}</strong>
                            <span className="vl-text-caption">{formatoFecha(observacion.fecha)}</span>
                          </div>
                          <p>{observacion.texto}</p>
                        </article>
                      ))}
                    </div>
                  )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
