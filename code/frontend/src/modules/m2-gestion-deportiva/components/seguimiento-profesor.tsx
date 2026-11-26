import { useEffect, useState, type FormEvent } from 'react'
import { Alerta, Campo } from '../../../shared/ui/componentes.tsx'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'
import { formatoFecha } from '../../../shared/utils/formato.ts'
import {
  crearObservacion,
  guardarHabilidades,
  listarEntrenamiento,
  listarHabilidades,
  obtenerCatalogoClub,
  obtenerFichaEntrenamiento,
  obtenerHistorial,
  proponerCategoria,
  registrarEvaluacion,
} from '../services/seguimiento.service.ts'
import {
  PERMISOS_M2_SEGUIMIENTO,
  type CategoriaClub,
  type EstadoHabilidad,
  type EvaluacionPatinador,
  type FichaEntrenamiento,
  type HabilidadPatinador,
  type HistorialPatinador,
  type ResultadoEvaluacion,
  type ResumenEntrenamiento,
} from '../types/seguimiento.types.ts'

function textoResultado(resultado: ResultadoEvaluacion): string {
  if (resultado === 'APROBADO') return 'Aprobado'
  if (resultado === 'EN_PROCESO') return 'En proceso'
  return 'No aprobado'
}

function ListaEvaluaciones({ evaluaciones }: { evaluaciones: EvaluacionPatinador[] }) {
  if (evaluaciones.length === 0) return <p className="vl-text-body-sm">Aún no hay evaluaciones registradas.</p>
  return (
    <div className="app-m2-lista">
      {evaluaciones.map((evaluacion) => (
        <article className="app-m2-lista__fila" key={evaluacion.id}>
          <div className="app-m2-propuesta__cabecera">
            <strong>{evaluacion.nivel} · {textoResultado(evaluacion.resultado)}</strong>
            <span className="vl-text-caption">{formatoFecha(evaluacion.fecha)}</span>
          </div>
          {evaluacion.observacion && <p>{evaluacion.observacion}</p>}
          <p className="vl-text-caption">Evaluó {evaluacion.profesor}</p>
        </article>
      ))}
    </div>
  )
}

/** RF-M2-11 a RF-M2-16: ficha de entrenamiento y seguimiento del profesor. */
export function SeguimientoProfesor() {
  const { tienePermiso } = useSesion()
  const puedeRegistrar = tienePermiso(PERMISOS_M2_SEGUIMIENTO.seguimientoRegistrar)
  const puedeProponer = tienePermiso(PERMISOS_M2_SEGUIMIENTO.categoriaProponer)
    || tienePermiso(PERMISOS_M2_SEGUIMIENTO.categoriaPromoverDirecto)
  const [patinadores, setPatinadores] = useState<ResumenEntrenamiento[]>([])
  const [categorias, setCategorias] = useState<CategoriaClub[]>([])
  const [niveles, setNiveles] = useState<{ id: number; nombre: string; orden: number }[]>([])
  const [patinadorId, setPatinadorId] = useState('')
  const [ficha, setFicha] = useState<FichaEntrenamiento | null>(null)
  const [habilidades, setHabilidades] = useState<HabilidadPatinador[]>([])
  const [historial, setHistorial] = useState<HistorialPatinador | null>(null)
  const [estadosHabilidades, setEstadosHabilidades] = useState<Record<number, '' | EstadoHabilidad>>({})
  const [nivelEvaluadoId, setNivelEvaluadoId] = useState('')
  const [resultado, setResultado] = useState<ResultadoEvaluacion>('EN_PROCESO')
  const [observacionEvaluacion, setObservacionEvaluacion] = useState('')
  const [textoObservacion, setTextoObservacion] = useState('')
  const [visibleParaPatinador, setVisibleParaPatinador] = useState(false)
  const [categoriaPropuestaId, setCategoriaPropuestaId] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [cargando, setCargando] = useState(true)
  const [cargandoFicha, setCargandoFicha] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    const cargar = async () => {
      setCargando(true)
      try {
        const [lista, catalogo] = await Promise.all([listarEntrenamiento(), obtenerCatalogoClub()])
        if (!vigente) return
        setPatinadores(lista)
        setCategorias(catalogo.categorias.filter((categoria) => categoria.activo))
        setNiveles(catalogo.niveles ?? [])
        setPatinadorId((actual) => lista.some((fila) => String(fila.id) === actual)
          ? actual
          : lista[0] ? String(lista[0].id) : '')
        setError(null)
      } catch (e) {
        if (vigente) setError(e instanceof Error ? e.message : 'No se pudo cargar la lista de entrenamiento.')
      } finally {
        if (vigente) setCargando(false)
      }
    }
    void cargar()
    return () => { vigente = false }
  }, [])

  useEffect(() => {
    if (!patinadorId) {
      setFicha(null)
      setHistorial(null)
      return
    }
    let vigente = true
    const cargarFicha = async () => {
      setCargandoFicha(true)
      try {
        const [datos, trayectoria, listaHabilidades] = await Promise.all([
          obtenerFichaEntrenamiento(Number(patinadorId)),
          obtenerHistorial(Number(patinadorId)),
          listarHabilidades(Number(patinadorId)),
        ])
        if (!vigente) return
        setFicha(datos)
        setHistorial(trayectoria)
        setHabilidades(listaHabilidades)
        setEstadosHabilidades(Object.fromEntries(listaHabilidades.map(
          (habilidad) => [habilidad.habilidadId, habilidad.estado ?? ''],
        )))
        setError(null)
      } catch (e) {
        if (vigente) {
          setFicha(null)
          setHistorial(null)
          setError(e instanceof Error ? e.message : 'No se pudo cargar la ficha deportiva.')
        }
      } finally {
        if (vigente) setCargandoFicha(false)
      }
    }
    void cargarFicha()
    return () => { vigente = false }
  }, [patinadorId, version])

  const recargarFicha = (mensaje: string) => {
    setAviso(mensaje)
    setVersion((actual) => actual + 1)
  }

  const enviarEvaluacion = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!ficha || !nivelEvaluadoId) return
    setGuardando(true)
    setError(null)
    setAviso(null)
    try {
      const evaluacion = await registrarEvaluacion(ficha.id, {
        nivelEvaluadoId: Number(nivelEvaluadoId),
        resultado,
        observacion: observacionEvaluacion.trim() || undefined,
      })
      setObservacionEvaluacion('')
      setNivelEvaluadoId('')
      recargarFicha(evaluacion.nivelActualizado
        ? `Evaluación guardada. ${evaluacion.nivel} quedó como nivel vigente.`
        : `Evaluación de ${evaluacion.nivel} guardada: ${textoResultado(evaluacion.resultado)}.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la evaluación.')
    } finally {
      setGuardando(false)
    }
  }

  const guardarEstadoHabilidades = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!ficha) return
    const habilidades = Object.entries(estadosHabilidades)
      .filter(([, estado]) => estado !== '')
      .map(([habilidadId, estado]) => ({ habilidadId: Number(habilidadId), estado: estado as EstadoHabilidad }))
    if (habilidades.length === 0) {
      setError('Marca al menos una habilidad como adquirida o pendiente.')
      return
    }
    setGuardando(true)
    setError(null)
    setAviso(null)
    try {
      await guardarHabilidades(ficha.id, habilidades)
      recargarFicha('Se actualizaron las habilidades del patinador.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar las habilidades.')
    } finally {
      setGuardando(false)
    }
  }

  const guardarObservacion = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!ficha || !textoObservacion.trim()) return
    setGuardando(true)
    setError(null)
    setAviso(null)
    try {
      await crearObservacion(ficha.id, { texto: textoObservacion.trim(), visibleParaPatinador })
      setTextoObservacion('')
      setVisibleParaPatinador(false)
      recargarFicha('Se registró la observación de desempeño.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la observación.')
    } finally {
      setGuardando(false)
    }
  }

  const enviarPropuesta = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!ficha || !categoriaPropuestaId || !justificacion.trim()) return
    setGuardando(true)
    setError(null)
    setAviso(null)
    try {
      const propuesta = await proponerCategoria({
        patinadorId: ficha.id,
        categoriaId: Number(categoriaPropuestaId),
        justificacion: justificacion.trim(),
      })
      setJustificacion('')
      setCategoriaPropuestaId('')
      setAviso(propuesta.modo === 'EJECUTADO'
        ? `El cambio a ${propuesta.categoria ?? 'la nueva categoría'} quedó aplicado.`
        : 'La propuesta de cambio quedó enviada al Administrador.')
      setVersion((actual) => actual + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar la propuesta.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb" aria-label="Ruta">
            <span>Gestión deportiva</span><span aria-hidden="true">/</span><span aria-current="page">Seguimiento</span>
          </nav>
          <h1>Seguimiento de entrenamiento</h1>
          <p className="vl-text-body-sm">Consulta la ficha técnica y registra evaluaciones, habilidades y observaciones de tus patinadores.</p>
        </div>
      </header>

      {error && <Alerta tono="error" titulo="No se pudo completar la operación">{error}</Alerta>}
      {aviso && <Alerta tono="success" titulo="Cambios guardados">{aviso}</Alerta>}

      <section className="vl-filter-bar" aria-label="Seleccionar patinador">
        <Campo etiqueta="Patinador" id="m2-entrenamiento-patinador" obligatorio>
          <select
            id="m2-entrenamiento-patinador"
            className="vl-select"
            value={patinadorId}
            onChange={(e) => { setPatinadorId(e.target.value); setError(null); setAviso(null) }}
            disabled={cargando || patinadores.length === 0}
          >
            <option value="">Selecciona un patinador</option>
            {patinadores.map((fila) => <option key={fila.id} value={fila.id}>{fila.nombre} · {fila.grupo ?? 'Sin grupo'}</option>)}
          </select>
        </Campo>
      </section>

      {cargando && <p className="vl-text-body-sm" role="status">Cargando patinadores…</p>}
      {patinadores.length === 0 && !cargando && !error && <Alerta tono="info" titulo="No hay patinadores asignados">Cuando tengas patinadores en tus grupos, aparecerán aquí.</Alerta>}
      {cargandoFicha && <p className="vl-text-body-sm" role="status">Cargando ficha deportiva…</p>}

      {ficha && !cargandoFicha && (
        <>
          <section className="vl-card vl-stack" aria-labelledby="m2-entrenamiento-resumen">
            <div className="app-m2-propuesta__cabecera">
              <div>
                <h2 id="m2-entrenamiento-resumen" className="vl-text-heading-h4">{ficha.nombre}</h2>
                <p className="vl-text-body-sm">{ficha.grupo ?? 'Sin grupo'} · {ficha.genero === 'FEMENINO' ? 'Femenino' : 'Masculino'}</p>
              </div>
              <p className="vl-text-body-sm">Nació el {formatoFecha(ficha.fechaNacimiento)}</p>
            </div>
            <dl className="vl-dl">
              <div><dt>Categoría actual</dt><dd>{ficha.categoria ?? 'Sin categoría'}</dd></div>
              <div><dt>Nivel vigente</dt><dd>{ficha.nivel ?? 'Sin nivel asignado'}</dd></div>
              <div><dt>Habilidades adquiridas</dt><dd>{ficha.habilidadesAdquiridas}</dd></div>
              <div><dt>Habilidades pendientes</dt><dd>{ficha.habilidadesPendientes}</dd></div>
            </dl>
          </section>

          <div className="app-cols app-cols--2">
            {puedeRegistrar && (
              <section className="vl-card vl-stack" aria-labelledby="m2-evaluacion-titulo">
                <h2 id="m2-evaluacion-titulo" className="vl-text-heading-h4">Registrar evaluación</h2>
                <form className="vl-stack" onSubmit={enviarEvaluacion}>
                  <Campo etiqueta="Nivel evaluado" id="m2-evaluacion-nivel" obligatorio>
                    <select id="m2-evaluacion-nivel" className="vl-select" value={nivelEvaluadoId} onChange={(e) => setNivelEvaluadoId(e.target.value)} required>
                      <option value="">Selecciona un nivel</option>
                      {niveles.map((nivel) => <option key={nivel.id} value={nivel.id}>{nivel.orden}. {nivel.nombre}</option>)}
                    </select>
                  </Campo>
                  <Campo etiqueta="Resultado" id="m2-evaluacion-resultado" obligatorio>
                    <select id="m2-evaluacion-resultado" className="vl-select" value={resultado} onChange={(e) => setResultado(e.target.value as ResultadoEvaluacion)} required>
                      <option value="EN_PROCESO">En proceso</option>
                      <option value="APROBADO">Aprobado</option>
                      <option value="NO_APROBADO">No aprobado</option>
                    </select>
                  </Campo>
                  <Campo etiqueta="Observación de la evaluación" id="m2-evaluacion-observacion">
                    <textarea id="m2-evaluacion-observacion" className="vl-textarea" maxLength={1000} value={observacionEvaluacion} onChange={(e) => setObservacionEvaluacion(e.target.value)} />
                  </Campo>
                  <button className="vl-button vl-button--primary" type="submit" disabled={guardando || !nivelEvaluadoId}>
                    {guardando ? 'Guardando…' : 'Guardar evaluación'}
                  </button>
                </form>
              </section>
            )}

            {puedeRegistrar && (
              <section className="vl-card vl-stack" aria-labelledby="m2-habilidades-titulo">
                <h2 id="m2-habilidades-titulo" className="vl-text-heading-h4">Habilidades</h2>
                {habilidades.length === 0
                  ? <Alerta tono="info" titulo="No hay habilidades configuradas">El catálogo de habilidades aún no tiene elementos activos.</Alerta>
                  : (
                    <form className="vl-stack" onSubmit={guardarEstadoHabilidades}>
                      {habilidades.map((habilidad) => (
                        <Campo key={habilidad.habilidadId} etiqueta={`${habilidad.nivel} · ${habilidad.nombre}`} id={`m2-habilidad-${habilidad.habilidadId}`} ayuda={habilidad.descripcion ?? undefined}>
                          <select
                            id={`m2-habilidad-${habilidad.habilidadId}`}
                            className="vl-select"
                            value={estadosHabilidades[habilidad.habilidadId] ?? ''}
                            onChange={(e) => setEstadosHabilidades((actual) => ({
                              ...actual,
                              [habilidad.habilidadId]: e.target.value as '' | EstadoHabilidad,
                            }))}
                          >
                            <option value="">Sin marcar</option>
                            <option value="ADQUIRIDA">Adquirida</option>
                            <option value="PENDIENTE">Pendiente</option>
                          </select>
                        </Campo>
                      ))}
                      <button className="vl-button vl-button--primary" type="submit" disabled={guardando || Object.values(estadosHabilidades).every((estado) => estado === '')}>
                        Guardar habilidades
                      </button>
                    </form>
                  )}
              </section>
            )}

            {puedeRegistrar && (
              <section className="vl-card vl-stack" aria-labelledby="m2-observacion-titulo">
                <h2 id="m2-observacion-titulo" className="vl-text-heading-h4">Registrar observación</h2>
                <form className="vl-stack" onSubmit={guardarObservacion}>
                  <Campo etiqueta="Observación de desempeño" id="m2-observacion-texto" obligatorio>
                    <textarea id="m2-observacion-texto" className="vl-textarea" maxLength={2000} value={textoObservacion} onChange={(e) => setTextoObservacion(e.target.value)} required />
                  </Campo>
                  <label className="vl-check-row">
                    <input type="checkbox" checked={visibleParaPatinador} onChange={(e) => setVisibleParaPatinador(e.target.checked)} />
                    <span>Visible para el patinador si el club habilita la consulta</span>
                  </label>
                  <button className="vl-button vl-button--primary" type="submit" disabled={guardando || !textoObservacion.trim()}>
                    {guardando ? 'Guardando…' : 'Guardar observación'}
                  </button>
                </form>
              </section>
            )}

            {puedeProponer && ficha.categoria && (
              <section className="vl-card vl-stack" aria-labelledby="m2-proponer-categoria-titulo">
                <h2 id="m2-proponer-categoria-titulo" className="vl-text-heading-h4">Proponer cambio de categoría</h2>
                <form className="vl-stack" onSubmit={enviarPropuesta}>
                  <Campo etiqueta="Nueva categoría" id="m2-propuesta-categoria" obligatorio>
                    <select id="m2-propuesta-categoria" className="vl-select" value={categoriaPropuestaId} onChange={(e) => setCategoriaPropuestaId(e.target.value)} required>
                      <option value="">Selecciona una categoría</option>
                      {categorias.filter((categoria) => categoria.nombre !== ficha.categoria).map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
                    </select>
                  </Campo>
                  <Campo etiqueta="Justificación" id="m2-propuesta-justificacion" obligatorio>
                    <textarea id="m2-propuesta-justificacion" className="vl-textarea" maxLength={1000} value={justificacion} onChange={(e) => setJustificacion(e.target.value)} required />
                  </Campo>
                  <button className="vl-button vl-button--secondary" type="submit" disabled={guardando || !categoriaPropuestaId || !justificacion.trim()}>
                    {guardando ? 'Enviando…' : 'Enviar propuesta'}
                  </button>
                </form>
                <p className="vl-text-caption">El sistema valida el avance de nivel y el Administrador decide, salvo que tengas permiso de promoción directa.</p>
              </section>
            )}
          </div>

          <section className="vl-stack" aria-labelledby="m2-historial-titulo">
            <h2 id="m2-historial-titulo" className="vl-text-heading-h4">Trayectoria deportiva</h2>
            {!historial?.trayectoria.length
              ? <Alerta tono="info" titulo="Sin historial">Aún no hay cambios de nivel o categoría registrados.</Alerta>
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

          <section className="vl-stack" aria-labelledby="m2-evaluaciones-anteriores">
            <h2 id="m2-evaluaciones-anteriores" className="vl-text-heading-h4">Evaluaciones recientes</h2>
            <ListaEvaluaciones evaluaciones={ficha.evaluaciones} />
          </section>

          <section className="vl-stack" aria-labelledby="m2-observaciones-anteriores">
            <h2 id="m2-observaciones-anteriores" className="vl-text-heading-h4">Observaciones registradas</h2>
            {ficha.observaciones.length === 0
              ? <p className="vl-text-body-sm">Aún no hay observaciones registradas.</p>
              : (
                <div className="app-m2-lista">
                  {ficha.observaciones.map((observacion) => (
                    <article key={observacion.id} className="app-m2-lista__fila">
                      <div className="app-m2-propuesta__cabecera">
                        <strong>{observacion.profesor}</strong>
                        <span className="vl-text-caption">{formatoFecha(observacion.fecha)}</span>
                      </div>
                      <p>{observacion.texto}</p>
                      <p className="vl-text-caption">{observacion.visibleParaPatinador ? 'Visible si el club habilita la consulta' : 'Solo seguimiento interno'}</p>
                    </article>
                  ))}
                </div>
              )}
          </section>
        </>
      )}
    </div>
  )
}
