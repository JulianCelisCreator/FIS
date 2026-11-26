import { useEffect, useState, type FormEvent } from 'react'
import { Alerta, Campo, DialogoConfirmacion, Insignia } from '../../../shared/ui/componentes.tsx'
import {
  actualizarHorarioM3,
  anularHorarioM3,
  crearHorarioM3,
  listarGruposM3,
  listarHorariosM3,
  listarNotificacionesHorariosM3,
  obtenerCatalogosGruposM3,
} from '../services/m3-grupos.service.ts'
import {
  CATALOGOS_M3_FALLBACK,
  ETIQUETA_DIA_COMPLETO,
  ETIQUETA_DIA_CORTO,
  type CatalogosConfiguracionM3,
  type DiaSemanaM3,
  type GrupoConfiguradoM3,
  type HorarioGrupoM3,
  type RegistroNotificacionM1,
} from '../types/m3.types.ts'
import './programacion-horarios.css'

const DIAS_CALENDARIO: DiaSemanaM3[] = [
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
]

const BLOQUES_HORA: { inicio: string; fin: string }[] = [
  { inicio: '08:00', fin: '10:00' },
  { inicio: '10:00', fin: '12:00' },
  { inicio: '14:00', fin: '16:00' },
  { inicio: '15:00', fin: '17:00' },
  { inicio: '16:00', fin: '18:00' },
]

function calcularHoraFinPorDefecto(horaInicio: string): string {
  const [hStr, mStr] = horaInicio.split(':')
  const h = Number.parseInt(hStr ?? '8', 10)
  const finH = Math.min(22, h + 2)
  return `${String(finH).padStart(2, '0')}:${mStr ?? '00'}`
}

type Aviso = { tono: 'success' | 'warning' | 'error' | 'info'; titulo?: string; texto: string } | null

/**
 * HU-3.3: Programación de horarios de clase (Actor: Administrador | RF2.1, RF2.4).
 * Calendario interactivo con Drag & Drop para crear y reprogramar franjas horarias,
 * validación anti-solapamiento de pista/sede según capacidad (DEP-G4-01), anulación
 * con motivo obligatorio y visualización de confirmación de notificaciones enviadas (DEP-M1-05).
 */
export function ProgramacionHorarios() {
  const [catalogos, setCatalogos] = useState<CatalogosConfiguracionM3>(CATALOGOS_M3_FALLBACK)
  const [grupos, setGrupos] = useState<GrupoConfiguradoM3[]>([])
  const [horarios, setHorarios] = useState<HorarioGrupoM3[]>([])
  const [notificaciones, setNotificaciones] = useState<RegistroNotificacionM1[]>([])

  // Filtros
  const [filtroSede, setFiltroSede] = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState('')
  const [incluirCancelados, setIncluirCancelados] = useState(false)

  // Estado Drag & Drop
  const [arrastrandoId, setArrastrandoId] = useState<string | null>(null)
  const [celdaDropActiva, setCeldaDropActiva] = useState<string | null>(null)

  // Formulario Crear / Editar franja
  const [horarioEditando, setHorarioEditando] = useState<HorarioGrupoM3 | null>(null)
  const [grupoIdForm, setGrupoIdForm] = useState('GRP-01')
  const [diaForm, setDiaForm] = useState<DiaSemanaM3>('Lunes')
  const [horaInicioForm, setHoraInicioForm] = useState('08:00')
  const [horaFinForm, setHoraFinForm] = useState('10:00')
  const [sedeIdForm, setSedeIdForm] = useState('SEDE-NORTE-P1')
  const [guardando, setGuardando] = useState(false)

  // Feedback de solapamiento y notificaciones
  const [aviso, setAviso] = useState<Aviso>(null)
  const [alertaSolapamiento, setAlertaSolapamiento] = useState<string | null>(null)

  // Modal Anular franja con motivo obligatorio (Dialog ConfirmWithReason)
  const [modalAnularAbierto, setModalAnularAbierto] = useState(false)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null)

  const recargarTodo = async (sede = filtroSede, grupo = filtroGrupo, cancelados = incluirCancelados) => {
    const [cat, listaGrupos, listaHorarios, listaNotif] = await Promise.all([
      obtenerCatalogosGruposM3(),
      listarGruposM3(),
      listarHorariosM3({
        sedeId: sede || undefined,
        grupoId: grupo || undefined,
        incluirCancelados: cancelados,
      }),
      listarNotificacionesHorariosM3(),
    ])
    setCatalogos(cat)
    setGrupos(listaGrupos)
    setHorarios(listaHorarios)
    setNotificaciones(listaNotif)
  }

  useEffect(() => {
    let activo = true
    Promise.all([
      obtenerCatalogosGruposM3(),
      listarGruposM3(),
      listarHorariosM3({
        sedeId: filtroSede || undefined,
        grupoId: filtroGrupo || undefined,
        incluirCancelados,
      }),
      listarNotificacionesHorariosM3(),
    ]).then(([cat, listaGrupos, listaHorarios, listaNotif]) => {
      if (!activo) return
      setCatalogos(cat)
      setGrupos(listaGrupos)
      setHorarios(listaHorarios)
      setNotificaciones(listaNotif)
    })
    return () => {
      activo = false
    }
  }, [filtroSede, filtroGrupo, incluirCancelados])

  const prepararNuevaFranja = (diaInicial: DiaSemanaM3 = 'Lunes', horaInicial = '08:00') => {
    setHorarioEditando(null)
    const primerGrupo = grupos[0]
    setGrupoIdForm(primerGrupo?.grupoId ?? 'GRP-01')
    setDiaForm(diaInicial)
    setHoraInicioForm(horaInicial)
    setHoraFinForm(calcularHoraFinPorDefecto(horaInicial))
    setSedeIdForm(primerGrupo?.sedeId ?? 'SEDE-NORTE-P1')
    setAlertaSolapamiento(null)
  }

  const seleccionarHorarioParaEditar = (h: HorarioGrupoM3) => {
    setHorarioEditando(h)
    setGrupoIdForm(h.grupoId ?? 'GRP-01')
    setDiaForm(h.diaSemana ?? h.dia)
    setHoraInicioForm(h.horaInicio)
    setHoraFinForm(h.horaFin)
    setSedeIdForm(h.sedeId ?? 'SEDE-NORTE-P1')
    setAlertaSolapamiento(null)
  }

  const manejarDropEnCelda = async (diaDestino: DiaSemanaM3, horaInicioDestino: string) => {
    setCeldaDropActiva(null)
    if (!arrastrandoId) return
    const horarioOrigen = horarios.find(
      (h) => (h.horarioId ?? h.id) === arrastrandoId,
    )
    setArrastrandoId(null)
    if (!horarioOrigen) return

    const diaOrigen = horarioOrigen.diaSemana ?? horarioOrigen.dia
    if (diaOrigen === diaDestino && horarioOrigen.horaInicio === horaInicioDestino) {
      return
    }

    const nuevaHoraFin = calcularHoraFinPorDefecto(horaInicioDestino)
    setAlertaSolapamiento(null)
    setAviso(null)

    try {
      const respuesta = await actualizarHorarioM3(
        horarioOrigen.horarioId ?? horarioOrigen.id,
        {
          diaSemana: diaDestino,
          horaInicio: horaInicioDestino,
          horaFin: nuevaHoraFin,
        },
      )
      await recargarTodo()
      seleccionarHorarioParaEditar(respuesta.horario)
      setAviso({
        tono: 'success',
        titulo: 'Franja reprogramada con Drag & Drop (Notificación DEP-M1-05 enviada)',
        texto: respuesta.notificacion
          ? `${respuesta.notificacion.mensaje} [${respuesta.notificacion.notificacionId}]`
          : `Horario actualizado a ${diaDestino} ${horaInicioDestino}–${nuevaHoraFin}.`,
      })
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'No se pudo reprogramar la franja por solapamiento de pista.'
      setAlertaSolapamiento(mensaje)
      setAviso({
        tono: 'error',
        titulo: 'Reprogramación bloqueada por choque de pista o docente',
        texto: mensaje,
      })
    }
  }

  const manejarGuardarFormulario = async (evento: FormEvent) => {
    evento.preventDefault()
    setAlertaSolapamiento(null)
    setAviso(null)

    if (horaInicioForm >= horaFinForm) {
      setAlertaSolapamiento('La hora de inicio debe ser anterior a la hora de finalización.')
      return
    }

    setGuardando(true)
    try {
      if (horarioEditando) {
        const idHorario = horarioEditando.horarioId ?? horarioEditando.id
        const respuesta = await actualizarHorarioM3(idHorario, {
          grupoId: grupoIdForm,
          diaSemana: diaForm,
          horaInicio: horaInicioForm,
          horaFin: horaFinForm,
          sedeId: sedeIdForm,
        })
        await recargarTodo()
        setHorarioEditando(respuesta.horario)
        setAviso({
          tono: 'success',
          titulo: 'Franja actualizada y notificación enviada (DEP-M1-05)',
          texto: respuesta.notificacion
            ? `${respuesta.notificacion.mensaje} (${respuesta.notificacion.notificacionId})`
            : 'Se guardaron los cambios de la franja horaria.',
        })
      } else {
        const respuesta = await crearHorarioM3({
          grupoId: grupoIdForm,
          diaSemana: diaForm,
          horaInicio: horaInicioForm,
          horaFin: horaFinForm,
          sedeId: sedeIdForm,
        })
        await recargarTodo()
        setHorarioEditando(respuesta.horario)
        setAviso({
          tono: 'success',
          titulo: 'Nueva franja horaria creada',
          texto: `Se programó la sesión el ${diaForm} de ${horaInicioForm} a ${horaFinForm} en ${respuesta.horario.pista}.`,
        })
      }
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'Solapamiento de pista o docente detectado.'
      setAlertaSolapamiento(mensaje)
      setAviso({
        tono: 'error',
        titulo: 'No se pudo guardar la franja horaria',
        texto: mensaje,
      })
    } finally {
      setGuardando(false)
    }
  }

  const confirmarAnulacionFranja = async () => {
    if (!horarioEditando) return
    if (!motivoAnulacion.trim()) {
      setErrorMotivo('Describa el motivo obligatorio para anular la franja.')
      return
    }
    setGuardando(true)
    setErrorMotivo(null)
    try {
      const idHorario = horarioEditando.horarioId ?? horarioEditando.id
      const respuesta = await anularHorarioM3(idHorario, motivoAnulacion.trim())
      setModalAnularAbierto(false)
      setMotivoAnulacion('')
      setHorarioEditando(null)
      await recargarTodo()
      setAviso({
        tono: 'info',
        titulo: 'Franja anulada con notificación automática (DEP-M1-05)',
        texto: respuesta.notificacion
          ? `${respuesta.notificacion.mensaje} [${respuesta.notificacion.notificacionId}]`
          : 'La franja fue marcada como anulada y se notificó a los integrantes del grupo.',
      })
    } catch (error) {
      setErrorMotivo(error instanceof Error ? error.message : 'No se pudo anular la franja.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb" aria-label="Ruta">
            <span>Inicio</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Horarios</span>
          </nav>
          <h1>Programación de horarios</h1>
          <p className="vl-text-body-sm">
            HU-3.3 · Arrastra y suelta (Drag &amp; Drop) las sesiones en el calendario semanal o usa el
            editor inferior. El sistema previene choques de pista (DEP-G4-01) y envía notificaciones
            automáticas ante cambios o cancelaciones (DEP-M1-05).
          </p>
        </div>
        <button
          type="button"
          className="vl-button vl-button--primary"
          onClick={() => prepararNuevaFranja('Lunes', '08:00')}
        >
          + Nueva franja
        </button>
      </header>

      {/* Barra de filtros (FilterBar) */}
      <form
        className="vl-filter-bar"
        role="search"
        aria-label="Filtrar programación de horarios"
        onSubmit={(e) => e.preventDefault()}
      >
        <Campo etiqueta="Sede / Pista" id="horarios-filtro-sede">
          <select
            id="horarios-filtro-sede"
            className="vl-select"
            value={filtroSede}
            onChange={(e) => setFiltroSede(e.target.value)}
          >
            <option value="">Todas las sedes</option>
            {catalogos.sedes.map((s) => (
              <option key={s.sedeId} value={s.sedeId}>
                {s.nombreSede} — {s.pista}
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Grupo" id="horarios-filtro-grupo">
          <select
            id="horarios-filtro-grupo"
            className="vl-select"
            value={filtroGrupo}
            onChange={(e) => setFiltroGrupo(e.target.value)}
          >
            <option value="">Todos los grupos</option>
            {grupos.map((g) => (
              <option key={g.grupoId} value={g.grupoId}>
                {g.nombre} ({g.grupoId})
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Estado de franja" id="horarios-filtro-estado">
          <select
            id="horarios-filtro-estado"
            className="vl-select"
            value={incluirCancelados ? 'todos' : 'activos'}
            onChange={(e) => setIncluirCancelados(e.target.value === 'todos')}
          >
            <option value="activos">Solo activas y reprogramadas</option>
            <option value="todos">Incluir franjas anuladas</option>
          </select>
        </Campo>
      </form>

      {aviso && (
        <Alerta tono={aviso.tono} titulo={aviso.titulo}>
          <p>{aviso.texto}</p>
        </Alerta>
      )}

      {/* Calendario semanal interactivo Drag & Drop (Wireframe HU-3.3) */}
      <section className="vl-stack" aria-label="Calendario semanal interactivo Drag and Drop">
        <div className="m3-horarios__cal-wrap">
          <div className="m3-horarios__cal" role="grid" aria-label="Grilla semanal de horarios">
            <div className="m3-horarios__cal-head">Hora</div>
            {DIAS_CALENDARIO.map((dia) => (
              <div key={dia} className="m3-horarios__cal-head">
                {ETIQUETA_DIA_CORTO[dia]}
              </div>
            ))}

            {BLOQUES_HORA.map((bloque) => (
              <div key={bloque.inicio} style={{ display: 'contents' }}>
                <div className="m3-horarios__cal-hora">{bloque.inicio}</div>
                {DIAS_CALENDARIO.map((dia) => {
                  const claveCelda = `${dia}-${bloque.inicio}`
                  const eventosEnCelda = horarios.filter(
                    (h) =>
                      (h.diaSemana ?? h.dia) === dia && h.horaInicio === bloque.inicio,
                  )
                  const esDropActivo = celdaDropActiva === claveCelda

                  return (
                    <div
                      key={claveCelda}
                      className={`m3-horarios__cal-celda ${
                        esDropActivo ? 'm3-horarios__cal-celda--drop' : ''
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        if (celdaDropActiva !== claveCelda) {
                          setCeldaDropActiva(claveCelda)
                        }
                      }}
                      onDragLeave={() => {
                        if (celdaDropActiva === claveCelda) {
                          setCeldaDropActiva(null)
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        void manejarDropEnCelda(dia, bloque.inicio)
                      }}
                      onClick={(e) => {
                        if (e.target === e.currentTarget && eventosEnCelda.length === 0) {
                          prepararNuevaFranja(dia, bloque.inicio)
                        }
                      }}
                    >
                      {eventosEnCelda.map((ev) => {
                        const idEv = ev.horarioId ?? ev.id
                        const esSeleccionado =
                          (horarioEditando?.horarioId ?? horarioEditando?.id) === idEv
                        const esCancelado = ev.estado === 'CANCELADO'
                        const estadoBadge =
                          ev.estado === 'CANCELADO'
                            ? 'cancelado'
                            : ev.estado === 'REPROGRAMADO'
                              ? 'reprogramado'
                              : 'activo'

                        return (
                          <button
                            key={idEv}
                            type="button"
                            draggable={!esCancelado}
                            onDragStart={() => setArrastrandoId(idEv)}
                            onDragEnd={() => {
                              setArrastrandoId(null)
                              setCeldaDropActiva(null)
                            }}
                            onClick={() => seleccionarHorarioParaEditar(ev)}
                            className={[
                              'm3-horarios__evento',
                              esSeleccionado ? 'm3-horarios__evento--seleccionado' : '',
                              arrastrandoId === idEv ? 'm3-horarios__evento--arrastrando' : '',
                              esCancelado ? 'm3-horarios__evento--cancelado' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            <span className="m3-horarios__evento-titulo">
                              {ev.nombreGrupo ?? ev.grupoId}
                            </span>
                            <span className="m3-horarios__evento-meta">
                              {ev.horaInicio}–{ev.horaFin} · {ev.pista}
                            </span>
                            <Insignia entidad="horario" estado={estadoBadge} />
                            {!esCancelado && (
                              <span className="m3-horarios__evento-drag">
                                ↕ Arrastrar o clic para editar
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sección inferior en 2 columnas: Formulario Crear/Editar franja + Alertas y Notificaciones DEP-M1-05 */}
      <div className="m3-horarios__two">
        <section className="vl-card vl-stack" aria-labelledby="titulo-editor-franja">
          <h2 id="titulo-editor-franja" className="vl-text-heading-h4">
            {horarioEditando
              ? `Editar franja (${horarioEditando.horarioId ?? horarioEditando.id})`
              : 'Nueva franja horaria'}
          </h2>

          <form className="vl-stack" onSubmit={manejarGuardarFormulario}>
            <div className="m3-horarios__form-grid">
              <Campo etiqueta="Grupo" id="franja-grupo" obligatorio>
                <select
                  id="franja-grupo"
                  className="vl-select"
                  value={grupoIdForm}
                  onChange={(e) => {
                    const nuevoGid = e.target.value
                    setGrupoIdForm(nuevoGid)
                    const g = grupos.find((item) => item.grupoId === nuevoGid)
                    if (g && !horarioEditando) {
                      setSedeIdForm(g.sedeId)
                    }
                  }}
                >
                  {grupos
                    .filter((g) => g.activo)
                    .map((g) => (
                      <option key={g.grupoId} value={g.grupoId}>
                        {g.nombre} ({g.grupoId})
                      </option>
                    ))}
                </select>
              </Campo>

              <Campo etiqueta="Día" id="franja-dia" obligatorio>
                <select
                  id="franja-dia"
                  className="vl-select"
                  value={diaForm}
                  onChange={(e) => setDiaForm(e.target.value as DiaSemanaM3)}
                >
                  {catalogos.diasDisponibles.map((d) => (
                    <option key={d} value={d}>
                      {ETIQUETA_DIA_COMPLETO[d]}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo etiqueta="Hora inicio" id="franja-hora-inicio" obligatorio>
                <select
                  id="franja-hora-inicio"
                  className="vl-select"
                  value={horaInicioForm}
                  onChange={(e) => {
                    const nueva = e.target.value
                    setHoraInicioForm(nueva)
                    setHoraFinForm(calcularHoraFinPorDefecto(nueva))
                  }}
                >
                  {BLOQUES_HORA.map((b) => (
                    <option key={b.inicio} value={b.inicio}>
                      {b.inicio}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo etiqueta="Hora fin" id="franja-hora-fin" obligatorio>
                <select
                  id="franja-hora-fin"
                  className="vl-select"
                  value={horaFinForm}
                  onChange={(e) => setHoraFinForm(e.target.value)}
                >
                  <option value="10:00">10:00</option>
                  <option value="12:00">12:00</option>
                  <option value="16:00">16:00</option>
                  <option value="17:00">17:00</option>
                  <option value="18:00">18:00</option>
                  <option value="20:00">20:00</option>
                </select>
              </Campo>

              <div style={{ gridColumn: '1 / -1' }}>
                <Campo
                  etiqueta="Pista / sede"
                  id="franja-sede"
                  obligatorio
                  ayuda="Validación anti-solapamiento de pista según capacidad física (DEP-G4-01)."
                >
                  <select
                    id="franja-sede"
                    className="vl-select"
                    value={sedeIdForm}
                    onChange={(e) => setSedeIdForm(e.target.value)}
                  >
                    {catalogos.sedes.map((s) => (
                      <option key={s.sedeId} value={s.sedeId}>
                        {s.pista} · Sede {s.nombreSede} (aforo físico máx. {s.aforoMaximoFisico})
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>
            </div>

            <div className="app-actions" style={{ justifyContent: 'flex-start' }}>
              <button
                type="submit"
                className="vl-button vl-button--primary"
                disabled={guardando}
              >
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                type="button"
                className="vl-button vl-button--secondary"
                onClick={() => prepararNuevaFranja()}
              >
                Cancelar
              </button>
              {horarioEditando && horarioEditando.estado !== 'CANCELADO' && (
                <button
                  type="button"
                  className="vl-button vl-button--secondary m3-horarios__btn-destructivo"
                  onClick={() => {
                    setMotivoAnulacion('')
                    setErrorMotivo(null)
                    setModalAnularAbierto(true)
                  }}
                >
                  Anular franja
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Columna derecha: Feedback de choque de pista + Bandeja auditable de notificaciones DEP-M1-05 */}
        <div className="vl-stack">
          {alertaSolapamiento ? (
            <Alerta tono="warning" titulo="Solapamiento de pista o conflicto horario">
              <p>{alertaSolapamiento}</p>
            </Alerta>
          ) : (
            <Alerta tono="info" titulo="Control anti-solapamiento de pista activo (DEP-G4-01)">
              <p>
                Puedes arrastrar cualquier sesión en el calendario superior. Si la pista destino ya
                está ocupada en ese bloque horario por otro grupo, el sistema bloqueará el cruce de
                inmediato.
              </p>
            </Alerta>
          )}

          <section className="vl-card vl-stack" aria-labelledby="titulo-notif-horarios">
            <h2 id="titulo-notif-horarios" className="vl-text-heading-h4">
              Notificaciones enviadas (DEP-M1-05 · {notificaciones.length})
            </h2>
            <p className="vl-text-body-sm">
              Registro auditable de mensajes Email / Push disparados automáticamente ante
              reprogramaciones o anulaciones de franjas horarias.
            </p>

            <ul className="m3-horarios__notif-lista">
              {notificaciones.slice(0, 5).map((n) => (
                <li key={n.notificacionId} className="m3-horarios__notif-item">
                  <div className="m3-horarios__notif-head">
                    <strong>{n.asunto}</strong>
                    <span className="vl-audit-entry">
                      {n.notificacionId} · {n.canal}
                    </span>
                  </div>
                  <p className="vl-text-body-sm">{n.mensaje}</p>
                  <span className="app-dato-secundario">
                    Destinatarios: {n.destinatariosIds.join(', ')} · Fecha ISO: {n.fechaEnvio}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* Diálogo Anular franja con motivo obligatorio (Dialog ConfirmWithReason) */}
      <DialogoConfirmacion
        abierto={modalAnularAbierto}
        titulo="Anular franja horaria"
        textoConfirmar="Confirmar anulación"
        textoCancelar="Volver"
        ocupado={guardando}
        alConfirmar={confirmarAnulacionFranja}
        alCancelar={() => setModalAnularAbierto(false)}
      >
        <p className="vl-text-body-sm">
          Se notificará automáticamente a profesores y estudiantes del grupo{' '}
          <strong>{horarioEditando?.nombreGrupo ?? horarioEditando?.grupoId}</strong> (Push / Email ·
          DEP-M1-05). La franja no se elimina físicamente: quedará registrada como anulada con tu
          motivo.
        </p>

        <Campo
          etiqueta="Motivo"
          id="motivo-anulacion-franja"
          obligatorio
          error={errorMotivo}
          ayuda="El botón de confirmación requiere un motivo válido."
        >
          <textarea
            id="motivo-anulacion-franja"
            className="vl-textarea"
            rows={3}
            placeholder="Describa el motivo de la anulación o cancelación de la clase…"
            value={motivoAnulacion}
            aria-invalid={Boolean(errorMotivo) || undefined}
            onChange={(e) => {
              setMotivoAnulacion(e.target.value)
              setErrorMotivo(null)
            }}
          />
        </Campo>
      </DialogoConfirmacion>
    </div>
  )
}
