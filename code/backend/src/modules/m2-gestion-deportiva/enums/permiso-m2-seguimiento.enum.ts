/**
 * Permisos del seguimiento deportivo de M2 (RF-M2-07 a RF-M2-23).
 * Van en un enum aparte del de gestión de perfiles, niveles y acudientes
 * (RF-M2-01 a RF-M2-06) para no pisar el trabajo de los PR #44 a #47.
 */
export enum PermisoM2Seguimiento {
  /** RF-M2-07: crear, editar e inactivar categorías del club. */
  CATEGORIA_GESTIONAR = 'M2_CATEGORIA_GESTIONAR',
  /** RF-M2-17 y RF-M2-19: consultar el catálogo de categorías (y niveles) del club. */
  CATEGORIA_CONSULTAR = 'M2_CATEGORIA_CONSULTAR',
  /** RF-M2-08, RF-M2-09 y resolución de propuestas (RF-M2-16): asignar y cambiar categorías. */
  ASIGNACION_GESTIONAR = 'M2_ASIGNACION_GESTIONAR',
  /** RF-M2-16: proponer un cambio de categoría. */
  CATEGORIA_PROPONER = 'M2_CATEGORIA_PROPONER',
  /** RF-M2-16: ejecutar el cambio sin pasar por aprobación (solo si el administrador lo concede). */
  CATEGORIA_PROMOVER_DIRECTO = 'M2_CATEGORIA_PROMOVER_DIRECTO',
  /** RF-M2-18 y RF-M2-21: consultar la categoría actual propia o de los patinadores a cargo. */
  CATEGORIA_ACTUAL_CONSULTAR = 'M2_CATEGORIA_ACTUAL_CONSULTAR',
  /** RF-M2-10, RF-M2-15 y RF-M2-22: consultar el historial de niveles y categorías. */
  HISTORIAL_CONSULTAR = 'M2_HISTORIAL_CONSULTAR',
  /** RF-M2-11: consultar la información de entrenamiento de los patinadores asignados. */
  ENTRENAMIENTO_CONSULTAR = 'M2_ENTRENAMIENTO_CONSULTAR',
  /** RF-M2-12, RF-M2-13 y RF-M2-14: evaluar, marcar habilidades y escribir observaciones. */
  SEGUIMIENTO_REGISTRAR = 'M2_SEGUIMIENTO_REGISTRAR',
  /** RF-M2-23: consultar las observaciones propias cuando el club las habilita. */
  OBSERVACION_PROPIA_CONSULTAR = 'M2_OBSERVACION_PROPIA_CONSULTAR',
  /** RF-M2-23: habilitar o deshabilitar la consulta de observaciones por los patinadores. */
  OBSERVACION_HABILITAR = 'M2_OBSERVACION_HABILITAR',
}
