// Validaciones de presentación del ingreso (HU-M1-02 CA-05: indicar qué falta
// sin consultar al servidor). La API vuelve a validar todo.

export interface CamposIngreso {
  correo: string
  contrasena: string
}

export type ErroresIngreso = Partial<Record<keyof CamposIngreso, string>>

export function validarIngreso(campos: CamposIngreso): ErroresIngreso {
  const errores: ErroresIngreso = {}
  if (!campos.correo.trim()) errores.correo = 'Escribe tu correo electrónico'
  if (!campos.contrasena) errores.contrasena = 'Escribe tu contraseña'
  return errores
}
