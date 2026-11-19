import { PERMISOS_M5 } from '../modules/m5-planes-tarifas-pagos/types/m5.types.ts'
import type { Rol, Sesion } from '../shared/sesion/sesion.types.ts'

export type GrupoNavegacion = 'Usuarios' | 'Planes y pagos'

export interface Pantalla {
  /** Parte de la ruta: #/pagina */
  pagina: string
  texto: string
  grupo: GrupoNavegacion
  /** Una línea para el panel de inicio. */
  descripcion: string
  /** Roles que la ven. Sin esto, la ve cualquier rol. */
  roles?: readonly Rol[]
  /** Permiso que exige (tabla permiso). Sin esto, no exige ninguno. */
  permiso?: string
}

/**
 * HU-M1-07 · Control de acceso por rol. Es la única tabla que dice qué rol ve
 * qué pantalla: el menú, el panel de inicio y el bloqueo de rutas salen de
 * aquí. Para abrir una pantalla a un rol, se agrega una línea (roles o permiso).
 * El backend vuelve a comprobar todo: ocultar una pantalla no protege los datos.
 */
export const PANTALLAS: readonly Pantalla[] = [
  {
    pagina: 'nueva-cuenta',
    texto: 'Nueva cuenta',
    grupo: 'Usuarios',
    descripcion: 'Registra a un profesor, patinador, acudiente, contador o fisioterapeuta.',
    roles: ['ADMINISTRADOR'],
  },
  {
    pagina: 'planes',
    texto: 'Planes y tarifas',
    grupo: 'Planes y pagos',
    descripcion: 'Crea y edita los planes de servicio y sus tarifas.',
    permiso: PERMISOS_M5.planGestionar,
  },
  {
    pagina: 'asignar-plan',
    texto: 'Asignar o cambiar plan',
    grupo: 'Planes y pagos',
    descripcion: 'Asigna un plan a un patinador o cámbialo por otro.',
    permiso: PERMISOS_M5.planAsignar,
  },
  {
    pagina: 'registrar-pago',
    texto: 'Registrar pago',
    grupo: 'Planes y pagos',
    descripcion: 'Registra pagos de mensualidades, sesiones y matrículas.',
    permiso: PERMISOS_M5.pagoRegistrar,
  },
]

/** Orden de los grupos en el menú. */
const ORDEN_GRUPOS: readonly GrupoNavegacion[] = ['Usuarios', 'Planes y pagos']

/** Lo que cada rol puede esperar de la aplicación (misma descripción que la tabla rol). */
export const DESCRIPCION_ROL: Record<Rol, string> = {
  ADMINISTRADOR: 'Gestionas toda la operación de la escuela.',
  PROFESOR: 'Entrenas, evalúas y propones cambios de categoría.',
  PATINADOR: 'Consultas tu progreso y gestionas tu plan.',
  ACUDIENTE: 'Actúas por el patinador menor de edad.',
  CONTADOR: 'Consultas lo financiero, registras pagos y sacas reportes.',
  FISIOTERAPEUTA: 'Intervienes en la validación de la póliza médica.',
  VISITANTE: 'Ves solo información general de la escuela.',
}

/** ¿Esta sesión puede ver la pantalla? Exige el rol Y el permiso cuando la pantalla pide ambos. */
export function puedeVer(pantalla: Pantalla, sesion: Sesion): boolean {
  const rolValido = !pantalla.roles || pantalla.roles.some((rol) => sesion.roles.includes(rol))
  const permisoValido = !pantalla.permiso || sesion.permisos.includes(pantalla.permiso)
  return rolValido && permisoValido
}

export function pantallasPermitidas(sesion: Sesion): Pantalla[] {
  return PANTALLAS.filter((pantalla) => puedeVer(pantalla, sesion))
}

/** Pantallas permitidas agrupadas para el menú; los grupos sin pantallas no aparecen. */
export function navegacionDe(permitidas: readonly Pantalla[]) {
  return ORDEN_GRUPOS.map((grupo) => ({
    grupo,
    enlaces: permitidas.filter((pantalla) => pantalla.grupo === grupo),
  })).filter((grupo) => grupo.enlaces.length > 0)
}