import { pedir } from '../../../shared/services/cliente-api.ts'
import {
  CATALOGOS_M3_FALLBACK,
  GRUPOS_M3_FALLBACK,
  PROFESORES_BASE_FALLBACK,
  type CatalogosConfiguracionM3,
  type CrearGrupoM3Payload,
  type DiaSemanaM3,
  type EstadoCupoGrupoM3,
  type EvaluacionDisponibilidadProfesorM3,
  type GrupoAsignadoProfesorM3,
  type GrupoConfiguradoM3,
  type HorarioGrupoM3,
  type RegistroNotificacionM1,
  type RespuestaOperacionHorarioM3,
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

/**
 * API-M3-01: GET /api/v1/grupos
 * Obtiene los grupos configurados con aforo máximo, ocupados y alerta90.
 */
export async function listarGruposM3(): Promise<GrupoConfiguradoM3[]> {
  try {
    const lista = await pedir<GrupoConfiguradoM3[]>('/v1/grupos')
    gruposMemoriaLocal = lista
    return lista
  } catch {
    return gruposMemoriaLocal
  }
}

/**
 * Obtiene los catálogos de niveles (DEP-M2-01), categorías (DEP-M2-02) y sedes (DEP-G4-01).
 */
export async function obtenerCatalogosGruposM3(): Promise<CatalogosConfiguracionM3> {
  try {
    return await pedir<CatalogosConfiguracionM3>('/v1/grupos/catalogos')
  } catch {
    return CATALOGOS_M3_FALLBACK
  }
}

/**
 * HU-3.1: Crea un grupo validando campos obligatorios y límite físico de sede (DEP-G4-01).
 */
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

/**
 * API-M3-03: GET /api/v1/horarios
 */
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
