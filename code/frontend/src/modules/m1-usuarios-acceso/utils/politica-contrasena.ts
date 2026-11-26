// Política de contraseñas de M1 (HU-M1-08). Misma regla que valida la API
// (politica-contrasena.ts del backend); aquí sirve para mostrar en vivo qué
// condiciones se cumplen. La API vuelve a validar todo.

export interface ReglaContrasena {
  id: string
  /** Cómo se lista en la ayuda («8 caracteres o más»). */
  texto: string
  /** Mensaje cuando falta («Falta una mayúscula»), igual que la API. */
  falta: string
  cumple: (contrasena: string) => boolean
}

export const REGLAS_CONTRASENA: ReglaContrasena[] = [
  { id: 'largo', texto: '8 caracteres o más', falta: 'Debe tener al menos 8 caracteres', cumple: (c) => c.length >= 8 },
  { id: 'mayuscula', texto: 'Una mayúscula', falta: 'Falta una mayúscula', cumple: (c) => /\p{Lu}/u.test(c) },
  { id: 'minuscula', texto: 'Una minúscula', falta: 'Falta una minúscula', cumple: (c) => /\p{Ll}/u.test(c) },
  { id: 'numero', texto: 'Un número', falta: 'Falta un número', cumple: (c) => /\d/.test(c) },
]

/** CA-04: cada condición que falta; vacío si la contraseña cumple. */
export function reglasIncumplidas(contrasena: string): string[] {
  return REGLAS_CONTRASENA.filter((regla) => !regla.cumple(contrasena)).map((regla) => regla.falta)
}
