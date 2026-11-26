import { useState, type FormEvent } from 'react'
import { Alerta, Campo } from '../../../shared/ui/componentes.tsx'
import { solicitarRecuperacion } from '../services/acceso.service.ts'
import { describirCampo } from '../utils/describir-campo.ts'
import { MarcoAcceso } from './pantalla-acceso.tsx'

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * HU-M1-08 · «Recuperar contraseña» (CA-01). Tras enviar se muestra siempre la
 * misma confirmación, exista o no la cuenta, para no revelar qué correos
 * están registrados.
 */
export function RecuperarContrasena() {
  const [correo, setCorreo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [confirmacion, setConfirmacion] = useState<string | null>(null)

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviando) return
    setErrorGeneral(null)
    const valor = correo.trim()
    const encontrado = !valor ? 'Escribe tu correo electrónico' : CORREO.test(valor) ? null : 'Escribe un correo electrónico válido'
    setError(encontrado)
    if (encontrado) {
      document.getElementById('recuperar-correo')?.focus()
      return
    }
    setEnviando(true)
    try {
      setConfirmacion((await solicitarRecuperacion(valor)).mensaje)
    } catch (e) {
      setErrorGeneral(e instanceof Error ? e.message : 'No se pudo enviar la solicitud. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  if (confirmacion) {
    return (
      <MarcoAcceso titulo="Revisa tu correo" texto="Te enviamos las instrucciones si la cuenta existe.">
        <div className="vl-stack">
          <Alerta tono="info" titulo="Solicitud recibida">
            <p>{confirmacion}</p>
            <p>El enlace vence en 30 minutos y sirve una sola vez.</p>
          </Alerta>
          <a className="vl-link m1-acceso__enlace" href="#/">
            Volver a iniciar sesión
          </a>
        </div>
      </MarcoAcceso>
    )
  }

  return (
    <MarcoAcceso
      titulo="Recuperar contraseña"
      texto="Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva contraseña."
    >
      <form className="vl-stack" noValidate onSubmit={enviar}>
        {errorGeneral && (
          <Alerta tono="error" titulo="No se pudo enviar la solicitud">
            <p>{errorGeneral}</p>
          </Alerta>
        )}
        <Campo etiqueta="Correo electrónico" id="recuperar-correo" obligatorio error={error}>
          <input
            id="recuperar-correo"
            className="vl-input"
            type="email"
            inputMode="email"
            autoComplete="username"
            spellCheck={false}
            placeholder="laura.cubillos@example.com"
            value={correo}
            onChange={(evento) => setCorreo(evento.target.value)}
            {...describirCampo('recuperar-correo', error ?? undefined)}
          />
        </Campo>
        <button className="vl-button vl-button--primary m1-acceso__accion" type="submit" aria-disabled={enviando || undefined}>
          {enviando ? 'Enviando…' : 'Enviar enlace'}
        </button>
        <a className="vl-link m1-acceso__enlace" href="#/">
          Volver a iniciar sesión
        </a>
      </form>
    </MarcoAcceso>
  )
}
