import { useEffect, useState, type FormEvent } from 'react'
import {
  Alerta,
  Campo,
  DialogoConfirmacion,
  Insignia,
  ListaDatos,
} from '../../../shared/ui/componentes.tsx'
import {
  actualizarEventoGlobalM3,
  anularEventoGlobalM3,
  crearEventoGlobalM3,
  obtenerCalendarioConsolidadoM3,
} from '../services/m3-grupos.service.ts'
import type {
  EventoCalendarioM3,
  RespuestaCalendarioConsolidadoM3,
  TipoEventoCalendarioM3,
} from '../types/m3.types.ts'
import './calendario-interactivo.css'

type VistaCalendario = 'mes' | 'semana' | 'dia'

interface SesionSimuladaCalendario {
  token: string
  etiqueta: string
}

const SESIONES_CALENDARIO_HU35: SesionSimuladaCalendario[] = [
  {
    token: 'mock-jwt-estudiante-menor',
    etiqueta: 'Estudiante · Sofía Ramírez · Grupo Iniciación Norte A',
  },
  {
    token: 'mock-jwt-admin',
    etiqueta: 'Administrador · Daniela Martínez (Ve todo y gestiona eventos globales)',
  },
  {
    token: 'mock-jwt-acudiente-01',
    etiqueta: 'Acudiente · Carolina Ramírez · Grupo Iniciación Norte A',
  },
  {
    token: 'mock-jwt-profesor-03',
    etiqueta: 'Profesora · Ana Gómez · Grupos Intermedio Sur B e Iniciación Sur A',
  },
  {
    token: 'mock-jwt-profesor-04',
    etiqueta: 'Profesor · Luis Rojas · Grupo Avanzado Norte C',
  },
]

// Octubre 2026 inicia en Jueves (día 1 = Jueves -> 3 celdas vacías Lun, Mar, Mié)
const CELDAS_VACIAS_INICIO_OCT_2026 = [1, 2, 3]
const DIAS_OCTUBRE_2026 = Array.from({ length: 31 }, (_, i) => i + 1)
const SEMANA_DEMO_OCTUBRE = [5, 6, 7, 8, 9, 10, 11]

function etiquetaPrefijoTipo(tipo: TipoEventoCalendarioM3): string {
  if (tipo === 'COMPETENCIA') return '🏆 '
  if (tipo === 'EVENTO_INSTITUCIONAL') return '▣ '
  return '● '
}

function nombreTipoLegible(tipo: TipoEventoCalendarioM3): string {
  if (tipo === 'COMPETENCIA') return 'Competencia oficial (DEP-M4-01)'
  if (tipo === 'EVENTO_INSTITUCIONAL') return 'Fecha institucional / Evento global'
  return 'Clase / Entrenamiento de grupo (HU-3.3)'
}

type Aviso = { tono: 'success' | 'warning' | 'error' | 'info'; titulo?: string; texto: string } | null

/**
 * HU-3.5: Visualización y administración interactiva del calendario (Actor: Todos los roles | RF2.1, RF3.3).
 * Consolida en API-M3-05 (GET /api/v1/calendario) los entrenamientos, competencias (DEP-M4-01)
 * y eventos globales del club, segmentados según rol y grupo (DEP-M1-01).
 * Vistas mensual, semanal y diaria, panel de detalle al clic y administración exclusiva para ADMIN.
 */
export function CalendarioInteractivo() {
  const [tokenSesion, setTokenSesion] = useState<string>('mock-jwt-admin')
  const [vista, setVista] = useState<VistaCalendario>('mes')
  const [filtroTipo, setFiltroTipo] = useState<TipoEventoCalendarioM3 | ''>('')
  const [diaSeleccionado, setDiaSeleccionado] = useState<number>(10)
  const [datosCalendario, setDatosCalendario] =
    useState<RespuestaCalendarioConsolidadoM3 | null>(null)
  const [eventoDetalle, setEventoDetalle] = useState<EventoCalendarioM3 | null>(null)
  const [aviso, setAviso] = useState<Aviso>(null)

  // Modal Crear / Editar evento global (exclusivo ADMIN)
  const [modalGlobalAbierto, setModalGlobalAbierto] = useState(false)
  const [editandoGlobalId, setEditandoGlobalId] = useState<string | null>(null)
  const [tituloGlobal, setTituloGlobal] = useState('')
  const [diaGlobal, setDiaGlobal] = useState('18')
  const [horaInicioGlobal, setHoraInicioGlobal] = useState('09:00')
  const [horaFinGlobal, setHoraFinGlobal] = useState('12:00')
  const [ubicacionGlobal, setUbicacionGlobal] = useState('Sede Norte · Pista 1')
  const [descripcionGlobal, setDescripcionGlobal] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    obtenerCalendarioConsolidadoM3(tokenSesion, {
      tipo: filtroTipo || undefined,
    }).then((respuesta) => {
      setDatosCalendario(respuesta)
      const torneo =
        respuesta.eventos.find((e) => e.tipo === 'COMPETENCIA') ?? respuesta.eventos[0] ?? null
      setEventoDetalle((actual) => {
        if (actual && respuesta.eventos.some((e) => e.eventoId === actual.eventoId)) {
          return respuesta.eventos.find((e) => e.eventoId === actual.eventoId) ?? torneo
        }
        return torneo
      })
    })
  }, [tokenSesion, filtroTipo])

  const esAdmin = datosCalendario?.sesion.rol === 'ADMIN'
  const eventos = datosCalendario?.eventos ?? []

  const eventosDelDia = (diaMes: number): EventoCalendarioM3[] => {
    const prefijoFecha = `2026-10-${String(diaMes).padStart(2, '0')}`
    return eventos.filter((e) => e.inicio.startsWith(prefijoFecha))
  }

  const abrirModalNuevoEventoGlobal = () => {
    setEditandoGlobalId(null)
    setTituloGlobal('')
    setDiaGlobal('18')
    setHoraInicioGlobal('09:00')
    setHoraFinGlobal('12:00')
    setUbicacionGlobal('Sede Norte · Pista 1')
    setDescripcionGlobal('')
    setModalGlobalAbierto(true)
  }

  const abrirModalEditarEventoGlobal = (ev: EventoCalendarioM3) => {
    setEditandoGlobalId(ev.eventoId)
    setTituloGlobal(ev.titulo)
    const diaExtraido = Number.parseInt(ev.inicio.slice(8, 10), 10)
    setDiaGlobal(String(Number.isInteger(diaExtraido) ? diaExtraido : 12))
    setHoraInicioGlobal(ev.inicio.slice(11, 16))
    setHoraFinGlobal(ev.fin.slice(11, 16))
    setUbicacionGlobal(ev.ubicacion)
    setDescripcionGlobal(ev.descripcion)
    setModalGlobalAbierto(true)
  }

  const guardarEventoGlobal = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!tituloGlobal.trim() || !ubicacionGlobal.trim()) {
      setAviso({
        tono: 'error',
        titulo: 'Campos obligatorios incompletos',
        texto: 'Ingrese el título y la ubicación del evento institucional global.',
      })
      return
    }
    const fechaIso = `2026-10-${String(Number.parseInt(diaGlobal, 10) || 12).padStart(2, '0')}`
    const inicioIso = `${fechaIso}T${horaInicioGlobal}:00Z`
    const finIso = `${fechaIso}T${horaFinGlobal}:00Z`

    if (inicioIso >= finIso) {
      setAviso({
        tono: 'error',
        titulo: 'Rango de horas inválido',
        texto: 'La hora de inicio debe ser anterior a la hora de finalización.',
      })
      return
    }

    setGuardando(true)
    try {
      let resultado: EventoCalendarioM3
      if (editandoGlobalId) {
        resultado = await actualizarEventoGlobalM3(tokenSesion, editandoGlobalId, {
          titulo: tituloGlobal.trim(),
          inicio: inicioIso,
          fin: finIso,
          ubicacion: ubicacionGlobal.trim(),
          descripcion: descripcionGlobal.trim(),
        })
      } else {
        resultado = await crearEventoGlobalM3(tokenSesion, {
          titulo: tituloGlobal.trim(),
          inicio: inicioIso,
          fin: finIso,
          ubicacion: ubicacionGlobal.trim(),
          descripcion: descripcionGlobal.trim(),
        })
      }

      const recargado = await obtenerCalendarioConsolidadoM3(tokenSesion, {
        tipo: filtroTipo || undefined,
      })
      setDatosCalendario(recargado)
      setEventoDetalle(resultado)
      setModalGlobalAbierto(false)
      setAviso({
        tono: 'success',
        titulo: editandoGlobalId ? 'Evento global actualizado' : 'Evento global publicado',
        texto: `El evento «${resultado.titulo}» quedó disponible en el calendario general del club (API-M3-05).`,
      })
    } catch (error) {
      setAviso({
        tono: 'error',
        titulo: 'Operación no permitida',
        texto: error instanceof Error ? error.message : 'No se pudo guardar el evento global.',
      })
    } finally {
      setGuardando(false)
    }
  }

  const manejarAnularEventoGlobal = async (ev: EventoCalendarioM3) => {
    setGuardando(true)
    try {
      await anularEventoGlobalM3(tokenSesion, ev.eventoId)
      const recargado = await obtenerCalendarioConsolidadoM3(tokenSesion, {
        tipo: filtroTipo || undefined,
      })
      setDatosCalendario(recargado)
      setEventoDetalle(recargado.eventos[0] ?? null)
      setAviso({
        tono: 'info',
        titulo: 'Evento global anulado',
        texto: `Se anuló el evento institucional «${ev.titulo}» (sin borrado físico).`,
      })
    } catch (error) {
      setAviso({
        tono: 'error',
        titulo: 'No se pudo anular el evento',
        texto: error instanceof Error ? error.message : 'Error al anular.',
      })
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
            <span aria-current="page">Calendario</span>
          </nav>
          <h1>Octubre 2026</h1>
          <p className="vl-text-body-sm">
            HU-3.5 · Calendario interactivo consolidado (API-M3-05) con entrenamientos (HU-3.3),
            competencias oficiales (DEP-M4-01) y fechas institucionales, segmentado según tu rol y
            pertenencia a grupo (DEP-M1-01).
          </p>
        </div>

        <div className="m3-cal__controles">
          {/* Conmutador de vista Mes / Semana / Día (Wireframe HU-3.5) */}
          <div className="m3-cal__segmentos" role="group" aria-label="Cambiar vista del calendario">
            <button
              type="button"
              className="m3-cal__seg-btn"
              aria-pressed={vista === 'mes'}
              onClick={() => setVista('mes')}
            >
              Mes
            </button>
            <button
              type="button"
              className="m3-cal__seg-btn"
              aria-pressed={vista === 'semana'}
              onClick={() => setVista('semana')}
            >
              Semana
            </button>
            <button
              type="button"
              className="m3-cal__seg-btn"
              aria-pressed={vista === 'dia'}
              onClick={() => setVista('dia')}
            >
              Día
            </button>
          </div>

          {/* Controles de administración visibles ÚNICAMENTE para el rol ADMIN */}
          {esAdmin && (
            <button
              type="button"
              className="vl-button vl-button--primary"
              onClick={abrirModalNuevoEventoGlobal}
            >
              + Evento global
            </button>
          )}
        </div>
      </header>

      {/* Barra de segmentación por usuario autenticado (DEP-M1-01) y leyenda de etiquetas de color */}
      <section className="vl-filter-bar" aria-label="Segmentación de calendario por rol y tipo">
        <Campo
          etiqueta="Usuario autenticado y pertenencia a grupo (DEP-M1-01)"
          id="cal-selector-sesion"
        >
          <select
            id="cal-selector-sesion"
            className="vl-select"
            value={tokenSesion}
            onChange={(e) => {
              setTokenSesion(e.target.value)
              setAviso(null)
            }}
          >
            {SESIONES_CALENDARIO_HU35.map((s) => (
              <option key={s.token} value={s.token}>
                {s.etiqueta}
              </option>
            ))}
          </select>
        </Campo>

        {vista === 'dia' && (
          <Campo etiqueta="Día de Octubre 2026" id="cal-selector-dia">
            <select
              id="cal-selector-dia"
              className="vl-select"
              value={diaSeleccionado}
              onChange={(e) => setDiaSeleccionado(Number(e.target.value))}
            >
              {DIAS_OCTUBRE_2026.map((d) => (
                <option key={d} value={d}>
                  {d} de octubre de 2026 ({eventosDelDia(d).length} eventos)
                </option>
              ))}
            </select>
          </Campo>
        )}

        <div className="vl-field">
          <span className="vl-field__label">Etiquetas por tipo de actividad</span>
          <div className="m3-cal__leyenda">
            <button
              type="button"
              className={`m3-cal__tag m3-cal__tag--clase ${filtroTipo === '' ? 'm3-cal__tag--activo' : ''}`}
              onClick={() => setFiltroTipo('')}
            >
              Todas ({eventos.length})
            </button>
            <button
              type="button"
              className={`m3-cal__tag m3-cal__tag--clase ${
                filtroTipo === 'ENTRENAMIENTO' ? 'm3-cal__tag--activo' : ''
              }`}
              onClick={() =>
                setFiltroTipo((prev) => (prev === 'ENTRENAMIENTO' ? '' : 'ENTRENAMIENTO'))
              }
            >
              ● Clase
            </button>
            <button
              type="button"
              className={`m3-cal__tag m3-cal__tag--comp ${
                filtroTipo === 'COMPETENCIA' ? 'm3-cal__tag--activo' : ''
              }`}
              onClick={() =>
                setFiltroTipo((prev) => (prev === 'COMPETENCIA' ? '' : 'COMPETENCIA'))
              }
            >
              🏆 Competencia
            </button>
            <button
              type="button"
              className={`m3-cal__tag m3-cal__tag--inst ${
                filtroTipo === 'EVENTO_INSTITUCIONAL' ? 'm3-cal__tag--activo' : ''
              }`}
              onClick={() =>
                setFiltroTipo((prev) =>
                  prev === 'EVENTO_INSTITUCIONAL' ? '' : 'EVENTO_INSTITUCIONAL',
                )
              }
            >
              ▣ Fecha institucional
            </button>
          </div>
        </div>
      </section>

      {aviso && (
        <Alerta tono={aviso.tono} titulo={aviso.titulo}>
          <p>{aviso.texto}</p>
        </Alerta>
      )}

      {/* Grilla 2fr 1fr: Calendario interactivo a la izquierda + Tarjeta de detalle al hacer clic a la derecha */}
      <div className="m3-cal__layout">
        <div>
          {vista === 'mes' && (
            <div className="m3-cal__mes-wrap">
              <div className="m3-cal__mes-grid" role="grid" aria-label="Calendario mensual Octubre 2026">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                  <div key={d} className="m3-cal__mes-head">
                    {d}
                  </div>
                ))}

                {CELDAS_VACIAS_INICIO_OCT_2026.map((n) => (
                  <div
                    key={`vacia-${n}`}
                    className="m3-cal__dia-celda m3-cal__dia-celda--vacia"
                    aria-hidden="true"
                  />
                ))}

                {DIAS_OCTUBRE_2026.map((dia) => {
                  const listaDia = eventosDelDia(dia)
                  return (
                    <div
                      key={dia}
                      className={`m3-cal__dia-celda ${
                        dia === 5 || dia === 10 ? 'm3-cal__dia-celda--hoy' : ''
                      }`}
                    >
                      <span className="m3-cal__dia-num">{dia}</span>
                      {listaDia.map((ev) => {
                        const horaCorta = ev.inicio.slice(11, 16)
                        const seleccionado = eventoDetalle?.eventoId === ev.eventoId
                        return (
                          <button
                            key={ev.eventoId}
                            type="button"
                            className={`m3-cal__pill m3-cal__pill--${ev.tipo} ${
                              seleccionado ? 'm3-cal__pill--activo' : ''
                            }`}
                            onClick={() => {
                              setEventoDetalle(ev)
                              setDiaSeleccionado(dia)
                            }}
                          >
                            {etiquetaPrefijoTipo(ev.tipo)}
                            {ev.tipo === 'ENTRENAMIENTO'
                              ? `Clase ${horaCorta}`
                              : ev.titulo.slice(0, 22)}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {vista === 'semana' && (
            <section className="vl-card vl-stack" aria-label="Vista semanal del calendario">
              <h2 className="vl-text-heading-h4">Semana del 5 al 11 de octubre de 2026</h2>
              <ul className="m3-cal__agenda-lista">
                {SEMANA_DEMO_OCTUBRE.map((dia) => {
                  const lista = eventosDelDia(dia)
                  return (
                    <li key={dia} className="vl-stack">
                      <p className="vl-text-label">Día {dia} de octubre de 2026</p>
                      {lista.length === 0 ? (
                        <p className="vl-text-caption">Sin actividades programadas para tu grupo.</p>
                      ) : (
                        lista.map((ev) => (
                          <div
                            key={ev.eventoId}
                            className="m3-cal__agenda-card"
                            onClick={() => setEventoDetalle(ev)}
                          >
                            <div>
                              <strong>
                                {etiquetaPrefijoTipo(ev.tipo)}
                                {ev.titulo}
                              </strong>
                              <span className="app-dato-secundario">
                                {ev.inicio.slice(11, 16)}–{ev.fin.slice(11, 16)} · {ev.ubicacion}
                              </span>
                            </div>
                            <Insignia entidad="competencia" estado="programada" />
                          </div>
                        ))
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {vista === 'dia' && (
            <section className="vl-card vl-stack" aria-label="Vista diaria del calendario">
              <h2 className="vl-text-heading-h4">
                Agenda del {diaSeleccionado} de octubre de 2026
              </h2>
              {eventosDelDia(diaSeleccionado).length === 0 ? (
                <p className="vl-text-body-sm">
                  No hay actividades programadas en esta fecha para tu perfil.
                </p>
              ) : (
                <ul className="m3-cal__agenda-lista">
                  {eventosDelDia(diaSeleccionado).map((ev) => (
                    <li
                      key={ev.eventoId}
                      className="m3-cal__agenda-card"
                      onClick={() => setEventoDetalle(ev)}
                    >
                      <div>
                        <strong>
                          {etiquetaPrefijoTipo(ev.tipo)}
                          {ev.titulo}
                        </strong>
                        <span className="app-dato-secundario">
                          {ev.inicio.slice(11, 16)}–{ev.fin.slice(11, 16)} · {ev.ubicacion}
                        </span>
                      </div>
                      <Insignia entidad="competencia" estado="programada" />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        {/* Panel de detalle del evento al hacer clic (Wireframe HU-3.5) */}
        <aside className="vl-card vl-stack" aria-labelledby="titulo-detalle-evento">
          {eventoDetalle ? (
            <>
              <div className="m3-cal__controles">
                <h2 id="titulo-detalle-evento" className="vl-text-heading-h4">
                  {eventoDetalle.titulo}
                </h2>
                <Insignia entidad="competencia" estado="programada" />
              </div>

              <ListaDatos
                filas={[
                  ['ID Evento (API-M3-05)', eventoDetalle.eventoId],
                  ['Tipo de actividad', nombreTipoLegible(eventoDetalle.tipo)],
                  [
                    'Fecha y horario',
                    `${eventoDetalle.inicio.slice(0, 10)} · ${eventoDetalle.inicio.slice(
                      11,
                      16,
                    )} a ${eventoDetalle.fin.slice(11, 16)}`,
                  ],
                  ['Inicio / Fin ISO 8601', `${eventoDetalle.inicio} / ${eventoDetalle.fin}`],
                  ['Ubicación / Sede', eventoDetalle.ubicacion],
                  ['Grupos / Categorías', eventoDetalle.nombreGrupo ?? 'General del club'],
                ]}
              />

              <p className="vl-text-body-sm">{eventoDetalle.descripcion}</p>

              <div className="app-actions" style={{ justifyContent: 'flex-start' }}>
                {esAdmin && eventoDetalle.tipo === 'EVENTO_INSTITUCIONAL' && (
                  <>
                    <button
                      type="button"
                      className="vl-button vl-button--primary vl-button--sm"
                      onClick={() => abrirModalEditarEventoGlobal(eventoDetalle)}
                    >
                      Editar evento
                    </button>
                    <button
                      type="button"
                      className="vl-button vl-button--secondary vl-button--sm"
                      disabled={guardando}
                      onClick={() => void manejarAnularEventoGlobal(eventoDetalle)}
                    >
                      Anular evento
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="vl-button vl-button--secondary vl-button--sm"
                  onClick={() => setEventoDetalle(null)}
                >
                  Cerrar
                </button>
              </div>
            </>
          ) : (
            <div className="vl-stack">
              <h2 id="titulo-detalle-evento" className="vl-text-heading-h4">
                Detalle de actividad
              </h2>
              <p className="vl-text-body-sm">
                Haz clic sobre cualquier entrenamiento, competencia o fecha institucional en el
                calendario para inspeccionar su horario, ubicación y grupos convocados.
              </p>
            </div>
          )}

          {datosCalendario && (
            <div className="vl-stack" style={{ borderTop: '1px solid var(--line)', paddingTop: '0.85rem' }}>
              <p className="vl-text-caption">
                Segmentación activa ({datosCalendario.sesion.rol}):{' '}
                <strong>{datosCalendario.sesion.nombreCompleto}</strong> · Grupos visibles:{' '}
                <code>{datosCalendario.sesion.gruposAsociadosIds.join(', ')}</code>
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Modal de administración de Evento Global (exclusivo ADMIN) */}
      <DialogoConfirmacion
        abierto={modalGlobalAbierto}
        variante="form"
        titulo={
          editandoGlobalId
            ? `Editar evento global (${editandoGlobalId})`
            : 'Nuevo evento institucional global (Solo ADMIN)'
        }
        textoConfirmar={editandoGlobalId ? 'Guardar cambios' : 'Publicar evento global'}
        textoCancelar="Cancelar"
        ocupado={guardando}
        alConfirmar={() => void guardarEventoGlobal()}
        alCancelar={() => setModalGlobalAbierto(false)}
      >
        <Campo etiqueta="Título del evento global" id="global-titulo" obligatorio>
          <input
            id="global-titulo"
            className="vl-input"
            type="text"
            placeholder="Ej. Clínica Nacional de Velocidad"
            value={tituloGlobal}
            onChange={(e) => setTituloGlobal(e.target.value)}
          />
        </Campo>

        <Campo etiqueta="Día (Octubre 2026)" id="global-dia" obligatorio>
          <select
            id="global-dia"
            className="vl-select"
            value={diaGlobal}
            onChange={(e) => setDiaGlobal(e.target.value)}
          >
            {DIAS_OCTUBRE_2026.map((d) => (
              <option key={d} value={String(d)}>
                {d} de octubre de 2026
              </option>
            ))}
          </select>
        </Campo>

        <div className="m3-horarios__form-grid">
          <Campo etiqueta="Hora inicio" id="global-inicio" obligatorio>
            <input
              id="global-inicio"
              className="vl-input vl-input--numeric"
              type="text"
              value={horaInicioGlobal}
              onChange={(e) => setHoraInicioGlobal(e.target.value)}
            />
          </Campo>

          <Campo etiqueta="Hora fin" id="global-fin" obligatorio>
            <input
              id="global-fin"
              className="vl-input vl-input--numeric"
              type="text"
              value={horaFinGlobal}
              onChange={(e) => setHoraFinGlobal(e.target.value)}
            />
          </Campo>
        </div>

        <Campo etiqueta="Ubicación / Sede" id="global-ubicacion" obligatorio>
          <input
            id="global-ubicacion"
            className="vl-input"
            type="text"
            placeholder="Ej. Sede Norte · Pista 1"
            value={ubicacionGlobal}
            onChange={(e) => setUbicacionGlobal(e.target.value)}
          />
        </Campo>

        <Campo etiqueta="Descripción" id="global-descripcion">
          <textarea
            id="global-descripcion"
            className="vl-textarea"
            rows={3}
            placeholder="Detalles e indicaciones para los deportistas y entrenadores…"
            value={descripcionGlobal}
            onChange={(e) => setDescripcionGlobal(e.target.value)}
          />
        </Campo>
      </DialogoConfirmacion>
    </div>
  )
}
