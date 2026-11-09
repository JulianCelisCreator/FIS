// Validaciones de presentación del registro: dan el error junto al campo antes
// de llamar a la API. La API vuelve a validar todo (RegistrarUsuarioDto).

export const LONGITUD_MINIMA_CONTRASENA = 8

export interface CamposRegistro {
  nombres: string
  apellidos: string
  correo: string
  contrasena: string
  rol: string
}

export type ErroresRegistro = Partial<Record<keyof CamposRegistro, string>>

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarRegistro(campos: CamposRegistro): ErroresRegistro {
  const errores: ErroresRegistro = {}
  if (!campos.nombres.trim()) errores.nombres = 'Escribe tus nombres'
  if (!campos.apellidos.trim()) errores.apellidos = 'Escribe tus apellidos'
  if (!campos.correo.trim()) errores.correo = 'Escribe tu correo electrónico'
  else if (!CORREO.test(campos.correo.trim()))
    errores.correo = 'Escribe un correo electrónico válido, por ejemplo sofia@example.com'
  if (campos.contrasena.length < LONGITUD_MINIMA_CONTRASENA)
    errores.contrasena = `La contraseña debe tener al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres`
  else if (!/\p{L}/u.test(campos.contrasena) || !/\d/.test(campos.contrasena))
    errores.contrasena = 'La contraseña debe tener al menos una letra y un número'
  if (!campos.rol) errores.rol = 'Elige con qué rol te registras'
  return errores
}
