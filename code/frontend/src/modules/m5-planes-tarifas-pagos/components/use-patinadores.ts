import { useEffect, useState } from 'react'
import { buscarPatinadores } from '../services/m5.service.ts'
import type { PatinadorM5 } from '../types/m5.types.ts'

interface Respuesta {
  /** Consulta que respondió; si no coincide con la actual, se está cargando. */
  consulta: string
  patinadores: PatinadorM5[]
  error: string | null
}

/**
 * Patinadores visibles para el usuario que coinciden con `texto` (espera 300 ms
 * a que se deje de escribir), o solo `patinadorId` si se indica. `recargar`
 * vuelve a consultar, p. ej. tras un pago.
 */
export function usePatinadores(texto: string, patinadorId?: number) {
  const [version, setVersion] = useState(0)
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null)
  const consulta = `${texto.trim()}|${patinadorId ?? ''}|${version}`

  useEffect(() => {
    let vigente = true
    const espera = setTimeout(() => {
      buscarPatinadores(texto.trim(), patinadorId)
        .then((patinadores) => vigente && setRespuesta({ consulta, patinadores, error: null }))
        .catch(
          (e: Error) =>
            vigente &&
            setRespuesta((anterior) => ({ consulta, patinadores: anterior?.patinadores ?? [], error: e.message })),
        )
    }, 300)
    return () => {
      vigente = false
      clearTimeout(espera)
    }
  }, [consulta, texto, patinadorId])

  const respondida = respuesta?.consulta === consulta
  return {
    patinadores: respuesta?.patinadores ?? [],
    cargando: !respondida,
    error: respondida ? respuesta.error : null,
    recargar: () => setVersion((v) => v + 1),
  }
}
