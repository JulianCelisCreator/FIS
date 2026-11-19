import { useEffect, useState } from 'react'
import {
  Alerta,
  Campo,
  DialogoConfirmacion,
  Insignia,
  ListaDatos,
} from '../../../shared/ui/componentes.tsx'
import {
  inscribirOCambiarGrupoM3,
  obtenerCatalogosGruposM3,
  obtenerContextoAutogestionM3,
  obtenerEstudiantesDeGrupoM3,
} from '../services/m3-grupos.service.ts'
import {
  CATALOGOS_M3_FALLBACK,
  ETIQUETA_DIA_CORTO,
  type CatalogosConfiguracionM3,
  type ContextoAutogestionGrupoM3,
  type GrupoConfiguradoM3,
  type InscripcionEstudianteGrupoM3,
} from '../types/m3.types.ts'
import { MedidorAforo } from './medidor-aforo.tsx'
import './seleccion-cambio-grupo.css'

interface EscenarioSimulacionHU34 {
  clave: string
  etiqueta: string
  estudianteId: string
  actorRol: 'ESTUDIANTE' | 'ACUDIENTE'
  acudienteId?: string
}

const ESCENARIOS_SIMULACION_HU34: EscenarioSimulacionHU34[] = [
  {
    clave: 'acudiente-sofia',
    etiqueta: 'Acudiente · Carolina Ramírez → Sofía Ramírez (10 años · Iniciación · Habilitada)',
    estudianteId: 'EST-01',
    actorRol: 'ACUDIENTE',
    acudienteId: 'ACU-01',
  },
  {
    clave: 'estudiante-menor-sofia',
    etiqueta: 'Estudiante menor · Sofía Ramírez (10 años · Bloqueo autogestión DEP-M1-03)',
    estudianteId: 'EST-01',
    actorRol: 'ESTUDIANTE',
  },
  {
    clave: 'estudiante-mayor-juan',
    etiqueta: 'Estudiante mayor · Juan Pablo González (19 años · Intermedio · Autogestión)',
    estudianteId: 'EST-02',
    actorRol: 'ESTUDIANTE',
  },
  {
    clave: 'acudiente-sin-autorizacion',
    etiqueta: 'Acudiente sin autorización · Mateo Valderrama (9 años · Bloqueo DEP-M1-03)',
    estudianteId: 'EST-03',
    actorRol: 'ACUDIENTE',
    acudienteId: 'ACU-02',
  },
  {
    clave: 'acudiente-poliza-vencida',
    etiqueta: 'Acudiente con póliza/cartera vencida · Valentina Torres (12 años · Bloqueo DEP-M1-04 / DEP-G4-02)',
    estudianteId: 'EST-04',
    actorRol: 'ACUDIENTE',
    acudienteId: 'ACU-03',
  },
]

function formatearHorarioTarjeta(grupo: GrupoConfiguradoM3): string {
  if (grupo.horarios && grupo.horarios.length > 0) {
    const primero = grupo.horarios[0]
    const diasTexto = grupo.dias.map((d) => ETIQUETA_DIA_CORTO[d]).join(' · ')
    return `${diasTexto} ${primero.horaInicio} · ${grupo.sedeNombre}`
  }
  return `${grupo.dias.map((d) => ETIQUETA_DIA_CORTO[d]).join(' · ')} · ${grupo.sedeNombre}`
}

type Aviso = { tono: 'success' | 'warning' | 'error' | 'info'; titulo?: string; texto: string } | null

/**
 * HU-3.4: Selección y cambio de grupo por parte del usuario (Actor: Estudiante / Acudiente | RF1.4, RF2.5).
 * Catálogo filtrado por nivel (DEP-M2-03) y plan (DEP-G4-02), bloqueo explícito para menores
 * (DEP-M1-03), validación de póliza (DEP-M1-04) y cupo al 100%, confirmación explicativa con
 * liberación inmediata del cupo anterior y consulta de estudiantes por grupo (API-M3-04).
 */
export function SeleccionCambioGrupo() {
  const [catalogos, setCatalogos] = useState<CatalogosConfiguracionM3>(CATALOGOS_M3_FALLBACK)
  const [escenarioClave, setEscenarioClave] = useState<string>('acudiente-sofia')
  const [contexto, setContexto] = useState<ContextoAutogestionGrupoM3 | null>(null)
  const [filtroSede, setFiltroSede] = useState<string>('')
  const [grupoPorConfirmar, setGrupoPorConfirmar] = useState<GrupoConfiguradoM3 | null>(null)
  const [grupoConsultaApi04, setGrupoConsultaApi04] = useState<string>('GRP-01')
  const [estudiantesGrupoApi04, setEstudiantesGrupoApi04] = useState<
    InscripcionEstudianteGrupoM3[]
  >([])
  const [procesando, setProcesando] = useState(false)
  const [aviso, setAviso] = useState<Aviso>(null)

  const escenarioActual =
    ESCENARIOS_SIMULACION_HU34.find((e) => e.clave === escenarioClave) ??
    ESCENARIOS_SIMULACION_HU34[0]

  const { estudianteId, actorRol, acudienteId } = escenarioActual

  useEffect(() => {
    Promise.all([
      obtenerCatalogosGruposM3(),
      obtenerContextoAutogestionM3(estudianteId, actorRol, acudienteId),
    ]).then(([cat, ctx]) => {
      setCatalogos(cat)
      setContexto(ctx)
      if (ctx.grupoActual) {
        setGrupoConsultaApi04(ctx.grupoActual.grupoId)
      } else if (ctx.gruposElegibles[0]) {
        setGrupoConsultaApi04(ctx.gruposElegibles[0].grupoId)
      }
    })
  }, [estudianteId, actorRol, acudienteId])

  useEffect(() => {
    let activo = true
    if (!grupoConsultaApi04) return
    obtenerEstudiantesDeGrupoM3(grupoConsultaApi04).then((lista) => {
      if (!activo) return
      setEstudiantesGrupoApi04(lista)
    })
    return () => {
      activo = false
    }
  }, [grupoConsultaApi04, contexto])

  const gruposVisibles = (contexto?.gruposElegibles ?? []).filter((g) => {
    if (filtroSede && g.sedeId !== filtroSede) return false
    return true
  })

  const nivelEstudianteNombre =
    catalogos.niveles.find((n) => n.nivelId === contexto?.perfilDeportivo.nivelId)?.nombre ??
    contexto?.perfilDeportivo.nivelId ??
    'Iniciación'

  const confirmarCambioOInscripcion = async () => {
    if (!contexto || !grupoPorConfirmar) return
    setProcesando(true)
    setAviso(null)
    try {
      const resultado = await inscribirOCambiarGrupoM3({
        estudianteId: contexto.estudianteId,
        grupoDestinoId: grupoPorConfirmar.grupoId,
        actorRol: contexto.actorRol,
        acudienteId: escenarioActual.acudienteId,
      })

      const nuevoContexto = await obtenerContextoAutogestionM3(
        escenarioActual.estudianteId,
        escenarioActual.actorRol,
        escenarioActual.acudienteId,
      )
      setContexto(nuevoContexto)
      setGrupoConsultaApi04(resultado.grupoNuevo.grupoId)
      const nuevaListaApi04 = await obtenerEstudiantesDeGrupoM3(resultado.grupoNuevo.grupoId)
      setEstudiantesGrupoApi04(nuevaListaApi04)
      setGrupoPorConfirmar(null)
      setAviso({
        tono: 'success',
        titulo:
          resultado.tipoOperacion === 'CAMBIO_GRUPO'
            ? 'Cambio de grupo confirmado con liberación inmediata de cupo'
            : 'Inscripción en grupo confirmada',
        texto: resultado.mensaje,
      })
    } catch (error) {
      setGrupoPorConfirmar(null)
      setAviso({
        tono: 'error',
        titulo: 'No se pudo completar el cambio de grupo',
        texto:
          error instanceof Error
            ? error.message
            : 'El grupo no tiene cupos disponibles o no cumple las validaciones.',
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
            <span aria-current="page">Mis grupos</span>
          </nav>
          <h1>Grupos disponibles</h1>
          <p className="vl-text-body-sm">
            HU-3.4 · Consulta los grupos disponibles según tu nivel técnico (DEP-M2-03) y plan de
            pago activo (DEP-G4-02). Revalida el cupo al confirmar y libera de inmediato el cupo
            anterior.
          </p>
        </div>

        {/* Selector de contexto Estudiante / Acudiente (PlayerContextSwitcher) */}
        <div className="app-viendo-a">
          <Campo
            etiqueta="Simulador de sesión (DEP-M1-01 / DEP-M1-03)"
            id="cambio-contexto-actor"
          >
            <select
              id="cambio-contexto-actor"
              className="vl-select"
              value={escenarioClave}
              onChange={(e) => {
                setEscenarioClave(e.target.value)
                setGrupoPorConfirmar(null)
                setAviso(null)
              }}
            >
              {ESCENARIOS_SIMULACION_HU34.map((esc) => (
                <option key={esc.clave} value={esc.clave}>
                  {esc.etiqueta}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </header>

      {aviso && (
        <Alerta tono={aviso.tono} titulo={aviso.titulo}>
          <p>{aviso.texto}</p>
        </Alerta>
      )}

      {/* Banner de grupo actual y estado de validaciones externas (Wireframe HU-3.4) */}
      {contexto && (
        <Alerta
          tono="info"
          titulo={
            contexto.grupoActual
              ? `Grupo actual: ${contexto.grupoActual.nombre} (${contexto.grupoActual.ocupados}/${contexto.grupoActual.aforoMax} cupos)`
              : 'Sin grupo asignado actualmente — Selecciona un grupo disponible para inscribirte'
          }
        >
          <p>
            Patinador: <strong>{contexto.perfilDeportivo.nombreCompleto}</strong> (
            {contexto.validacionMenor.edad} años) · Nivel: <strong>{nivelEstudianteNombre}</strong>{' '}
            · Plan: <strong>{contexto.planCartera.nombrePlan}</strong> (máx.{' '}
            {contexto.planCartera.limiteClasesSemanales} días/semana)
          </p>
          <div className="m3-cambio__validaciones">
            <Insignia
              entidad="plan"
              estado={contexto.planCartera.planActivo ? 'activo' : 'inactivo'}
            />
            <Insignia
              entidad="cartera"
              estado={contexto.planCartera.alDiaEnPagos ? 'al-dia' : 'vencido'}
            />
            <Insignia
              entidad="autorizacion"
              estado={
                !contexto.validacionMenor.esMenorEdad
                  ? 'no-aplica'
                  : contexto.validacionMenor.tieneAutorizacion
                    ? 'registrada'
                    : 'pendiente'
              }
            />
            <Insignia
              entidad="perfil"
              estado={contexto.poliza.polizaVigente ? 'habilitado' : 'bloqueado'}
            />
          </div>
        </Alerta>
      )}

      {/* Bloqueo explícito con mensaje informativo para menores de edad o validaciones fallidas */}
      {contexto && !contexto.puedeGestionarCambio && (
        <Alerta
          tono="warning"
          titulo={
            contexto.validacionMenor.esMenorEdad && contexto.actorRol === 'ESTUDIANTE'
              ? 'Cambio no permitido para menores'
              : 'Inscripción o cambio bloqueado por requisitos pendientes'
          }
        >
          <p>{contexto.motivoBloqueoActor}</p>
        </Alerta>
      )}

      {/* Barra de filtros por Nivel, Plan y Sede (Wireframe HU-3.4) */}
      <form
        className="vl-filter-bar"
        role="search"
        aria-label="Filtros de catálogo de grupos elegibles"
        onSubmit={(e) => e.preventDefault()}
      >
        <Campo etiqueta="Nivel técnico (DEP-M2-03)" id="cambio-filtro-nivel">
          <input
            id="cambio-filtro-nivel"
            className="vl-input"
            type="text"
            readOnly
            value={`Nivel: ${nivelEstudianteNombre}`}
          />
        </Campo>

        <Campo etiqueta="Plan activo (DEP-G4-02)" id="cambio-filtro-plan">
          <input
            id="cambio-filtro-plan"
            className="vl-input"
            type="text"
            readOnly
            value={
              contexto
                ? `${contexto.planCartera.nombrePlan} (hasta ${contexto.planCartera.limiteClasesSemanales} días/sem)`
                : 'Mensual'
            }
          />
        </Campo>

        <Campo etiqueta="Sede" id="cambio-filtro-sede">
          <select
            id="cambio-filtro-sede"
            className="vl-select"
            value={filtroSede}
            onChange={(e) => setFiltroSede(e.target.value)}
          >
            <option value="">Todas las sedes</option>
            {catalogos.sedes.map((s) => (
              <option key={s.sedeId} value={s.sedeId}>
                {s.nombreSede}
              </option>
            ))}
          </select>
        </Campo>
      </form>

      {/* Catálogo de tarjetas de grupos elegibles (GroupCard · Wireframe HU-3.4) */}
      <section aria-label="Tarjetas de grupos elegibles">
        <div className="m3-cambio__cards">
          {gruposVisibles.map((grupo) => {
            const esGrupoActual = contexto?.grupoActual?.grupoId === grupo.grupoId
            const cupoLleno = grupo.ocupados >= grupo.aforoMax
            const deshabilitado =
              esGrupoActual || cupoLleno || !contexto?.puedeGestionarCambio

            let textoBoton = contexto?.grupoActual
              ? 'Cambiar a este grupo'
              : 'Inscribirse en este grupo'
            if (esGrupoActual) {
              textoBoton = 'Grupo actual inscrito'
            } else if (cupoLleno) {
              textoBoton = 'Sin cupos disponibles'
            } else if (!contexto?.puedeGestionarCambio) {
              textoBoton =
                contexto?.validacionMenor.esMenorEdad && contexto.actorRol === 'ESTUDIANTE'
                  ? 'Solo acudiente autorizado'
                  : 'Bloqueado por requisitos'
            }

            return (
              <article
                key={grupo.grupoId}
                aria-disabled={cupoLleno || undefined}
                className={[
                  'm3-cambio__card',
                  esGrupoActual ? 'm3-cambio__card--actual' : '',
                  cupoLleno ? 'm3-cambio__card--lleno' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="vl-stack">
                  <div className="m3-cambio__card-head">
                    <h2 className="vl-text-heading-h4">{grupo.nombre}</h2>
                    <Insignia entidad="grupo" estado={grupo.estadoCupo} />
                  </div>

                  <div className="m3-cambio__card-meta">
                    <p>{formatearHorarioTarjeta(grupo)}</p>
                    <p>
                      Entrenador: <strong>{grupo.profesorNombre ?? 'Por asignar'}</strong> ·{' '}
                      {grupo.pista}
                    </p>
                  </div>

                  <MedidorAforo
                    ocupados={grupo.ocupados}
                    aforoMax={grupo.aforoMax}
                    etiqueta={`Cupos ${grupo.nombre}`}
                    mostrarPorcentaje
                  />
                </div>

                <button
                  type="button"
                  className={`vl-button ${
                    esGrupoActual ? 'vl-button--secondary' : 'vl-button--primary'
                  }`}
                  disabled={deshabilitado}
                  aria-disabled={deshabilitado || undefined}
                  onClick={() => setGrupoPorConfirmar(grupo)}
                >
                  {textoBoton}
                </button>
              </article>
            )
          })}
        </div>
      </section>

      {/* Panel inferior: Detalle de validaciones del estudiante + API-M3-04 (Estudiantes del grupo) */}
      <div className="m3-cambio__two">
        {contexto && (
          <section className="vl-card vl-stack" aria-labelledby="titulo-ficha-elegibilidad">
            <h2 id="titulo-ficha-elegibilidad" className="vl-text-heading-h4">
              Verificación de requisitos (DEP-M1-03, DEP-M1-04, DEP-G4-02)
            </h2>
            <ListaDatos
              filas={[
                [
                  'Actor en sesión',
                  contexto.actorRol === 'ACUDIENTE'
                    ? `Acudiente (${contexto.validacionMenor.nombreAcudiente ?? contexto.actorId})`
                    : `Estudiante (${contexto.perfilDeportivo.nombreCompleto})`,
                ],
                [
                  'Menor de edad (DEP-M1-03)',
                  contexto.validacionMenor.esMenorEdad
                    ? `Sí (${contexto.validacionMenor.edad} años) · Autorización: ${
                        contexto.validacionMenor.tieneAutorizacion ? 'Activa' : 'Faltante'
                      }`
                    : `No (${contexto.validacionMenor.edad} años · Mayor de edad)`,
                ],
                [
                  'Póliza deportiva (DEP-M1-04)',
                  `${contexto.poliza.polizaVigente ? 'Vigente' : 'Vencida'} (${contexto.poliza.fechaVencimiento.slice(0, 10)})`,
                ],
                [
                  'Cartera y plan (DEP-G4-02)',
                  `${contexto.planCartera.estadoCartera} · ${contexto.planCartera.nombrePlan}`,
                ],
              ]}
            />
          </section>
        )}

        <section className="vl-card vl-stack" aria-labelledby="titulo-api-m3-04">
          <div className="m3-cambio__card-head">
            <h2 id="titulo-api-m3-04" className="vl-text-heading-h4">
              Estudiantes inscritos en grupo (API-M3-04)
            </h2>
            <select
              className="vl-select"
              style={{ width: 'auto', minHeight: '36px' }}
              aria-label="Seleccionar grupo para consultar API-M3-04"
              value={grupoConsultaApi04}
              onChange={(e) => setGrupoConsultaApi04(e.target.value)}
            >
              {(contexto?.gruposElegibles ?? []).map((g) => (
                <option key={g.grupoId} value={g.grupoId}>
                  {g.nombre} ({g.grupoId})
                </option>
              ))}
            </select>
          </div>
          <p className="vl-text-body-sm">
            Contrato expuesto <code>GET /api/v1/grupos/{grupoConsultaApi04}/estudiantes</code> para
            el Módulo 2 (Evaluaciones y asistencia).
          </p>

          <div className="vl-table-wrap">
            <table className="vl-table" aria-label="Estudiantes inscritos del grupo">
              <thead>
                <tr>
                  <th scope="col">Estudiante</th>
                  <th scope="col">Fecha inscripción (ISO 8601)</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {estudiantesGrupoApi04.length === 0 ? (
                  <tr>
                    <td colSpan={3} data-label="Resultado">
                      Sin registros individuales en memoria para este grupo.
                    </td>
                  </tr>
                ) : (
                  estudiantesGrupoApi04.map((est, idx) => (
                    <tr
                      key={`${est.estudianteId}-${est.fechaInscripcion}-${idx}`}
                      className={
                        est.estado === 'RETIRADO_CAMBIO' ? 'app-fila-anulada' : undefined
                      }
                    >
                      <td data-label="Estudiante">
                        <strong>{est.nombreEstudiante}</strong> ({est.estudianteId})
                      </td>
                      <td data-label="Fecha ISO">{est.fechaInscripcion}</td>
                      <td data-label="Estado">
                        <Insignia
                          entidad="plan"
                          estado={est.estado === 'ACTIVO' ? 'activo' : 'inactivo'}
                        />
                        <span className="app-dato-secundario">{est.estado}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Diálogo explicativo de confirmación de cambio de grupo (Wireframe HU-3.4) */}
      <DialogoConfirmacion
        abierto={Boolean(grupoPorConfirmar)}
        titulo={
          contexto?.grupoActual
            ? 'Confirmar cambio de grupo'
            : 'Confirmar inscripción en grupo'
        }
        textoConfirmar={
          contexto?.grupoActual ? 'Confirmar cambio' : 'Confirmar inscripción'
        }
        textoCancelar="Cancelar"
        ocupado={procesando}
        alConfirmar={confirmarCambioOInscripcion}
        alCancelar={() => setGrupoPorConfirmar(null)}
      >
        {contexto?.grupoActual ? (
          <p>
            <strong>{contexto.perfilDeportivo.nombreCompleto}</strong> pasará de{' '}
            <strong>{contexto.grupoActual.nombre}</strong> (
            {contexto.grupoActual.ocupados}/{contexto.grupoActual.aforoMax} →{' '}
            {Math.max(0, contexto.grupoActual.ocupados - 1)}/{contexto.grupoActual.aforoMax}) a{' '}
            <strong>{grupoPorConfirmar?.nombre}</strong> ({grupoPorConfirmar?.ocupados}/
            {grupoPorConfirmar?.aforoMax} → {(grupoPorConfirmar?.ocupados ?? 0) + 1}/
            {grupoPorConfirmar?.aforoMax}). Se revalida atómicamente el cupo destino y se libera de
            inmediato el cupo del grupo anterior.
          </p>
        ) : (
          <p>
            Se inscribirá a <strong>{contexto?.perfilDeportivo.nombreCompleto}</strong> en el grupo{' '}
            <strong>{grupoPorConfirmar?.nombre}</strong> ({grupoPorConfirmar?.ocupados}/
            {grupoPorConfirmar?.aforoMax} → {(grupoPorConfirmar?.ocupados ?? 0) + 1}/
            {grupoPorConfirmar?.aforoMax}) revalidando atómicamente la disponibilidad de cupo.
          </p>
        )}
      </DialogoConfirmacion>
    </div>
  )
}
