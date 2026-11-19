/** Texto de búsqueda → patrón ILIKE con los comodines escapados; null si está vacío. */
export function patronBusqueda(texto?: string): string | null {
  const limpio = texto?.trim();
  return limpio ? `%${limpio.replace(/[\\%_]/g, '\\$&')}%` : null;
}
