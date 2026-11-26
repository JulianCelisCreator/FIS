import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Alerta, Campo } from '../../../shared/ui/componentes.tsx'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'
import { formatoFecha, formatoFechaDeMarca } from '../../../shared/utils/formato.ts'
import {
  aprobarPropuesta,
  asignarCategoria,
  cambiarCategoria,
  listarCategorias,
  listarPatinadoresParaCategoria,
  listarPropuestas,
  obtenerCatalogoClub,
  obtenerHistorial,
  rechazarPropuesta,
} from '../services/seguimiento.service.ts'
import {
  PERMISOS_M2_SEGUIMIENTO,
  type CategoriaClub,
  type HistorialPatinador,
  type PatinadorAsignacion,
  type PropuestaCategoria,
} from '../types/seguimiento.types.ts'

function rangoEdad(categoria: CategoriaClub): string {
  return categoria.edadMaxima === null
    ? `${categoria.edadMinima}+ años`
    : `${categoria.edadMinima}–${categoria.edadMaxima} años`
}

/** RF-M2-08, RF-M2-09 y RF-M2-16: asignaciones y decisiones sobre propuestas. */
export function AsignacionCategorias() {
  const { tienePermiso } = useSesion()
  const puedeGestionar = tienePermiso(PERMISOS_M2_SEGUIMIENTO.asignacionGestionar)
  const [patinadores, setPatinadores] = useState<PatinadorAsignacion[]>([])
  const [categorias, setCategorias] = useState<CategoriaClub[]>([])
  const [propuestas, setPropuestas] = useState<PropuestaCategoria[]>([])
  const [historial, setHistorial] = useState<HistorialPatinador | null>(null)
  const [patinadorId, setPatinadorId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [buscar, setBuscar] = useState('')
  const [buscarAplicado, setBuscarAplicado] = useState('')
  const [estado, setEstado] = useState<'PROPUESTA' | 'APROBADA' | 'RECHAZADA' | ''>('PROPUESTA')
  const [motivo, setMotivo] = useState('')
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [cargando, setCargando] = useState(true)
  const [cargandoPropuestas, setCargandoPropuestas] = useState(true)
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorPropuestas, setErrorPropuestas] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const espera = setTimeout(() => setBuscarAplicado(buscar.trim()), 300)
    return () => clearTimeout(espera)
  }, [buscar])

  useEffect(() => {
    let vigente = true
    const cargar = async () => {
      setCargando(true)
      try {
        const [listaPatinadores, listaCategorias] = await Promise.all([
          puedeGestionar ? listarPatinadoresParaCategoria(buscarAplicado || undefined) : Promise.resolve([]),
          puedeGestionar ? listarCategorias() : obtenerCatalogoClub().then((catalogo) => catalogo.categorias),
        ])
        if (!vigente) return
        setPatinadores(listaPatinadores)
        setCategorias(listaCategorias.filter((categoria) => categoria.activo))
        setPatinadorId((actual) => listaPatinadores.some((patinador) => String(patinador.id) === actual)
          ? actual
          : listaPatinadores[0] ? String(listaPatinadores[0].id) : '')
        setCategoriaId('')
        setError(null)
      } catch (e) {
        if (vigente) setError(e instanceof Error ? e.message : 'No se pudieron cargar las asignaciones.')
      } finally {
        if (vigente) setCargando(false)
      }
    }
    void cargar()
    return () => { vigente = false }
  }, [puedeGestionar, buscarAplicado, version])

  useEffect(() => {
    let vigente = true
    const cargarPropuestas = async () => {
      setCargandoPropuestas(true)
      try {
        const lista = await listarPropuestas(estado || undefined)
        if (!vigente) return
        setPropuestas(lista)
        setErrorPropuestas(null)
      } catch (e) {
        if (vigente) setErrorPropuestas(e instanceof Error ? e.message : 'No se pudieron cargar las propuestas.')
      } finally {
        if (vigente) setCargandoPropuestas(false)
      }
    }
    void cargarPropuestas()
    return () => { vigente = false }
  }, [estado, version])

  const patinador = useMemo(
    () => patinadores.find((fila) => String(fila.id) === patinadorId) ?? null,
    [patinadores, patinadorId],
  )

  useEffect(() => {
    if (!puedeGestionar || !patinador) {
      setHistorial(null)
      setCargandoHistorial(false)
      return
    }
    let vigente = true
    setHistorial(null)
    setError(null)
    setCargandoHistorial(true)
    void obtenerHistorial(patinador.id)
      .then((resultado) => { if (vigente) setHistorial(resultado) })
      .catch((e: unknown) => {
        if (vigente) setError(e instanceof Error ? e.message : 'No se pudo consultar la trayectoria.')
      })
      .finally(() => { if (vigente) setCargandoHistorial(false) })
    return () => { vigente = false }
  }, [puedeGestionar, patinador])

  const refrescar = (mensaje: string) => {
    setAviso(mensaje)
    setVersion((actual) => actual + 1)
  }

  const guardarAsignacion = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!patinador || !categoriaId) return
    setGuardando(true)
    setError(null)
    setAviso(null)
    try {
      let mensaje: string
      if (patinador.categoriaActual) {
        const resultado = await cambiarCategoria(patinador.id, Number(categoriaId), motivo.trim() || undefined)
        mensaje = `${patinador.nombre} cambió de ${resultado.categoriaAnterior} a ${resultado.categoria}.`
      } else {
        const resultado = await asignarCategoria(patinador.id, Number(categoriaId), motivo.trim() || undefined)
        mensaje = `${patinador.nombre} quedó en la categoría ${resultado.categoria}.`
      }
      refrescar(mensaje)
      setCategoriaId('')
      setMotivo('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la asignación.')
    } finally {
      setGuardando(false)
    }
  }

  const resolver = async (propuesta: PropuestaCategoria, accion: 'aprobar' | 'rechazar') => {
    setGuardando(true)
    setError(null)
    setAviso(null)
    try {
      if (accion === 'aprobar') {
        const resultado = await aprobarPropuesta(propuesta.id)
        refrescar(`Se aprobó la propuesta de ${propuesta.patinador}. Nueva categoría: ${resultado.categoria}.`)
      } else {
        await rechazarPropuesta(propuesta.id, motivoRechazo.trim() || undefined)
        setMotivoRechazo('')
        refrescar(`Se rechazó la propuesta de ${propuesta.patinador}.`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo resolver la propuesta.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb" aria-label="Ruta">
            <span>Gestión deportiva</span><span aria-hidden="true">/</span><span aria-current="page">Asignaciones de categoría</span>
          </nav>
          <h1>{puedeGestionar ? 'Asignaciones de categoría' : 'Propuestas de categoría'}</h1>
          <p className="vl-text-body-sm">Las asignaciones respetan los criterios del club y conservan la trayectoria deportiva.</p>
        </div>
      </header>

      {error && <Alerta tono="error" titulo="No se pudo completar la operación">{error}</Alerta>}
      {errorPropuestas && <Alerta tono="error" titulo="No se pudieron cargar las propuestas">{errorPropuestas}</Alerta>}
      {aviso && <Alerta tono="success" titulo="Cambios guardados">{aviso}</Alerta>}

      {puedeGestionar && (
        <section className="vl-stack" aria-labelledby="m2-asignacion-titulo">
          <h2 id="m2-asignacion-titulo" className="vl-text-heading-h4">Asignar o cambiar categoría</h2>
          <form className="vl-filter-bar" onSubmit={guardarAsignacion}>
            <Campo etiqueta="Buscar patinador" id="m2-asignacion-buscar">
              <input id="m2-asignacion-buscar" className="vl-input" type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Nombre o documento" />
            </Campo>
            <Campo etiqueta="Patinador" id="m2-asignacion-patinador" obligatorio>
              <select id="m2-asignacion-patinador" className="vl-select" value={patinadorId} onChange={(e) => { setPatinadorId(e.target.value); setCategoriaId('') }} required disabled={cargando || patinadores.length === 0}>
                <option value="">Selecciona un patinador</option>
                {patinadores.map((fila) => <option key={fila.id} value={fila.id}>{fila.nombre}</option>)}
              </select>
            </Campo>
            <Campo etiqueta={patinador?.categoriaActual ? 'Nueva categoría' : 'Categoría'} id="m2-asignacion-categoria" obligatorio>
              <select id="m2-asignacion-categoria" className="vl-select" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required disabled={!patinador || categorias.length === 0}>
                <option value="">Selecciona una categoría</option>
                {categorias
                  .filter((categoria) => categoria.nombre !== patinador?.categoriaActual)
                  .map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre} · {rangoEdad(categoria)}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Motivo" id="m2-asignacion-motivo" ayuda="Opcional. Quedará asociado al historial.">
              <input id="m2-asignacion-motivo" className="vl-input" maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </Campo>
            {patinador && (
              <div className="app-m2-resumen">
                <span><strong>Nivel actual:</strong> {patinador.nivelActual ?? 'Sin nivel registrado'}</span>
                <span><strong>Categoría actual:</strong> {patinador.categoriaActual ?? 'Sin asignación'}</span>
                {patinador.propuestaPendiente && <span><strong>Propuesta:</strong> Hay una propuesta pendiente de resolución.</span>}
              </div>
            )}
            {patinador && (
              <div className="app-m2-historial" aria-live="polite">
                {cargandoHistorial
                  ? <span role="status">Cargando trayectoria…</span>
                  : historial?.trayectoria.length
                    ? (
                      <div className="vl-stack">
                        <strong>Trayectoria de {patinador.nombre}</strong>
                        {historial.trayectoria.map((entrada) => (
                          <span key={`${entrada.tipo}-${entrada.id}`}>
                            {entrada.tipo === 'NIVEL' ? 'Nivel' : 'Categoría'} · {entrada.nombre} · {formatoFecha(entrada.desde)}
                            {entrada.hasta ? ` – ${formatoFecha(entrada.hasta)}` : ' · Vigente'}
                          </span>
                        ))}
                        {historial.evaluaciones?.length ? (
                          <div>
                            <strong>Evaluaciones registradas</strong>
                            {historial.evaluaciones.map((evaluacion) => (
                              <p key={evaluacion.id} className="vl-text-body-sm">
                                {formatoFecha(evaluacion.fecha)} · {evaluacion.nivel} · {evaluacion.resultado}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )
                    : <span>Sin cambios de nivel o categoría registrados.</span>}
              </div>
            )}
            {patinadores.length === 0 && !cargando && <p className="vl-text-body-sm">No hay patinadores que coincidan con la búsqueda.</p>}
            <div className="app-actions">
              <button className="vl-button vl-button--primary" type="submit" disabled={guardando || cargando || !patinador || !categoriaId || !!patinador.propuestaPendiente}>
                {guardando ? 'Guardando…' : patinador?.categoriaActual ? 'Cambiar categoría' : 'Asignar categoría'}
              </button>
            </div>
          </form>
          {patinador?.propuestaPendiente && <Alerta tono="warning" titulo="Hay una propuesta pendiente">Resuelve la propuesta antes de realizar otra asignación.</Alerta>}
        </section>
      )}

      <section className="vl-stack" aria-labelledby="m2-propuestas-titulo">
        <div className="app-head">
          <h2 id="m2-propuestas-titulo" className="vl-text-heading-h4">{puedeGestionar ? 'Propuestas de los profesores' : 'Mis propuestas'}</h2>
          <Campo etiqueta="Estado" id="m2-propuestas-estado">
            <select id="m2-propuestas-estado" className="vl-select" value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)}>
              <option value="PROPUESTA">Pendientes</option>
              <option value="APROBADA">Aprobadas</option>
              <option value="RECHAZADA">Rechazadas</option>
              <option value="">Todas</option>
            </select>
          </Campo>
        </div>
        {cargandoPropuestas && <p className="vl-text-body-sm" role="status">Cargando propuestas…</p>}
        {propuestas.length === 0 && !cargandoPropuestas && <Alerta tono="info" titulo="No hay propuestas">Las propuestas de cambio de categoría aparecerán aquí.</Alerta>}
        <div className="app-m2-lista">
          {propuestas.map((propuesta) => (
            <article key={propuesta.id} className="vl-card vl-stack">
              <div className="app-m2-propuesta__cabecera">
                <h3 className="vl-text-heading-h5">{propuesta.patinador}</h3>
                <span className="vl-text-caption">{formatoFechaDeMarca(propuesta.propuestaEn)}</span>
              </div>
              <p>{propuesta.categoriaActual} → {propuesta.categoriaPropuesta}</p>
              <p>{propuesta.justificacion}</p>
              <p className="vl-text-body-sm">Propuesta por {propuesta.propuestaPorNombre}</p>
              {propuesta.resueltaEn && <p className="vl-text-caption">Resuelta el {formatoFechaDeMarca(propuesta.resueltaEn)}</p>}
              {propuesta.estado !== 'PROPUESTA' && <p className="vl-text-caption">Estado: {propuesta.estado === 'APROBADA' ? 'Aprobada' : 'Rechazada'}</p>}
              {puedeGestionar && propuesta.estado === 'PROPUESTA' && (
                <div className="vl-stack">
                  <Campo etiqueta="Motivo de rechazo (opcional)" id={`m2-propuesta-motivo-${propuesta.id}`}>
                    <input id={`m2-propuesta-motivo-${propuesta.id}`} className="vl-input" maxLength={500} value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} />
                  </Campo>
                  <div className="app-actions">
                    <button className="vl-button vl-button--secondary" type="button" disabled={guardando} onClick={() => void resolver(propuesta, 'rechazar')}>Rechazar</button>
                    <button className="vl-button vl-button--primary" type="button" disabled={guardando} onClick={() => void resolver(propuesta, 'aprobar')}>Aprobar cambio</button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
