import { useEffect, useState } from 'react'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'
import { Alerta } from '../../../shared/ui/componentes.tsx'
import { consultarMiCuenta, reenviarVerificacion } from '../services/mi-cuenta.service.ts'

/**
 * HU-M1-04 · Aviso del AppShell mientras el correo no esté verificado, con la
 * acción «Reenviar enlace». Si la consulta falla, no muestra nada: el aviso no
 * debe impedir usar la aplicación.
 */
export function AvisoVerificacion() {
  const { sesion } = useSesion()
  const [correo, setCorreo] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null)

  useEffect(() => {
    if (!sesion) return
    let vigente = true
    consultarMiCuenta()
      .then((datos) => vigente && setCorreo(datos.correoVerificado ? null : datos.correo))
      .catch(() => vigente && setCorreo(null))
    return () => {
      vigente = false
    }
  }, [sesion])

  if (!sesion || !correo) return null

  const reenviar = async () => {
    if (enviando) return
    setEnviando(true)
    setResultado(null)
    try {
      setResultado({ ok: true, texto: (await reenviarVerificacion()).mensaje })
    } catch (e) {
      setResultado({ ok: false, texto: e instanceof Error ? e.message : 'No se pudo enviar el enlace.' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="app-aviso-verificacion">
      <Alerta tono="warning" titulo="Verifica tu correo">
        <p>
          Te enviamos un enlace a <strong>{correo}</strong>. Hasta que lo abras, algunas funciones, como registrar
          autorizaciones de tus patinadores, no estarán disponibles.
        </p>
        {resultado && <p className={resultado.ok ? undefined : 'vl-field__error'}>{resultado.texto}</p>}
        <button className="vl-button vl-button--secondary vl-button--sm" type="button" onClick={reenviar} aria-disabled={enviando || undefined}>
          {enviando ? 'Enviando…' : 'Reenviar enlace'}
        </button>
      </Alerta>
    </div>
  )
}
