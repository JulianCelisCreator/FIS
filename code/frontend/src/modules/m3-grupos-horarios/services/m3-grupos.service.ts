import { pedir } from '../../../shared/services/cliente-api.ts'
import {
  CATALOGOS_M3_FALLBACK,
  GRUPOS_M3_FALLBACK,
  type CatalogosConfiguracionM3,
  type CrearGrupoM3Payload,
  type EstadoCupoGrupoM3,
  type GrupoConfiguradoM3,
} from '../types/m3.types.ts'

let gruposMemoriaLocal: GrupoConfiguradoM3[] = [...GRUPOS_M3_FALLBACK]

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
