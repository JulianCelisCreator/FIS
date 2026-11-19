import { pedir } from '../../../shared/services/cliente-api.ts'
import {
  CATALOGOS_M3_FALLBACK,
  GRUPOS_M3_FALLBACK,
  PROFESORES_BASE_FALLBACK,
  type CatalogosConfiguracionM3,
  type ContextoAutogestionGrupoM3,
  type CrearGrupoM3Payload,
  type DiaSemanaM3,
  type EstadoCupoGrupoM3,
  type EvaluacionDisponibilidadProfesorM3,
  type EventoCalendarioM3,
  type GrupoAsignadoProfesorM3,
  type GrupoConfiguradoM3,
  type HorarioGrupoM3,
  type InscripcionEstudianteGrupoM3,
  type RegistroNotificacionM1,
  type RespuestaCalendarioConsolidadoM3,
  type RespuestaOperacionHorarioM3,
  type ResultadoCambioGrupoM3,
  type RolExternoM1,
} from '../types/m3.types.ts'

let gruposMemoriaLocal: GrupoConfiguradoM3[] = [...GRUPOS_M3_FALLBACK]
let notificacionesMemoriaLocal: RegistroNotificacionM1[] = [
  {
    notificacionId: 'NOTIF-001',
    destinatariosIds: ['PROF-01', 'EST-01'],
    asunto: 'Apertura de programación de entrenamientos M3',
    mensaje:
      'Se encuentran publicados los horarios oficiales de entrenamiento para la sede Norte y Sur.',
    canal: 'EMAIL_PUSH',
    fechaEnvio: '2026-10-01T08:00:00Z',
    estadoEnvio: 'ENVIADO',
  },
]
let inscripcionesMemoriaLocal: InscripcionEstudianteGrupoM3[] = [
  {
    estudianteId: 'EST-01',
    nombreEstudiante: 'Sofía Ramírez',
    grupoId: 'GRP-01',
    nombreGrupo: 'Iniciación Norte A',
    fechaInscripcion: '2026-09-23T14:00:00Z',
    estado: 'ACTIVO',
  },
  {
    estudianteId: 'EST-03',
    nombreEstudiante: 'Mateo Valderrama',
    grupoId: 'GRP-01',
    nombreGrupo: 'Iniciación Norte A',
    fechaInscripcion: '2026-09-25T10:30:00Z',
    estado: 'ACTIVO',
  },
  {
    estudianteId: 'EST-04',
    nombreEstudiante: 'Valentina Torres',
    grupoId: 'GRP-04',
    nombreGrupo: 'Iniciación Norte B',
    fechaInscripcion: '2026-09-26T09:15:00Z',
    estado: 'ACTIVO',
  },
]

let eventosGlobalesMemoriaLocal: EventoCalendarioM3[] = [
  {
    eventoId: 'EVT-INST-01',
    tipo: 'EVENTO_INSTITUCIONAL',
    titulo: 'Festivo · Jornada Institucional de Mantenimiento',
    inicio: '2026-10-12T08:00:00Z',
    fin: '2026-10-12T18:00:00Z',
    ubicacion: 'Todas las sedes (Norte, Sur y El Salitre)',
    sedeId: 'SEDE-NORTE-P1',
    grupoId: null,
    nombreGrupo: 'Todos los grupos del club',
    categorias: ['Todas las categorías'],
    descripcion:
      'Fecha institucional de cierre de pistas por día festivo y revisión de seguridad.',
    estado: 'PROGRAMADO',
    editablePorAdmin: true,
  },
  {
    eventoId: 'EVT-INST-02',
    tipo: 'EVENTO_INSTITUCIONAL',
    titulo: 'Reunión General de Acudientes y Entrega de Uniformes',
    inicio: '2026-10-15T17:00:00Z',
    fin: '2026-10-15T19:00:00Z',
    ubicacion: 'Auditorio Principal · Sede Norte',
    sedeId: 'SEDE-NORTE-P1',
    grupoId: null,
    nombreGrupo: 'Todos los grupos del club',
    categorias: ['Todas las categorías'],
    descripcion:
      'Socialización del reglamento técnico de competencias y entrega de indumentaria.',
    estado: 'PROGRAMADO',
    editablePorAdmin: true,
  },
]

function recalcularGrupoLocal(
  ocupados: number,
  aforoMax: number,
  activo: boolean,
): {
  alerta90: boolean
  estadoCupo: EstadoCupoGrupoM3
  porcentajeOcupacion: number
  bloqueadoInscripcion: boolean
} {
  const alerta90 = ocupados * 100 >= aforoMax * 90
  const lleno = ocupados >= aforoMax
  const estadoCupo: EstadoCupoGrupoM3 = lleno ? 'lleno' : alerta90 ? 'alerta-90' : 'con-cupo'
  const porcentajeOcupacion = Math.min(100, Math.round((ocupados * 100) / aforoMax))
  return {
    alerta90,
    estadoCupo,
    porcentajeOcupacion,
    bloqueadoInscripcion: lleno || !activo,
  }
}

export async function listarGruposM3(): Promise<GrupoConfiguradoM3[]> {
  try {
    const lista = await pedir<GrupoConfiguradoM3[]>('/v1/grupos')
    gruposMemoriaLocal = lista
    return lista
  } catch {
    return gruposMemoriaLocal
  }
}

export async function obtenerCatalogosGruposM3(): Promise<CatalogosConfiguracionM3> {
  try {
    return await pedir<CatalogosConfiguracionM3>('/v1/grupos/catalogos')
  } catch {
    return CATALOGOS_M3_FALLBACK
  }
}

export async function crearGrupoM3(payload: CrearGrupoM3Payload): Promise<GrupoConfiguradoM3> {
  try {
    const creado = await pedir<GrupoConfiguradoM3>('/v1/grupos', {
      metodo: 'POST',
      cuerpo: payload,
    })
    gruposMemoriaLocal = [...gruposMemoriaLocal, creado]
    return creado
  } catch (error) {
    if (error instanceof Error && error.message && !error.message.includes('No hay conexión')) {
      throw error
    }
    const nivel =
      CATALOGOS_M3_FALLBACK.niveles.find((n) => n.nivelId === payload.nivelId) ??
      CATALOGOS_M3_FALLBACK.niveles[0]
    const categoria =
      CATALOGOS_M3_FALLBACK.categorias.find((c) => c.categoriaId === payload.categoriaId) ??
      CATALOGOS_M3_FALLBACK.categorias[0]
    const sede =
      CATALOGOS_M3_FALLBACK.sedes.find((s) => s.sedeId === payload.sedeId) ??
      CATALOGOS_M3_FALLBACK.sedes[0]

    if (payload.aforoMax > sede.aforoMaximoFisico) {
      throw new Error(
        `El cupo máximo (${payload.aforoMax}) excede la capacidad física máxima de la sede ${sede.nombreSede} (${sede.aforoMaximoFisico} patinadores según DEP-G4-01).`,
      )
    }

    const ocupados = payload.ocupados ?? 0
    const metricas = recalcularGrupoLocal(ocupados, payload.aforoMax, true)
    const id = `GRP-${String(gruposMemoriaLocal.length + 1).padStart(2, '0')}`
    const nuevo: GrupoConfiguradoM3 = {
      grupoId: id,
      id,
      nombre: payload.nombre.trim(),
      nivelId: nivel.nivelId,
      nivelNombre: nivel.nombre,
      categoriaId: categoria.categoriaId,
      categoriaNombre: categoria.nombre,
      sedeId: sede.sedeId,
      sedeNombre: sede.nombreSede,
      pista: sede.pista,
      aforoMaximoFisicoSede: sede.aforoMaximoFisico,
      dias: payload.dias,
      aforoMax: payload.aforoMax,
      cupoMaximo: payload.aforoMax,
      ocupados,
      inscritosActuales: ocupados,
      porcentajeOcupacion: metricas.porcentajeOcupacion,
      alerta90: metricas.alerta90,
      estadoCupo: metricas.estadoCupo,
      bloqueadoInscripcion: metricas.bloqueadoInscripcion,
      profesorId: null,
      profesorNombre: null,
      profesoresAsignados: [],
      horarios: [],
      activo: true,
    }
    gruposMemoriaLocal = [...gruposMemoriaLocal, nuevo]
    return nuevo
  }
}

export async function actualizarGrupoM3(
  grupoId: string,
  payload: Partial<CrearGrupoM3Payload>,
): Promise<GrupoConfiguradoM3> {
  try {
    return await pedir<GrupoConfiguradoM3>(`/v1/grupos/${grupoId}`, {
      metodo: 'PATCH',
      cuerpo: payload,
    })
  } catch (error) {
    if (error instanceof Error && error.message && !error.message.includes('No hay conexión')) {
      throw error
    }
    const existente = gruposMemoriaLocal.find((g) => g.grupoId === grupoId)
    if (!existente) throw new Error('El grupo no existe.')
    const sede =
      CATALOGOS_M3_FALLBACK.sedes.find((s) => s.sedeId === (payload.sedeId ?? existente.sedeId)) ??
      CATALOGOS_M3_FALLBACK.sedes[0]
    const nivel =
      CATALOGOS_M3_FALLBACK.niveles.find((n) => n.nivelId === (payload.nivelId ?? existente.nivelId)) ??
      CATALOGOS_M3_FALLBACK.niveles[0]
    const categoria =
      CATALOGOS_M3_FALLBACK.categorias.find(
        (c) => c.categoriaId === (payload.categoriaId ?? existente.categoriaId),
      ) ?? CATALOGOS_M3_FALLBACK.categorias[0]
    const aforoMax = payload.aforoMax ?? existente.aforoMax
    const ocupados = payload.ocupados ?? existente.ocupados
    if (aforoMax > sede.aforoMaximoFisico) {
      throw new Error(
        `El cupo máximo (${aforoMax}) excede la capacidad física máxima de la sede ${sede.nombreSede} (${sede.aforoMaximoFisico} patinadores según DEP-G4-01).`,
      )
    }
    const metricas = recalcularGrupoLocal(ocupados, aforoMax, existente.activo)
    const actualizado: GrupoConfiguradoM3 = {
      ...existente,
      nombre: payload.nombre?.trim() ?? existente.nombre,
      nivelId: nivel.nivelId,
      nivelNombre: nivel.nombre,
      categoriaId: categoria.categoriaId,
      categoriaNombre: categoria.nombre,
      sedeId: sede.sedeId,
      sedeNombre: sede.nombreSede,
      pista: sede.pista,
      aforoMaximoFisicoSede: sede.aforoMaximoFisico,
      dias: payload.dias ?? existente.dias,
      aforoMax,
      cupoMaximo: aforoMax,
      ocupados,
      inscritosActuales: ocupados,
      ...metricas,
    }
    gruposMemoriaLocal = gruposMemoriaLocal.map((g) => (g.grupoId === grupoId ? actualizado : g))
    return actualizado
  }
}

export async function cambiarEstadoGrupoM3(
  grupoId: string,
  activo: boolean,
): Promise<GrupoConfiguradoM3> {
  try {
    return await pedir<GrupoConfiguradoM3>(`/v1/grupos/${grupoId}/estado`, {
      metodo: 'PATCH',
      cuerpo: { activo },
    })
  } catch {
    gruposMemoriaLocal = gruposMemoriaLocal.map((g) => {
      if (g.grupoId !== grupoId) return g
      const metricas = recalcularGrupoLocal(g.ocupados, g.aforoMax, activo)
      return { ...g, activo, ...metricas }
    })
    const modificado = gruposMemoriaLocal.find((g) => g.grupoId === grupoId)
    if (!modificado) throw new Error('Grupo no encontrado')
    return modificado
  }
}

export async function inscribirEnGrupoM3(grupoId: string): Promise<GrupoConfiguradoM3> {
  try {
    return await pedir<GrupoConfiguradoM3>(`/v1/grupos/${grupoId}/inscribir`, {
      metodo: 'POST',
    })
  } catch (error) {
    if (error instanceof Error && error.message && !error.message.includes('No hay conexión')) {
      throw error
    }
    const grupo = gruposMemoriaLocal.find((g) => g.grupoId === grupoId)
    if (!grupo) throw new Error('El grupo no existe.')
    if (grupo.ocupados >= grupo.aforoMax) {
      throw new Error('No hay cupos disponibles: el grupo ha alcanzado el 100 % de su capacidad.')
    }
    const nuevosOcupados = grupo.ocupados + 1
    const metricas = recalcularGrupoLocal(nuevosOcupados, grupo.aforoMax, grupo.activo)
    const actualizado: GrupoConfiguradoM3 = {
      ...grupo,
      ocupados: nuevosOcupados,
      inscritosActuales: nuevosOcupados,
      ...metricas,
    }
    gruposMemoriaLocal = gruposMemoriaLocal.map((g) => (g.grupoId === grupoId ? actualizado : g))
    return actualizado
  }
}

// ============================================================================
// HU-3.2: SERVICIOS DE ASIGNACIÓN DE PROFESORES Y API-M3-02
// ============================================================================

function obtenerGruposLocalPorProfesor(profesorId: string): GrupoAsignadoProfesorM3[] {
  const resultado: GrupoAsignadoProfesorM3[] = []
  for (const g of gruposMemoriaLocal) {
    if (!g.activo) continue
    const asig = g.profesoresAsignados?.find((p) => p.profesorId === profesorId)
    if (asig || g.profesorId === profesorId) {
      resultado.push({
        grupoId: g.grupoId,
        nombreGrupo: g.nombre,
        rolDocente: asig?.rolDocente ?? 'TITULAR',
        sedeNombre: g.sedeNombre,
        nivelNombre: g.nivelNombre,
        horarios: (g.horarios ?? []).filter((h) => h.estado !== 'CANCELADO'),
      })
    }
  }
  return resultado
}

function evaluarConflictoLocal(grupoId: string, profesorId: string): string | null {
  const grupo = gruposMemoriaLocal.find((g) => g.grupoId === grupoId)
  if (!grupo) return null
  const prof = PROFESORES_BASE_FALLBACK.find((p) => p.profesorId === profesorId)
  if (!prof) return null

  for (const h of (grupo.horarios ?? []).filter((item) => item.estado !== 'CANCELADO')) {
    const ext = prof.bloquesOcupadosExternos.find(
      (b) => b.diaSemana === h.dia && h.horaInicio < b.horaFin && h.horaFin > b.horaInicio,
    )
    if (ext) {
      return `${prof.nombreCompleto} ya tiene clase programada los ${h.dia.toLowerCase()} a las ${ext.horaInicio} (${ext.motivo}). Seleccione otro docente o franja.`
    }
  }

  for (const otro of gruposMemoriaLocal) {
    if (!otro.activo || otro.grupoId === grupo.grupoId) continue
    const pertenece =
      otro.profesorId === profesorId ||
      Boolean(otro.profesoresAsignados?.some((p) => p.profesorId === profesorId))
    if (!pertenece) continue
    for (const hActual of (grupo.horarios ?? []).filter((item) => item.estado !== 'CANCELADO')) {
      const cruce = (otro.horarios ?? [])
        .filter((item) => item.estado !== 'CANCELADO')
        .find(
          (hOtro) =>
            hOtro.dia === hActual.dia &&
            hActual.horaInicio < hOtro.horaFin &&
            hActual.horaFin > hOtro.horaInicio,
        )
      if (cruce) {
        return `El profesor ${prof.nombreCompleto} ya tiene clase asignada en «${otro.nombre}» el ${hActual.dia} de ${cruce.horaInicio} a ${cruce.horaFin}. Seleccione otro docente o franja.`
      }
    }
  }
  return null
}

export async function listarProfesoresConDisponibilidadM3(
  grupoId?: string,
): Promise<EvaluacionDisponibilidadProfesorM3[]> {
  try {
    return await pedir<EvaluacionDisponibilidadProfesorM3[]>('/v1/profesores', {
      consulta: { grupoId },
    })
  } catch {
    const grupo = gruposMemoriaLocal.find((g) => g.grupoId === grupoId)
    return PROFESORES_BASE_FALLBACK.map((p) => {
      const detalleConflicto = grupoId ? evaluarConflictoLocal(grupoId, p.profesorId) : null
      const yaAsignadoAlGrupo = grupo
        ? grupo.profesorId === p.profesorId ||
          Boolean(grupo.profesoresAsignados?.some((a) => a.profesorId === p.profesorId))
        : false
      return {
        profesorId: p.profesorId,
        nombreCompleto: p.nombreCompleto,
        especialidad: p.especialidad,
        cargo: p.cargo,
        estadoContrato: p.estadoContrato,
        disponible: detalleConflicto === null,
        tieneConflicto: detalleConflicto !== null,
        yaAsignadoAlGrupo,
        detalleConflicto,
        gruposAsignados: obtenerGruposLocalPorProfesor(p.profesorId),
      }
    })
  }
}

export async function obtenerGruposPorProfesorM3(
  profesorId: string,
): Promise<GrupoAsignadoProfesorM3[]> {
  try {
    return await pedir<GrupoAsignadoProfesorM3[]>(`/v1/profesores/${profesorId}/grupos`)
  } catch {
    return obtenerGruposLocalPorProfesor(profesorId)
  }
}

export async function asignarProfesoresAGrupoM3(
  grupoId: string,
  profesoresIds: string[],
): Promise<GrupoConfiguradoM3> {
  try {
    const actualizado = await pedir<GrupoConfiguradoM3>(`/v1/grupos/${grupoId}/profesores`, {
      metodo: 'POST',
      cuerpo: { profesoresIds },
    })
    gruposMemoriaLocal = gruposMemoriaLocal.map((g) =>
      g.grupoId === grupoId ? actualizado : g,
    )
    return actualizado
  } catch (error) {
    if (error instanceof Error && error.message && !error.message.includes('No hay conexión')) {
      throw error
    }
    const grupo = gruposMemoriaLocal.find((g) => g.grupoId === grupoId)
    if (!grupo) throw new Error('Grupo no encontrado.')
    for (const pid of profesoresIds) {
      const conflicto = evaluarConflictoLocal(grupoId, pid)
      if (conflicto) throw new Error(conflicto)
    }
    const asignados = [...(grupo.profesoresAsignados ?? [])]
    for (const pid of profesoresIds) {
      const prof = PROFESORES_BASE_FALLBACK.find((p) => p.profesorId === pid)
      if (prof && !asignados.some((a) => a.profesorId === pid)) {
        asignados.push({
          profesorId: prof.profesorId,
          nombreCompleto: prof.nombreCompleto,
          rolDocente: asignados.length === 0 ? 'TITULAR' : 'ASISTENTE',
          fechaAsignacion: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        })
      }
    }
    const actualizado: GrupoConfiguradoM3 = {
      ...grupo,
      profesorId: asignados[0]?.profesorId ?? null,
      profesorNombre: asignados[0]?.nombreCompleto ?? null,
      profesoresAsignados: asignados,
    }
    gruposMemoriaLocal = gruposMemoriaLocal.map((g) =>
      g.grupoId === grupoId ? actualizado : g,
    )
    return actualizado
  }
}

export async function quitarProfesorDeGrupoM3(
  grupoId: string,
  profesorId: string,
): Promise<GrupoConfiguradoM3> {
  try {
    const respuesta = await fetch(`/api/v1/grupos/${grupoId}/profesores/${profesorId}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    })
    if (!respuesta.ok) {
      const err = (await respuesta.json().catch(() => null)) as { message?: string } | null
      throw new Error(err?.message ?? 'No se pudo quitar al profesor del grupo.')
    }
    const actualizado = (await respuesta.json()) as GrupoConfiguradoM3
    gruposMemoriaLocal = gruposMemoriaLocal.map((g) =>
      g.grupoId === grupoId ? actualizado : g,
    )
    return actualizado
  } catch (error) {
    if (error instanceof Error && error.message && !error.message.includes('Failed to fetch')) {
      const grupo = gruposMemoriaLocal.find((g) => g.grupoId === grupoId)
      if (!grupo) throw error
    }
    const grupo = gruposMemoriaLocal.find((g) => g.grupoId === grupoId)
    if (!grupo) throw new Error('Grupo no encontrado.')
    const asignados = (grupo.profesoresAsignados ?? []).filter((a) => a.profesorId !== profesorId)
    if (asignados.length > 0 && !asignados.some((a) => a.rolDocente === 'TITULAR')) {
      asignados[0].rolDocente = 'TITULAR'
    }
    const actualizado: GrupoConfiguradoM3 = {
      ...grupo,
      profesorId: asignados[0]?.profesorId ?? null,
      profesorNombre: asignados[0]?.nombreCompleto ?? null,
      profesoresAsignados: asignados,
    }
    gruposMemoriaLocal = gruposMemoriaLocal.map((g) =>
      g.grupoId === grupoId ? actualizado : g,
    )
    return actualizado
  }
}

// ============================================================================
// HU-3.3: PROGRAMACIÓN DE HORARIOS, ANTI-SOLAPAMIENTO Y NOTIFICACIONES DEP-M1-05
// ============================================================================

export async function listarHorariosM3(filtros?: {
  grupoId?: string
  sedeId?: string
  incluirCancelados?: boolean
}): Promise<HorarioGrupoM3[]> {
  try {
    return await pedir<HorarioGrupoM3[]>('/v1/horarios', {
      consulta: {
        grupoId: filtros?.grupoId || undefined,
        sedeId: filtros?.sedeId || undefined,
        incluirCancelados: filtros?.incluirCancelados ? 'true' : undefined,
      },
    })
  } catch {
    const lista: HorarioGrupoM3[] = []
    for (const g of gruposMemoriaLocal) {
      if (filtros?.grupoId && g.grupoId !== filtros.grupoId) continue
      for (const h of g.horarios ?? []) {
        const sedeIdH = h.sedeId ?? g.sedeId
        if (filtros?.sedeId && sedeIdH !== filtros.sedeId) continue
        if (!filtros?.incluirCancelados && h.estado === 'CANCELADO') continue
        lista.push({
          ...h,
          horarioId: h.horarioId ?? h.id,
          grupoId: g.grupoId,
          nombreGrupo: g.nombre,
          nivelNombre: g.nivelNombre,
          diaSemana: h.diaSemana ?? h.dia,
          sedeId: sedeIdH,
          sedeNombre: h.sedeNombre ?? g.sedeNombre,
          estado: h.estado ?? 'ACTIVO',
        })
      }
    }
    return lista
  }
}

export async function listarNotificacionesHorariosM3(): Promise<RegistroNotificacionM1[]> {
  try {
    return await pedir<RegistroNotificacionM1[]>('/v1/horarios/notificaciones')
  } catch {
    return notificacionesMemoriaLocal
  }
}

function validarCrucePistaLocal(params: {
  grupoId: string
  dia: DiaSemanaM3
  horaInicio: string
  horaFin: string
  sedeId: string
  pista: string
  excluirHorarioId?: string
}) {
  if (params.horaInicio >= params.horaFin) {
    throw new Error('La hora de inicio debe ser anterior a la hora de finalización.')
  }
  const grupoActual = gruposMemoriaLocal.find((g) => g.grupoId === params.grupoId)
  if (!grupoActual) throw new Error('Grupo no encontrado.')

  for (const h of grupoActual.horarios ?? []) {
    if (h.estado === 'CANCELADO') continue
    if (h.id === params.excluirHorarioId || h.horarioId === params.excluirHorarioId) continue
    if (
      h.dia === params.dia &&
      params.horaInicio < h.horaFin &&
      params.horaFin > h.horaInicio
    ) {
      throw new Error(
        `El grupo «${grupoActual.nombre}» ya tiene entrenamiento el ${params.dia} en ese rango horario.`,
      )
    }
  }

  for (const otro of gruposMemoriaLocal) {
    if (!otro.activo || otro.grupoId === params.grupoId) continue
    for (const hOtro of otro.horarios ?? []) {
      if (hOtro.estado === 'CANCELADO') continue
      const mismaPista =
        (hOtro.sedeId && hOtro.sedeId === params.sedeId) ||
        hOtro.pista.toLowerCase() === params.pista.toLowerCase()
      const solapa =
        hOtro.dia === params.dia &&
        params.horaInicio < hOtro.horaFin &&
        params.horaFin > hOtro.horaInicio
      if (mismaPista && solapa) {
        throw new Error(
          `Solapamiento de pista: ${params.pista} ya está ocupada el ${params.dia} de ${hOtro.horaInicio} a ${hOtro.horaFin} por el grupo «${otro.nombre}» (DEP-G4-01).`,
        )
      }
    }
  }
}

export async function crearHorarioM3(payload: {
  grupoId: string
  diaSemana: DiaSemanaM3
  horaInicio: string
  horaFin: string
  sedeId: string
}): Promise<RespuestaOperacionHorarioM3> {
  try {
    const sede = CATALOGOS_M3_FALLBACK.sedes.find((s) => s.sedeId === payload.sedeId)
    return await pedir<RespuestaOperacionHorarioM3>('/v1/horarios', {
      metodo: 'POST',
      cuerpo: {
        ...payload,
        dia: payload.diaSemana,
        pista: sede?.pista,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message && !error.message.includes('No hay conexión')) {
      throw error
    }
    const grupo = gruposMemoriaLocal.find((g) => g.grupoId === payload.grupoId)
    if (!grupo) throw new Error('Grupo no encontrado.')
    const sede =
      CATALOGOS_M3_FALLBACK.sedes.find((s) => s.sedeId === payload.sedeId) ??
      CATALOGOS_M3_FALLBACK.sedes[0]

    validarCrucePistaLocal({
      grupoId: grupo.grupoId,
      dia: payload.diaSemana,
      horaInicio: payload.horaInicio,
      horaFin: payload.horaFin,
      sedeId: sede.sedeId,
      pista: sede.pista,
    })

    const nuevoId = `HOR-${Date.now().toString().slice(-3)}`
    const nuevo: HorarioGrupoM3 = {
      id: nuevoId,
      horarioId: nuevoId,
      grupoId: grupo.grupoId,
      nombreGrupo: grupo.nombre,
      nivelNombre: grupo.nivelNombre,
      dia: payload.diaSemana,
      diaSemana: payload.diaSemana,
      horaInicio: payload.horaInicio,
      horaFin: payload.horaFin,
      sedeId: sede.sedeId,
      sedeNombre: sede.nombreSede,
      pista: sede.pista,
      estado: 'ACTIVO',
    }
    grupo.horarios = [...(grupo.horarios ?? []), nuevo]
    return { horario: nuevo, notificacion: null }
  }
}

export async function actualizarHorarioM3(
  horarioId: string,
  payload: {
    grupoId?: string
    diaSemana?: DiaSemanaM3
    horaInicio?: string
    horaFin?: string
    sedeId?: string
  },
): Promise<RespuestaOperacionHorarioM3> {
  try {
    const sede = payload.sedeId
      ? CATALOGOS_M3_FALLBACK.sedes.find((s) => s.sedeId === payload.sedeId)
      : undefined
    return await pedir<RespuestaOperacionHorarioM3>(`/v1/horarios/${horarioId}`, {
      metodo: 'PATCH',
      cuerpo: {
        ...payload,
        dia: payload.diaSemana,
        pista: sede?.pista,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message && !error.message.includes('No hay conexión')) {
      throw error
    }
    let grupoActual: GrupoConfiguradoM3 | undefined
    let horarioActual: HorarioGrupoM3 | undefined
    for (const g of gruposMemoriaLocal) {
      const h = (g.horarios ?? []).find(
        (item) => item.id === horarioId || item.horarioId === horarioId,
      )
      if (h) {
        grupoActual = g
        horarioActual = h
        break
      }
    }
    if (!grupoActual || !horarioActual) throw new Error('Franja horaria no encontrada.')
    const nuevoDia = payload.diaSemana ?? horarioActual.dia
    const nuevaHoraInicio = payload.horaInicio ?? horarioActual.horaInicio
    const nuevaHoraFin = payload.horaFin ?? horarioActual.horaFin
    const sede =
      CATALOGOS_M3_FALLBACK.sedes.find(
        (s) => s.sedeId === (payload.sedeId ?? horarioActual.sedeId ?? grupoActual.sedeId),
      ) ?? CATALOGOS_M3_FALLBACK.sedes[0]

    validarCrucePistaLocal({
      grupoId: payload.grupoId ?? grupoActual.grupoId,
      dia: nuevoDia,
      horaInicio: nuevaHoraInicio,
      horaFin: nuevaHoraFin,
      sedeId: sede.sedeId,
      pista: sede.pista,
      excluirHorarioId: horarioId,
    })

    const anteriorDesc = `${horarioActual.dia} ${horarioActual.horaInicio}–${horarioActual.horaFin}`
    horarioActual.dia = nuevoDia
    horarioActual.diaSemana = nuevoDia
    horarioActual.horaInicio = nuevaHoraInicio
    horarioActual.horaFin = nuevaHoraFin
    horarioActual.sedeId = sede.sedeId
    horarioActual.sedeNombre = sede.nombreSede
    horarioActual.pista = sede.pista
    horarioActual.estado = 'REPROGRAMADO'

    const notif: RegistroNotificacionM1 = {
      notificacionId: `NOTIF-${String(notificacionesMemoriaLocal.length + 1).padStart(3, '0')}`,
      destinatariosIds: [grupoActual.profesorId ?? 'PROF-01', `ESTUDIANTES-${grupoActual.grupoId}`],
      asunto: `Reprogramación de entrenamiento · ${grupoActual.nombre}`,
      mensaje: `La sesión de «${grupoActual.nombre}» pasó de ${anteriorDesc} a ${nuevoDia} ${nuevaHoraInicio}–${nuevaHoraFin} en ${sede.pista}.`,
      canal: 'EMAIL_PUSH',
      fechaEnvio: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      estadoEnvio: 'ENVIADO',
    }
    notificacionesMemoriaLocal = [notif, ...notificacionesMemoriaLocal]
    return { horario: horarioActual, notificacion: notif }
  }
}

export async function anularHorarioM3(
  horarioId: string,
  motivo: string,
): Promise<RespuestaOperacionHorarioM3> {
  try {
    return await pedir<RespuestaOperacionHorarioM3>(`/v1/horarios/${horarioId}/anular`, {
      metodo: 'PATCH',
      cuerpo: { motivo },
    })
  } catch (error) {
    if (error instanceof Error && error.message && !error.message.includes('No hay conexión')) {
      throw error
    }
    let grupoActual: GrupoConfiguradoM3 | undefined
    let horarioActual: HorarioGrupoM3 | undefined
    for (const g of gruposMemoriaLocal) {
      const h = (g.horarios ?? []).find(
        (item) => item.id === horarioId || item.horarioId === horarioId,
      )
      if (h) {
        grupoActual = g
        horarioActual = h
        break
      }
    }
    if (!grupoActual || !horarioActual) throw new Error('Franja horaria no encontrada.')
    horarioActual.estado = 'CANCELADO'
    horarioActual.motivoCancelacion = motivo.trim()
    const notif: RegistroNotificacionM1 = {
      notificacionId: `NOTIF-${String(notificacionesMemoriaLocal.length + 1).padStart(3, '0')}`,
      destinatariosIds: [grupoActual.profesorId ?? 'PROF-01', `ESTUDIANTES-${grupoActual.grupoId}`],
      asunto: `Cancelación de sesión · ${grupoActual.nombre}`,
      mensaje: `Se anuló la franja del ${horarioActual.dia} (${horarioActual.horaInicio}–${horarioActual.horaFin} en ${horarioActual.pista}). Motivo: ${motivo.trim()}.`,
      canal: 'EMAIL_PUSH',
      fechaEnvio: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      estadoEnvio: 'ENVIADO',
    }
    notificacionesMemoriaLocal = [notif, ...notificacionesMemoriaLocal]
    return { horario: horarioActual, notificacion: notif }
  }
}

// ============================================================================
// HU-3.4: SELECCIÓN Y CAMBIO DE GRUPO POR PARTE DEL USUARIO Y API-M3-04
// ============================================================================

const DATOS_ESTUDIANTES_FALLBACK: Record<
  string,
  {
    perfilDeportivo: ContextoAutogestionGrupoM3['perfilDeportivo']
    validacionMenor: ContextoAutogestionGrupoM3['validacionMenor']
    poliza: ContextoAutogestionGrupoM3['poliza']
    planCartera: ContextoAutogestionGrupoM3['planCartera']
  }
> = {
  'EST-01': {
    perfilDeportivo: {
      estudianteId: 'EST-01',
      nombreCompleto: 'Sofía Ramírez',
      nivelId: 'NIV-01',
      categoriaId: 'CAT-02',
      estadoDeportivo: 'ACTIVO',
    },
    validacionMenor: {
      estudianteId: 'EST-01',
      nombreEstudiante: 'Sofía Ramírez',
      edad: 10,
      esMenorEdad: true,
      acudienteId: 'ACU-01',
      nombreAcudiente: 'Carolina Ramírez',
      tieneAutorizacion: true,
    },
    poliza: {
      estudianteId: 'EST-01',
      polizaVigente: true,
      fechaVencimiento: '2026-12-31T23:59:59Z',
      numeroPoliza: 'POL-SURA-882341',
    },
    planCartera: {
      estudianteId: 'EST-01',
      nombrePlan: 'Mensual 3 días/semana',
      planActivo: true,
      alDiaEnPagos: true,
      estadoCartera: 'AL_DIA',
      limiteClasesSemanales: 3,
    },
  },
  'EST-02': {
    perfilDeportivo: {
      estudianteId: 'EST-02',
      nombreCompleto: 'Juan Pablo González',
      nivelId: 'NIV-03',
      categoriaId: 'CAT-05',
      estadoDeportivo: 'ACTIVO',
    },
    validacionMenor: {
      estudianteId: 'EST-02',
      nombreEstudiante: 'Juan Pablo González',
      edad: 19,
      esMenorEdad: false,
      acudienteId: null,
      nombreAcudiente: null,
      tieneAutorizacion: true,
    },
    poliza: {
      estudianteId: 'EST-02',
      polizaVigente: true,
      fechaVencimiento: '2026-11-30T23:59:59Z',
      numeroPoliza: 'POL-BOLIVAR-991204',
    },
    planCartera: {
      estudianteId: 'EST-02',
      nombrePlan: 'Mensual 6 días/semana',
      planActivo: true,
      alDiaEnPagos: true,
      estadoCartera: 'AL_DIA',
      limiteClasesSemanales: 6,
    },
  },
  'EST-03': {
    perfilDeportivo: {
      estudianteId: 'EST-03',
      nombreCompleto: 'Mateo Valderrama',
      nivelId: 'NIV-01',
      categoriaId: 'CAT-02',
      estadoDeportivo: 'ACTIVO',
    },
    validacionMenor: {
      estudianteId: 'EST-03',
      nombreEstudiante: 'Mateo Valderrama',
      edad: 9,
      esMenorEdad: true,
      acudienteId: 'ACU-02',
      nombreAcudiente: 'Roberto Valderrama',
      tieneAutorizacion: false,
    },
    poliza: {
      estudianteId: 'EST-03',
      polizaVigente: true,
      fechaVencimiento: '2026-12-15T23:59:59Z',
      numeroPoliza: 'POL-SURA-443120',
    },
    planCartera: {
      estudianteId: 'EST-03',
      nombrePlan: 'Mensual 3 días/semana',
      planActivo: true,
      alDiaEnPagos: true,
      estadoCartera: 'AL_DIA',
      limiteClasesSemanales: 3,
    },
  },
  'EST-04': {
    perfilDeportivo: {
      estudianteId: 'EST-04',
      nombreCompleto: 'Valentina Torres',
      nivelId: 'NIV-01',
      categoriaId: 'CAT-03',
      estadoDeportivo: 'ACTIVO',
    },
    validacionMenor: {
      estudianteId: 'EST-04',
      nombreEstudiante: 'Valentina Torres',
      edad: 12,
      esMenorEdad: true,
      acudienteId: 'ACU-03',
      nombreAcudiente: 'Marcela Torres',
      tieneAutorizacion: true,
    },
    poliza: {
      estudianteId: 'EST-04',
      polizaVigente: false,
      fechaVencimiento: '2026-01-15T23:59:59Z',
      numeroPoliza: 'POL-SURA-102938',
    },
    planCartera: {
      estudianteId: 'EST-04',
      nombrePlan: 'Mensual 3 días/semana',
      planActivo: true,
      alDiaEnPagos: false,
      estadoCartera: 'VENCIDO',
      limiteClasesSemanales: 3,
    },
  },
}

export async function obtenerContextoAutogestionM3(
  estudianteId: string,
  actorRol: 'ESTUDIANTE' | 'ACUDIENTE',
  acudienteId?: string,
): Promise<ContextoAutogestionGrupoM3> {
  try {
    return await pedir<ContextoAutogestionGrupoM3>(`/v1/grupos/autogestion/${estudianteId}`, {
      consulta: {
        actorRol,
        acudienteId,
      },
    })
  } catch {
    const info = DATOS_ESTUDIANTES_FALLBACK[estudianteId] ?? DATOS_ESTUDIANTES_FALLBACK['EST-01']
    const insc = inscripcionesMemoriaLocal.find(
      (i) => i.estudianteId === estudianteId && i.estado === 'ACTIVO',
    )
    const grupoActual = insc
      ? gruposMemoriaLocal.find((g) => g.grupoId === insc.grupoId) ?? null
      : null

    let puedeGestionarCambio = true
    let motivoBloqueoActor: string | null = null

    if (info.validacionMenor.esMenorEdad && actorRol === 'ESTUDIANTE') {
      puedeGestionarCambio = false
      motivoBloqueoActor =
        'Cambio no permitido para menores de edad: solo el acudiente autorizado puede inscribir o cambiar de grupo (DEP-M1-03).'
    } else if (info.validacionMenor.esMenorEdad && !info.validacionMenor.tieneAutorizacion) {
      puedeGestionarCambio = false
      motivoBloqueoActor = `El estudiante menor de edad (${info.validacionMenor.nombreEstudiante}) no cuenta con autorización activa de su acudiente vinculado en DEP-M1-03.`
    } else if (!info.poliza.polizaVigente) {
      puedeGestionarCambio = false
      motivoBloqueoActor = `La póliza médico-deportiva del estudiante se encuentra vencida (${info.poliza.fechaVencimiento.slice(0, 10)} · DEP-M1-04).`
    } else if (!info.planCartera.planActivo || !info.planCartera.alDiaEnPagos) {
      puedeGestionarCambio = false
      motivoBloqueoActor = `El estudiante presenta bloqueo en plan o cartera (${info.planCartera.estadoCartera} · DEP-G4-02).`
    }

    const gruposElegibles = gruposMemoriaLocal.filter(
      (g) =>
        g.activo &&
        g.nivelId === info.perfilDeportivo.nivelId &&
        g.dias.length <= info.planCartera.limiteClasesSemanales,
    )

    return {
      estudianteId,
      actorRol,
      actorId: actorRol === 'ACUDIENTE' ? (acudienteId ?? 'ACU-01') : estudianteId,
      ...info,
      puedeGestionarCambio,
      motivoBloqueoActor,
      grupoActual,
      gruposElegibles,
    }
  }
}

export async function inscribirOCambiarGrupoM3(payload: {
  estudianteId: string
  grupoDestinoId: string
  actorRol: 'ESTUDIANTE' | 'ACUDIENTE'
  acudienteId?: string
}): Promise<ResultadoCambioGrupoM3> {
  try {
    return await pedir<ResultadoCambioGrupoM3>('/v1/grupos/autogestion/cambiar', {
      metodo: 'POST',
      cuerpo: payload,
    })
  } catch (error) {
    if (error instanceof Error && error.message && !error.message.includes('No hay conexión')) {
      throw error
    }
    const contexto = await obtenerContextoAutogestionM3(
      payload.estudianteId,
      payload.actorRol,
      payload.acudienteId,
    )
    if (!contexto.puedeGestionarCambio) {
      throw new Error(contexto.motivoBloqueoActor ?? 'Cambio bloqueado por validaciones.')
    }
    const destino = gruposMemoriaLocal.find((g) => g.grupoId === payload.grupoDestinoId)
    if (!destino) throw new Error('Grupo destino no encontrado.')
    if (destino.ocupados >= destino.aforoMax) {
      throw new Error(
        `No hay cupos disponibles en el grupo «${destino.nombre}» (${destino.ocupados}/${destino.aforoMax} · 100 % de aforo alcanzado).`,
      )
    }

    let grupoAnterior: GrupoConfiguradoM3 | null = null
    const inscAnt = inscripcionesMemoriaLocal.find(
      (i) => i.estudianteId === payload.estudianteId && i.estado === 'ACTIVO',
    )
    if (inscAnt) {
      inscAnt.estado = 'RETIRADO_CAMBIO'
      const gAnt = gruposMemoriaLocal.find((g) => g.grupoId === inscAnt.grupoId)
      if (gAnt) {
        gAnt.ocupados = Math.max(0, gAnt.ocupados - 1)
        gAnt.inscritosActuales = gAnt.ocupados
        Object.assign(gAnt, recalcularGrupoLocal(gAnt.ocupados, gAnt.aforoMax, gAnt.activo))
        grupoAnterior = { ...gAnt }
      }
    }

    destino.ocupados += 1
    destino.inscritosActuales = destino.ocupados
    Object.assign(destino, recalcularGrupoLocal(destino.ocupados, destino.aforoMax, destino.activo))

    const nuevaInsc: InscripcionEstudianteGrupoM3 = {
      estudianteId: payload.estudianteId,
      nombreEstudiante: contexto.perfilDeportivo.nombreCompleto,
      grupoId: destino.grupoId,
      nombreGrupo: destino.nombre,
      fechaInscripcion: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      estado: 'ACTIVO',
    }
    inscripcionesMemoriaLocal = [nuevaInsc, ...inscripcionesMemoriaLocal]

    return {
      estudianteId: payload.estudianteId,
      tipoOperacion: grupoAnterior ? 'CAMBIO_GRUPO' : 'INSCRIPCION',
      grupoAnterior,
      grupoNuevo: { ...destino },
      inscripcion: nuevaInsc,
      mensaje: grupoAnterior
        ? `Cambio confirmado: pasó de «${grupoAnterior.nombre}» (${grupoAnterior.ocupados}/${grupoAnterior.aforoMax}) a «${destino.nombre}» (${destino.ocupados}/${destino.aforoMax}). El cupo anterior fue liberado de inmediato.`
        : `Inscripción confirmada en «${destino.nombre}» (${destino.ocupados}/${destino.aforoMax}).`,
    }
  }
}

export async function obtenerEstudiantesDeGrupoM3(
  grupoId: string,
): Promise<InscripcionEstudianteGrupoM3[]> {
  try {
    return await pedir<InscripcionEstudianteGrupoM3[]>(`/v1/grupos/${grupoId}/estudiantes`)
  } catch {
    return inscripcionesMemoriaLocal.filter((i) => i.grupoId === grupoId)
  }
}

// ============================================================================
// HU-3.5: CALENDARIO CONSOLIDADO, SEGMENTACIÓN POR ROL Y API-M3-05
// ============================================================================

const FECHAS_OCTUBRE_LOCAL: Record<DiaSemanaM3, string[]> = {
  Lunes: ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'],
  Martes: ['2026-10-06', '2026-10-13', '2026-10-20', '2026-10-27'],
  Miercoles: ['2026-10-07', '2026-10-14', '2026-10-21', '2026-10-28'],
  Jueves: ['2026-10-08', '2026-10-15', '2026-10-22', '2026-10-29'],
  Viernes: ['2026-10-09', '2026-10-16', '2026-10-23', '2026-10-30'],
  Sabado: ['2026-10-10', '2026-10-17', '2026-10-24', '2026-10-31'],
  Domingo: ['2026-10-11', '2026-10-18', '2026-10-25'],
}

const SESIONES_MOCK_LOCAL: Record<
  string,
  { userId: string; rol: RolExternoM1; nombreCompleto: string; gruposAsociadosIds: string[] }
> = {
  'mock-jwt-admin': {
    userId: 'USR-ADMIN-01',
    rol: 'ADMIN',
    nombreCompleto: 'Daniela Martínez (Admin)',
    gruposAsociadosIds: ['GRP-01', 'GRP-02', 'GRP-03', 'GRP-04', 'GRP-05', 'GRP-06'],
  },
  'mock-jwt-estudiante-menor': {
    userId: 'EST-01',
    rol: 'ESTUDIANTE',
    nombreCompleto: 'Sofía Ramírez (Estudiante · Iniciación Norte A)',
    gruposAsociadosIds: ['GRP-01'],
  },
  'mock-jwt-acudiente-01': {
    userId: 'ACU-01',
    rol: 'ACUDIENTE',
    nombreCompleto: 'Carolina Ramírez (Acudiente de Sofía)',
    gruposAsociadosIds: ['GRP-01'],
  },
  'mock-jwt-profesor-03': {
    userId: 'PROF-03',
    rol: 'PROFESOR',
    nombreCompleto: 'Ana Gómez (Profesora · Intermedio Sur B)',
    gruposAsociadosIds: ['GRP-02', 'GRP-05'],
  },
  'mock-jwt-profesor-04': {
    userId: 'PROF-04',
    rol: 'PROFESOR',
    nombreCompleto: 'Luis Rojas (Profesor · Avanzado Norte C)',
    gruposAsociadosIds: ['GRP-03'],
  },
}

/**
 * API-M3-05: GET /api/v1/calendario (y /v1/calendario/contexto)
 */
export async function obtenerCalendarioConsolidadoM3(
  tokenSesion: string,
  filtros?: { tipo?: string; grupoId?: string },
): Promise<RespuestaCalendarioConsolidadoM3> {
  try {
    return await pedir<RespuestaCalendarioConsolidadoM3>('/v1/calendario/contexto', {
      consulta: {
        token: tokenSesion,
        tipo: filtros?.tipo || undefined,
        grupoId: filtros?.grupoId || undefined,
      },
    })
  } catch {
    const sesion = SESIONES_MOCK_LOCAL[tokenSesion] ?? SESIONES_MOCK_LOCAL['mock-jwt-admin']
    const permitidos = filtros?.grupoId
      ? sesion.gruposAsociadosIds.filter((id) => id === filtros.grupoId)
      : sesion.gruposAsociadosIds

    const eventos: EventoCalendarioM3[] = []
    for (const g of gruposMemoriaLocal) {
      if (!g.activo || !permitidos.includes(g.grupoId)) continue
      for (const h of g.horarios ?? []) {
        if (h.estado === 'CANCELADO') continue
        const dia = h.diaSemana ?? h.dia
        for (const fecha of FECHAS_OCTUBRE_LOCAL[dia] ?? ['2026-10-05']) {
          eventos.push({
            eventoId: `EVT-ENT-${h.horarioId ?? h.id}-${fecha}`,
            tipo: 'ENTRENAMIENTO',
            titulo: `Entrenamiento · ${g.nombre}`,
            inicio: `${fecha}T${h.horaInicio}:00Z`,
            fin: `${fecha}T${h.horaFin}:00Z`,
            ubicacion: `${h.pista} (Sede ${g.sedeNombre})`,
            sedeId: g.sedeId,
            grupoId: g.grupoId,
            nombreGrupo: g.nombre,
            categorias: [g.categoriaNombre],
            descripcion: `Sesión técnica nivel ${g.nivelNombre}. Entrenador: ${g.profesorNombre ?? 'Equipo docente'}.`,
            estado: h.estado === 'REPROGRAMADO' ? 'REPROGRAMADO' : 'PROGRAMADO',
            editablePorAdmin: false,
          })
        }
      }
    }

    const competenciasFallback: EventoCalendarioM3[] = [
      {
        eventoId: 'EVT-COMP-COMP-01',
        tipo: 'COMPETENCIA',
        titulo: 'Torneo Regional de Velocidad',
        inicio: '2026-10-10T09:00:00Z',
        fin: '2026-10-10T16:00:00Z',
        ubicacion: 'Pista 1 · Norte · Sede Norte',
        sedeId: 'SEDE-NORTE-P1',
        grupoId: null,
        nombreGrupo: 'Intermedio, Avanzado',
        categorias: ['CAT-02', 'CAT-03', 'CAT-04'],
        descripcion: 'Competencia oficial publicada por Módulo 4 (DEP-M4-01).',
        estado: 'PROGRAMADO',
        editablePorAdmin: false,
      },
      {
        eventoId: 'EVT-COMP-COMP-03',
        tipo: 'COMPETENCIA',
        titulo: 'Chequeo Técnico Clasificatorio',
        inicio: '2026-10-17T08:30:00Z',
        fin: '2026-10-17T12:30:00Z',
        ubicacion: 'Pista 2 · Sur · Sede Sur',
        sedeId: 'SEDE-SUR-P2',
        grupoId: null,
        nombreGrupo: 'Intermedio, Avanzado',
        categorias: ['CAT-03', 'CAT-04', 'CAT-05'],
        descripcion: 'Chequeo oficial de tiempos cronometrados (DEP-M4-01).',
        estado: 'PROGRAMADO',
        editablePorAdmin: false,
      },
      {
        eventoId: 'EVT-COMP-COMP-02',
        tipo: 'COMPETENCIA',
        titulo: 'Festival Distrital de Escuelas',
        inicio: '2026-10-24T08:00:00Z',
        fin: '2026-10-24T14:00:00Z',
        ubicacion: 'Pista Principal - El Salitre',
        sedeId: 'SEDE-SALITRE-P1',
        grupoId: null,
        nombreGrupo: 'Semillero, Iniciación',
        categorias: ['CAT-01', 'CAT-02'],
        descripcion: 'Festival oficial de escuelas de patinaje (DEP-M4-01).',
        estado: 'PROGRAMADO',
        editablePorAdmin: false,
      },
    ]

    eventos.push(...competenciasFallback)
    for (const eg of eventosGlobalesMemoriaLocal) {
      if (eg.estado === 'ANULADO') continue
      eventos.push({ ...eg, editablePorAdmin: sesion.rol === 'ADMIN' })
    }

    return {
      sesion,
      eventos: eventos
        .filter((e) => !filtros?.tipo || e.tipo === filtros.tipo)
        .sort((a, b) => a.inicio.localeCompare(b.inicio)),
    }
  }
}

export async function crearEventoGlobalM3(
  tokenSesion: string,
  payload: {
    titulo: string
    inicio: string
    fin: string
    ubicacion: string
    sedeId?: string
    descripcion?: string
  },
): Promise<EventoCalendarioM3> {
  try {
    return await pedir<EventoCalendarioM3>('/v1/calendario/eventos-globales', {
      metodo: 'POST',
      consulta: { token: tokenSesion },
      cuerpo: payload,
    })
  } catch (error) {
    if (error instanceof Error && error.message && !error.message.includes('No hay conexión')) {
      throw error
    }
    const sesion = SESIONES_MOCK_LOCAL[tokenSesion] ?? SESIONES_MOCK_LOCAL['mock-jwt-admin']
    if (sesion.rol !== 'ADMIN') {
      throw new Error('Acceso denegado: solo el rol ADMIN puede crear eventos globales.')
    }
    const nuevo: EventoCalendarioM3 = {
      eventoId: `EVT-INST-0${eventosGlobalesMemoriaLocal.length + 1}`,
      tipo: 'EVENTO_INSTITUCIONAL',
      titulo: payload.titulo.trim(),
      inicio: payload.inicio,
      fin: payload.fin,
      ubicacion: payload.ubicacion.trim(),
      sedeId: payload.sedeId ?? 'SEDE-NORTE-P1',
      grupoId: null,
      nombreGrupo: 'Todos los grupos del club',
      categorias: ['Todas las categorías'],
      descripcion:
        payload.descripcion?.trim() || 'Evento institucional global programado por Administración.',
      estado: 'PROGRAMADO',
      editablePorAdmin: true,
    }
    eventosGlobalesMemoriaLocal = [...eventosGlobalesMemoriaLocal, nuevo]
    return nuevo
  }
}

export async function actualizarEventoGlobalM3(
  tokenSesion: string,
  eventoId: string,
  payload: {
    titulo?: string
    inicio?: string
    fin?: string
    ubicacion?: string
    descripcion?: string
  },
): Promise<EventoCalendarioM3> {
  try {
    return await pedir<EventoCalendarioM3>(`/v1/calendario/eventos-globales/${eventoId}`, {
      metodo: 'PATCH',
      consulta: { token: tokenSesion },
      cuerpo: payload,
    })
  } catch (error) {
    if (error instanceof Error && error.message && !error.message.includes('No hay conexión')) {
      throw error
    }
    const ev = eventosGlobalesMemoriaLocal.find((e) => e.eventoId === eventoId)
    if (!ev) throw new Error('Evento global no encontrado.')
    if (payload.titulo) ev.titulo = payload.titulo.trim()
    if (payload.inicio) ev.inicio = payload.inicio
    if (payload.fin) ev.fin = payload.fin
    if (payload.ubicacion) ev.ubicacion = payload.ubicacion.trim()
    if (payload.descripcion !== undefined) ev.descripcion = payload.descripcion.trim()
    return ev
  }
}

export async function anularEventoGlobalM3(
  tokenSesion: string,
  eventoId: string,
): Promise<EventoCalendarioM3> {
  try {
    return await pedir<EventoCalendarioM3>(`/v1/calendario/eventos-globales/${eventoId}/anular`, {
      metodo: 'PATCH',
      consulta: { token: tokenSesion },
    })
  } catch (error) {
    if (error instanceof Error && error.message && !error.message.includes('No hay conexión')) {
      throw error
    }
    const ev = eventosGlobalesMemoriaLocal.find((e) => e.eventoId === eventoId)
    if (!ev) throw new Error('Evento global no encontrado.')
    ev.estado = 'ANULADO'
    return ev
  }
}
