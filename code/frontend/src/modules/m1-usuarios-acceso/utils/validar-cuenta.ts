// Validaciones de presentación de «Nueva cuenta» (HU-M1-01, CA-03 y CA-04):
// señalan cada campo antes de llamar a la API. La API vuelve a validar todo.

export interface CamposCuenta {
  nombres: string
  apellidos: string
  correo: string
  rol: string
}

export type ErroresCuenta = Partial<Record<keyof CamposCuenta, string>>

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarCuenta(campos: CamposCuenta): ErroresCuenta {
  const errores: ErroresCuenta = {}
  if (!campos.nombres.trim()) errores.nombres = 'Escribe los nombres'
  if (!campos.apellidos.trim()) errores.apellidos = 'Escribe los apellidos'
  if (!campos.correo.trim()) errores.correo = 'Escribe el correo electrónico'
  else if (!CORREO.test(campos.correo.trim()))
    errores.correo = 'Escribe un correo electrónico válido, por ejemplo laura.cubillos@example.com'
  if (!campos.rol) errores.rol = 'Elige el rol de la cuenta'
  return errores
}
