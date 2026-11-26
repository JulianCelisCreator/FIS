import { useEffect, useState } from 'react'
import {
  Alerta,
  Avatar,
  Campo,
  DialogoConfirmacion,
  Insignia,
  ListaDatos,
} from '../../../shared/ui/componentes.tsx'
import {
  asignarProfesoresAGrupoM3,
  listarGruposM3,
  listarProfesoresConDisponibilidadM3,
  obtenerGruposPorProfesorM3,
  quitarProfesorDeGrupoM3,
} from '../services/m3-grupos.service.ts'
import {
  ETIQUETA_DIA_CORTO,
  type EvaluacionDisponibilidadProfesorM3,
  type GrupoAsignadoProfesorM3,
  type GrupoConfiguradoM3,
} from '../types/m3.types.ts'
import './asignacion-profesores.css'

type Aviso = { tono: 'success' | 'warning' | 'error' | 'info'; titulo?: string; texto: string } | null

function formatearResumenHorarioGrupo(grupo: GrupoConfiguradoM3): string {
  if (grupo.horarios && grupo.horarios.length > 0) {
    return grupo.horarios
      .map((h) => `${ETIQUETA_DIA_CORTO[h.dia]} ${h.horaInicio}–${h.horaFin}`)
      .join(' · ')
  }
  return grupo.dias.map((d) => ETIQUETA_DIA_CORTO[d]).join(' y ')
}

/**
 * HU-3.2: Asignación de profesores (Actor: Administrador | RF2.2, RF1.3).
 * Selector de profesores con buscador en tiempo real, gestión de múltiples docentes
 * por grupo, validación de conflictos de horario en tiempo real (Escenario BDD 3),
 * tooltips/modals de error por traslape y vista del perfil actualizado del profesor (API-M3-02).
 */
export function AsignacionProfesores() {
  const [grupos, setGrupos] = useState<GrupoConfiguradoM3[]>([])
  const [grupoIdSeleccionado, setGrupoIdSeleccionado] = useState<string>('GRP-02')
  const [profesores, setProfesores] = useState<EvaluacionDisponibilidadProfesorM3[]>([])
  const [seleccionadosIds, setSeleccionadosIds] = useState<string[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [profesorPerfilId, setProfesorPerfilId] = useState<string>('PROF-03')
  const [agendaProfesor, setAgendaProfesor] = useState<GrupoAsignadoProfesorM3[]>([])
  const [tooltipAbiertoId, setTooltipAbiertoId] = useState<string | null>(null)
  const [modalConflicto, setModalConflicto] = useState<EvaluacionDisponibilidadProfesorM3 | null>(
    null,
  )
  const [aviso, setAviso] = useState<Aviso>(null)
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    let activo = true
    listarGruposM3().then((lista) => {
      if (!activo) return
      setGrupos(lista)
      if (lista.length > 0 && !lista.some((g) => g.grupoId === grupoIdSeleccionado)) {
        setGrupoIdSeleccionado(lista[0].grupoId)
      }
    })
    return () => {
      activo = false
    }
  }, [grupoIdSeleccionado])

  useEffect(() => {
    let activo = true
    listarProfesoresConDisponibilidadM3(grupoIdSeleccionado).then((lista) => {
      if (!activo) return
      setProfesores(lista)
      setSeleccionadosIds([])
    })
    return () => {
      activo = false
    }
  }, [grupoIdSeleccionado])

  useEffect(() => {
    let activo = true
    if (!profesorPerfilId) return
    obtenerGruposPorProfesorM3(profesorPerfilId).then((gruposAsignados) => {
      if (!activo) return
      setAgendaProfesor(gruposAsignados)
    })
    return () => {
      activo = false
    }
  }, [profesorPerfilId, grupos])

  const grupoActual =
    grupos.find((g) => g.grupoId === grupoIdSeleccionado) ?? grupos[0] ?? null

  const profesoresDelGrupo =
    grupoActual?.profesoresAsignados && grupoActual.profesoresAsignados.length > 0
      ? grupoActual.profesoresAsignados
      : grupoActual?.profesorId && grupoActual?.profesorNombre
        ? [
            {
              profesorId: grupoActual.profesorId,
              nombreCompleto: grupoActual.profesorNombre,
              rolDocente: 'TITULAR' as const,
              fechaAsignacion: '2026-09-23T08:00:00Z',
            },
          ]
        : []

  const profesoresFiltrados = profesores.filter((p) => {
    const termino = busqueda.trim().toLowerCase()
    if (!termino) return true
    return (
      p.nombreCompleto.toLowerCase().includes(termino) ||
      p.especialidad.toLowerCase().includes(termino) ||
      p.cargo.toLowerCase().includes(termino)
    )
  })

  const profesorConConflictoVisible =
    profesoresFiltrados.find((p) => p.tieneConflicto) ??
    profesores.find((p) => p.tieneConflicto) ??
    null

  const profesorPerfilActual =
    profesores.find((p) => p.profesorId === profesorPerfilId) ?? profesores[0] ?? null

  const recargarDatos = async (grupoId: string, perfilId: string) => {
    const [listaGrupos, listaProfesores, gruposDelProfesor] = await Promise.all([
      listarGruposM3(),
      listarProfesoresConDisponibilidadM3(grupoId),
      obtenerGruposPorProfesorM3(perfilId),
    ])
    setGrupos(listaGrupos)
    setProfesores(listaProfesores)
    setAgendaProfesor(gruposDelProfesor)
  }

  const alternarSeleccionProfesor = (prof: EvaluacionDisponibilidadProfesorM3) => {
    setProfesorPerfilId(prof.profesorId)

    // Escenario BDD 3: si el docente tiene traslape de horario, bloquea la selección y emite alerta/modal
    if (prof.tieneConflicto) {
      setTooltipAbiertoId(prof.profesorId)
      setModalConflicto(prof)
      setAviso({
        tono: 'error',
        titulo: 'Conflicto de horario detectado en tiempo real',
        texto:
          prof.detalleConflicto ??
          `${prof.nombreCompleto} ya tiene una clase programada en ese mismo horario. Seleccione otro docente o franja.`,
      })
      return
    }

    if (prof.yaAsignadoAlGrupo) {
      setAviso({
        tono: 'info',
        titulo: 'Docente ya asignado',
        texto: `${prof.nombreCompleto} ya forma parte del equipo docente de este grupo.`,
      })
      return
    }

    setSeleccionadosIds((prev) =>
      prev.includes(prof.profesorId)
        ? prev.filter((id) => id !== prof.profesorId)
        : [...prev, prof.profesorId],
    )
  }

  const manejarAsignarSeleccionados = async () => {
    if (!grupoActual) return
    if (seleccionadosIds.length === 0) {
      setAviso({
        tono: 'warning',
        titulo: 'Ningún profesor seleccionado',
        texto: 'Marque uno o varios profesores con disponibilidad «Libre» para asignarlos al grupo.',
      })
      return
    }

    setProcesando(true)
    setAviso(null)
    try {
      const actualizado = await asignarProfesoresAGrupoM3(
        grupoActual.grupoId,
        seleccionadosIds,
      )
      const ultimoAsignadoId = seleccionadosIds[0]
      setProfesorPerfilId(ultimoAsignadoId)
      await recargarDatos(actualizado.grupoId, ultimoAsignadoId)
      setSeleccionadosIds([])
      setAviso({
        tono: 'success',
        titulo: 'Profesores asignados correctamente',
        texto: `Se actualizó el equipo docente del grupo «${actualizado.nombre}» y el perfil de los entrenadores en tiempo real.`,
      })
    } catch (error) {
      setAviso({
        tono: 'error',
        titulo: 'Asignación bloqueada por conflicto de horario',
        texto:
          error instanceof Error
            ? error.message
            : 'No fue posible asignar el docente por traslape de horario.',
      })
    } finally {
      setProcesando(false)
    }
  }

  const manejarQuitarProfesor = async (profesorId: string, nombreCompleto: string) => {
    if (!grupoActual) return
    setProcesando(true)
    setAviso(null)
    try {
      await quitarProfesorDeGrupoM3(grupoActual.grupoId, profesorId)
      setProfesorPerfilId(profesorId)
      await recargarDatos(grupoActual.grupoId, profesorId)
      setAviso({
        tono: 'info',
        titulo: 'Profesor desasignado del grupo',
        texto: `Se quitó a ${nombreCompleto} del grupo «${grupoActual.nombre}» y se liberó su agenda en API-M3-02.`,
      })
    } catch (error) {
      setAviso({
        tono: 'error',
        titulo: 'No se pudo quitar al profesor',
        texto: error instanceof Error ? error.message : 'Intente nuevamente.',
      })
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb" aria-label="Ruta">
            <span>Inicio</span>
            <span aria-hidden="true">/</span>
            <a className="vl-link" href="#/grupos">
              Grupos
            </a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{grupoActual?.nombre ?? 'Asignación de profesores'}</span>
          </nav>
          <h1>Asignación de profesores</h1>
          <p className="vl-text-body-sm">
            HU-3.2 · Asigna uno o varios entrenadores activos (DEP-M1-02) a cada grupo validando en
            tiempo real su disponibilidad y conflictos de horario (DEP-M6-01).
          </p>
        </div>
      </header>

      {aviso && (
        <Alerta tono={aviso.tono} titulo={aviso.titulo}>
          <p>{aviso.texto}</p>
        </Alerta>
      )}

      <div className="m3-prof__grid">
        {/* Columna izquierda: Selector de grupo, buscador en tiempo real y tabla de profesores */}
        <section className="vl-card vl-stack" aria-labelledby="titulo-selector-prof">
          <h2 id="titulo-selector-prof" className="vl-text-heading-h4">
            Selector y disponibilidad en tiempo real
          </h2>

          <Campo
            etiqueta="Grupo"
            id="asig-select-grupo"
            ayuda="Al cambiar de grupo se recalcula de inmediato el cruce de horarios de cada entrenador."
          >
            <select
              id="asig-select-grupo"
              className="vl-select"
              value={grupoIdSeleccionado}
              onChange={(e) => {
                setGrupoIdSeleccionado(e.target.value)
                setAviso(null)
              }}
            >
              {grupos
                .filter((g) => g.activo)
                .map((g) => (
                  <option key={g.grupoId} value={g.grupoId}>
                    {g.nombre} · {formatearResumenHorarioGrupo(g)} ({g.sedeNombre})
                  </option>
                ))}
            </select>
          </Campo>

          <Campo etiqueta="Buscar profesor" id="asig-buscar-profesor">
            <input
              id="asig-buscar-profesor"
              className="vl-input"
              type="search"
              placeholder="🔍 Escriba un nombre o especialidad…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </Campo>

          <div className="vl-table-wrap">
            <table className="vl-table" aria-label="Profesores activos y disponibilidad horaria">
              <thead>
                <tr>
                  <th scope="col">Sel.</th>
                  <th scope="col">Profesor</th>
                  <th scope="col">Disponibilidad</th>
                </tr>
              </thead>
              <tbody>
                {profesoresFiltrados.map((prof) => {
                  const marcado = seleccionadosIds.includes(prof.profesorId)
                  const estadoInsignia = prof.tieneConflicto
                    ? 'conflicto'
                    : prof.yaAsignadoAlGrupo
                      ? 'asignado'
                      : 'libre'

                  return (
                    <tr
                      key={prof.profesorId}
                      className={
                        marcado
                          ? 'm3-prof__fila-seleccionada'
                          : prof.tieneConflicto
                            ? 'm3-prof__fila-conflicto'
                            : undefined
                      }
                    >
                      <td data-label="Seleccionar">
                        <input
                          type="checkbox"
                          className="vl-radio"
                          checked={marcado || prof.yaAsignadoAlGrupo}
                          disabled={prof.yaAsignadoAlGrupo}
                          aria-label={`Seleccionar a ${prof.nombreCompleto}`}
                          onChange={() => alternarSeleccionProfesor(prof)}
                        />
                      </td>
                      <td data-label="Profesor">
                        <div className="m3-prof__docente-info">
                          <Avatar nombre={prof.nombreCompleto} tamano="sm" />
                          <div>
                            <strong>{prof.nombreCompleto}</strong>
                            <span className="app-dato-secundario">
                              {prof.especialidad} · Contrato: {prof.estadoContrato}
                            </span>
                            <button
                              type="button"
                              className="vl-link app-boton-enlace"
                              onClick={() => setProfesorPerfilId(prof.profesorId)}
                            >
                              Ver perfil y agenda ({prof.gruposAsignados.length} grupos)
                            </button>
                          </div>
                        </div>
                      </td>
                      <td data-label="Disponibilidad">
                        <div className="m3-prof__tooltip-wrap">
                          <span title={prof.detalleConflicto ?? 'Sin conflicto de horario'}>
                            <Insignia entidad="disponibilidad" estado={estadoInsignia} />
                          </span>
                          {prof.tieneConflicto && prof.detalleConflicto && (
                            <>
                              <button
                                type="button"
                                className="m3-prof__tooltip-btn"
                                aria-expanded={tooltipAbiertoId === prof.profesorId}
                                onClick={() => {
                                  setTooltipAbiertoId((prev) =>
                                    prev === prof.profesorId ? null : prof.profesorId,
                                  )
                                  setModalConflicto(prof)
                                }}
                              >
                                Ver motivo de traslape
                              </button>
                              {tooltipAbiertoId === prof.profesorId && (
                                <div className="m3-prof__tooltip-box" role="tooltip">
                                  {prof.detalleConflicto}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="app-actions" style={{ justifyContent: 'flex-start' }}>
            <button
              className="vl-button vl-button--primary"
              type="button"
              disabled={procesando || seleccionadosIds.length === 0}
              aria-disabled={procesando || seleccionadosIds.length === 0 || undefined}
              onClick={manejarAsignarSeleccionados}
            >
              {procesando
                ? 'Asignando…'
                : `Asignar seleccionados (${seleccionadosIds.length})`}
            </button>
            <button
              className="vl-button vl-button--secondary"
              type="button"
              onClick={() => {
                setSeleccionadosIds([])
                setAviso(null)
              }}
            >
              Cancelar
            </button>
          </div>
        </section>

        {/* Columna derecha: Profesores actuales del grupo, Alerta de conflicto y Perfil actualizado */}
        <div className="vl-stack">
          <section className="vl-card vl-stack" aria-labelledby="titulo-profesores-grupo">
            <h2 id="titulo-profesores-grupo" className="vl-text-heading-h4">
              Profesores del grupo ({profesoresDelGrupo.length})
            </h2>
            <p className="vl-text-body-sm">
              Grupo: <strong>{grupoActual?.nombre}</strong> · Horario:{' '}
              {grupoActual ? formatearResumenHorarioGrupo(grupoActual) : '—'}
            </p>

            {profesoresDelGrupo.length === 0 ? (
              <Alerta tono="warning" titulo="Grupo sin profesor asignado">
                <p>Seleccione uno o más entrenadores disponibles en el panel izquierdo.</p>
              </Alerta>
            ) : (
              <div className="vl-stack">
                {profesoresDelGrupo.map((asig) => (
                  <div key={asig.profesorId} className="m3-prof__docente-item">
                    <div className="m3-prof__docente-info">
                      <Avatar nombre={asig.nombreCompleto} tamano="sm" />
                      <div>
                        <strong>{asig.nombreCompleto}</strong>
                        <span className="app-dato-secundario">
                          Rol: {asig.rolDocente} · ID: {asig.profesorId}
                        </span>
                      </div>
                    </div>
                    <div className="m3-prof__docente-acciones">
                      <Insignia entidad="cuenta" estado="activa" />
                      <button
                        type="button"
                        className="vl-button vl-button--ghost vl-button--sm"
                        onClick={() => setProfesorPerfilId(asig.profesorId)}
                      >
                        Agenda
                      </button>
                      <button
                        type="button"
                        className="vl-button vl-button--secondary vl-button--sm"
                        disabled={procesando}
                        onClick={() =>
                          manejarQuitarProfesor(asig.profesorId, asig.nombreCompleto)
                        }
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Alerta de conflicto de horario (Wireframe HU-3.2 / Escenario BDD 3) */}
          {profesorConConflictoVisible && (
            <Alerta tono="error" titulo="Conflicto de horario">
              <p>{profesorConConflictoVisible.detalleConflicto}</p>
            </Alerta>
          )}

          {/* Vista del perfil y agenda actualizada del profesor (API-M3-02) */}
          {profesorPerfilActual && (
            <section className="vl-card vl-stack" aria-labelledby="titulo-perfil-profesor">
              <div className="m3-prof__agenda-head">
                <h2 id="titulo-perfil-profesor" className="vl-text-heading-h4">
                  Perfil y agenda del profesor
                </h2>
                <Insignia
                  entidad="cuenta"
                  estado={profesorPerfilActual.estadoContrato === 'ACTIVO' ? 'activa' : 'desactivada'}
                />
              </div>

              <div className="m3-prof__docente-info">
                <Avatar nombre={profesorPerfilActual.nombreCompleto} />
                <div>
                  <p className="vl-person__name">{profesorPerfilActual.nombreCompleto}</p>
                  <p className="vl-person__meta">
                    {profesorPerfilActual.profesorId} · {profesorPerfilActual.cargo}
                  </p>
                </div>
              </div>

              <ListaDatos
                filas={[
                  ['Especialidad (DEP-M1-02)', profesorPerfilActual.especialidad],
                  ['Contrato (DEP-M6-01)', profesorPerfilActual.estadoContrato],
                  ['Grupos activos (API-M3-02)', String(agendaProfesor.length)],
                ]}
              />

              <div className="vl-stack">
                <h3 className="vl-text-heading-h5">
                  Grupos y horarios asignados (GET /api/v1/profesores/{profesorPerfilActual.profesorId}/grupos)
                </h3>
                {agendaProfesor.length === 0 ? (
                  <p className="vl-text-body-sm">
                    Este profesor no tiene grupos asignados actualmente.
                  </p>
                ) : (
                  <ul className="m3-prof__agenda-lista">
                    {agendaProfesor.map((item) => (
                      <li key={item.grupoId} className="m3-prof__agenda-item">
                        <div className="m3-prof__agenda-head">
                          <strong>
                            {item.nombreGrupo} ({item.grupoId})
                          </strong>
                          <span className="vl-text-caption">Rol: {item.rolDocente}</span>
                        </div>
                        <div className="m3-prof__horarios-chips">
                          {item.horarios.length === 0 ? (
                            <span className="vl-text-caption">Sin franjas registradas</span>
                          ) : (
                            item.horarios.map((h) => (
                              <span key={h.id} className="m3-prof__horario-chip">
                                {ETIQUETA_DIA_CORTO[h.dia]} {h.horaInicio}–{h.horaFin} · {h.pista}
                              </span>
                            ))
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Modal emergente de detalle de traslape de horario */}
      <DialogoConfirmacion
        abierto={Boolean(modalConflicto)}
        titulo={`Conflicto de horario — ${modalConflicto?.nombreCompleto ?? ''}`}
        textoCancelar="Entendido"
        alCancelar={() => setModalConflicto(null)}
      >
        <Alerta tono="error" titulo="Asignación bloqueada por traslape">
          <p>{modalConflicto?.detalleConflicto}</p>
        </Alerta>
        <p className="vl-text-body-sm">
          Según la regla de negocio RF2.2 (Escenario BDD 3), el sistema valida en tiempo real
          la agenda docente y la disponibilidad laboral en DEP-M6-01 e impide asignar al
          entrenador hasta que se seleccione otro docente o se reprograme la franja horaria.
        </p>
      </DialogoConfirmacion>
    </div>
  )
}
