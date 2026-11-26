import { useEffect, useState, type FormEvent } from 'react'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'
import { Alerta, Campo } from '../../../shared/ui/componentes.tsx'
import { confirmarVerificacion, reenviarVerificacionPorCorreo } from '../services/acceso.service.ts'
import { reenviarVerificacion } from '../services/mi-cuenta.service.ts'
import { describirCampo } from '../utils/describir-campo.ts'
import { MarcoAcceso } from './pantalla-acceso.tsx'

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Una sola confirmación por token. El enlace es de un solo uso: si React monta
 * el efecto dos veces (modo estricto), la segunda llamada diría «ya se usó».
 */
const confirmaciones = new Map<string, Promise<{ mensaje: string }>>()
function confirmarUnaVez(token: string) {
  let promesa = confirmaciones.get(token)
  if (!promesa) {
    promesa = confirmarVerificacion(token)
    confirmaciones.set(token, promesa)
  }
  return promesa
}

/**
 * HU-M1-04 · Pantalla pública a la que lleva el enlace del correo.
 * CA-02: si el enlace sirve, confirma que el correo quedó verificado.
 * CA-03: si no, explica el motivo (no existe, ya se usó o venció) y permite
 * pedir un enlace nuevo: con sesión se envía a la cuenta; sin sesión, se pide
 * el correo y la respuesta es la misma exista o no la cuenta.
 */
export function VerificarCorreo({ token }: { token: string }) {
  const { sesion } = useSesion()
  const [estado, setEstado] = useState<'verificando' | 'listo' | 'fallo'>('verificando')
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    let vigente = true
    confirmarUnaVez(token)
      .then(() => vigente && setEstado('listo'))
      .catch((error: unknown) => {
        if (!vigente) return
        setMotivo(error instanceof Error ? error.message : 'No se pudo verificar el correo.')
        setEstado('fallo')
      })
    return () => {
      vigente = false
    }
  }, [token])

  const destino = sesion ? { href: '#/', texto: 'Ir a Velora' } : { href: '#/', texto: 'Ir a iniciar sesión' }

  if (estado === 'verificando') {
    return (
      <MarcoAcceso titulo="Verificar correo" texto="Estamos comprobando tu enlace.">
        <p className="vl-text-body-sm" role="status">Comprobando el enlace…</p>
      </MarcoAcceso>
    )
  }

  if (estado === 'listo') {
    return (
      <MarcoAcceso titulo="Correo verificado" texto="Confirmamos que este correo es tuyo.">
        <div className="vl-stack">
          <Alerta tono="success" titulo="Listo">
            <p>Tu correo quedó verificado. Ya puedes usar todas las funciones de tu cuenta.</p>
          </Alerta>
          <a className="vl-button vl-button--primary m1-acceso__accion" href={destino.href}>
            {destino.texto}
          </a>
        </div>
      </MarcoAcceso>
    )
  }

  return (
    <MarcoAcceso titulo="No pudimos verificar tu correo" texto="Pide un enlace nuevo para intentarlo otra vez.">
      <div className="vl-stack">
        <Alerta tono="error" titulo="Este enlace no sirve">
          <p>{motivo}</p>
        </Alerta>
        <PedirEnlaceNuevo conSesion={Boolean(sesion)} />
        <a className="vl-link m1-acceso__enlace" href={destino.href}>
          {sesion ? 'Volver a Velora' : 'Volver a iniciar sesión'}
        </a>
      </div>
    </MarcoAcceso>
  )
}

/** CA-03: «Enviar un nuevo enlace». */
function PedirEnlaceNuevo({ conSesion }: { conSesion: boolean }) {
  const [correo, setCorreo] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ tono: 'info' | 'error'; texto: string } | null>(null)

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviando) return
    setResultado(null)
    if (!conSesion) {
      const problema = !correo.trim() ? 'Escribe tu correo' : CORREO_VALIDO.test(correo.trim()) ? undefined : 'Escribe un correo electrónico válido'
      setError(problema)
      if (problema) {
        document.getElementById('verificar-correo')?.focus()
        return
      }
    }
    setEnviando(true)
    try {
      const { mensaje } = conSesion ? await reenviarVerificacion() : await reenviarVerificacionPorCorreo(correo.trim())
      setResultado({ tono: 'info', texto: mensaje })
    } catch (e) {
      setResultado({ tono: 'error', texto: e instanceof Error ? e.message : 'No se pudo enviar el enlace.' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="vl-stack" noValidate onSubmit={enviar}>
      {resultado && (
        <Alerta tono={resultado.tono} titulo={resultado.tono === 'info' ? 'Enlace solicitado' : 'No se pudo enviar el enlace'}>
          <p role="status">{resultado.texto}</p>
        </Alerta>
      )}
      {!conSesion && (
        <Campo etiqueta="Tu correo" id="verificar-correo" obligatorio error={error}>
          <input
            id="verificar-correo"
            className="vl-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            value={correo}
            onChange={(evento) => setCorreo(evento.target.value)}
            {...describirCampo('verificar-correo', error)}
          />
        </Campo>
      )}
      <button className="vl-button vl-button--primary m1-acceso__accion" type="submit" aria-disabled={enviando || undefined}>
        {enviando ? 'Enviando…' : 'Enviar un nuevo enlace'}
      </button>
    </form>
  )
}
