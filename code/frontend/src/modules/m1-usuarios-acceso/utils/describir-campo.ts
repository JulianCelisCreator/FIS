/** Atributos de accesibilidad de un control según su error y su ayuda (ids de Campo). */
export function describirCampo(id: string, error: string | undefined, conAyuda = false) {
  const descripciones = [conAyuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(' ')
  return { 'aria-invalid': error ? true : undefined, 'aria-describedby': descripciones || undefined }
}
