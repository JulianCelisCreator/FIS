// Validaciones de presentación del ingreso. La API vuelve a validar todo.

export interface CamposIngreso {
  correo: string
  contrasena: string
  rol: string
}

export type ErroresIngreso = Partial<Record<keyof CamposIngreso, string>>

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarIngreso(campos: CamposIngreso): ErroresIngreso {
  const errores: ErroresIngreso = {}
  if (!campos.correo.trim()) errores.correo = 'Escribe tu correo electrónico'
  else if (!CORREO.test(campos.correo.trim())) errores.correo = 'Escribe un correo electrónico válido'
  if (!campos.contrasena) errores.contrasena = 'Escribe tu contraseña'
  if (!campos.rol) errores.rol = 'Elige con qué rol ingresas'
  return errores
}
