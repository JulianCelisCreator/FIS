/** Atributos de accesibilidad de un control dentro de <Campo>. */
export function describirControl(id: string, ayuda?: string, error?: string | null) {
  const descripciones = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean)
  return {
    id,
    'aria-describedby': descripciones.length ? descripciones.join(' ') : undefined,
    'aria-invalid': error ? true : undefined,
  }
}
