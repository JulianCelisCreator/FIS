import { useEffect, useState, type FormEvent } from 'react'
import { Alerta, Campo } from '../../../shared/ui/componentes.tsx'
import { restablecerContrasena, validarEnlaceRecuperacion } from '../services/acceso.service.ts'
import { describirCampo } from '../utils/describir-campo.ts'
import { reglasIncumplidas } from '../utils/politica-contrasena.ts'
import { MarcoAcceso } from './pantalla-acceso.tsx'
import { ReglasContrasena } from './reglas-contrasena.tsx'

type Errores = { nueva?: string; confirmacion?: string }

/**
 * HU-M1-08 · «Nueva contraseña», a la que lleva el enlace del correo.
 * CA-02: primero comprueba que el enlace sirva; si venció o ya se usó, lo dice
 * y ofrece pedir otro. CA-04: marca en vivo qué condición falta. CA-03: al
 * guardar informa el resultado y lleva al ingreso.
 */
export function RestablecerContrasena({ token }: { token: string }) {
  const [estado, setEstado] = useState<'verificando' | 'invalido' | 'formulario' | 'listo'>('verificando')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [ver, setVer] = useState(false)
  const [errores, setErrores] = useState<Errores>({})
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    let vigente = true
    validarEnlaceRecuperacion(token)
      .then(({ valido }) => vigente && setEstado(valido ? 'formulario' : 'invalido'))
      .catch(() => vigente && setEstado('invalido'))
    return () => {
      vigente = false
    }
  }, [token])

  const validar = (n: string, c: string): Errores => {
    const faltan = reglasIncumplidas(n)
    return {
      nueva: n ? (faltan.length ? faltan.join('. ') : undefined) : 'Escribe la nueva contraseña',
      confirmacion: !c ? 'Repite la nueva contraseña' : c !== n ? 'Las contraseñas no coinciden' : undefined,
    }
  }

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviando) return
    setIntentado(true)
    setErrorGeneral(null)
    const encontrados = validar(nueva, confirmacion)
    setErrores(encontrados)
    if (encontrados.nueva || encontrados.confirmacion) {
      document.getElementById(encontrados.nueva ? 'restablecer-nueva' : 'restablecer-confirmacion')?.focus()
      return
    }
    setEnviando(true)
    try {
      setMensaje((await restablecerContrasena(token, nueva)).mensaje)
      setEstado('listo')
    } catch (e) {
      const texto = e instanceof Error ? e.message : 'No se pudo guardar la contraseña.'
      // Si el enlace venció mientras escribía, se pasa al estado de enlace inválido.
      if (texto.includes('enlace')) setEstado('invalido')
      else setErrorGeneral(texto)
    } finally {
      setEnviando(false)
    }
  }

  const cambiar = (n: string, c: string) => {
    setNueva(n)
    setConfirmacion(c)
    if (intentado) setErrores(validar(n, c))
  }

  if (estado === 'verificando') {
    return (
      <MarcoAcceso titulo="Nueva contraseña" texto="Estamos comprobando tu enlace.">
        <p className="vl-text-body-sm" role="status">Comprobando el enlace…</p>
      </MarcoAcceso>
    )
  }

  if (estado === 'invalido') {
    return (
      <MarcoAcceso titulo="Enlace no válido" texto="Pide un enlace nuevo para recuperar tu contraseña.">
        <div className="vl-stack">
          <Alerta tono="error" titulo="Este enlace ya no sirve">
            <p>Ya se usó, venció (dura 30 minutos) o no es correcto.</p>
          </Alerta>
          <a className="vl-button vl-button--primary m1-acceso__accion" href="#/recuperar">
            Pedir un enlace nuevo
          </a>
          <a className="vl-link m1-acceso__enlace" href="#/">
            Volver a iniciar sesión
          </a>
        </div>
      </MarcoAcceso>
    )
  }

  if (estado === 'listo') {
    return (
      <MarcoAcceso titulo="Contraseña actualizada" texto="Por seguridad, cerramos las sesiones abiertas con la contraseña anterior.">
        <div className="vl-stack">
          <Alerta tono="success" titulo="Listo">
            <p>{mensaje}</p>
          </Alerta>
          <a className="vl-button vl-button--primary m1-acceso__accion" href="#/">
            Ir a iniciar sesión
          </a>
        </div>
      </MarcoAcceso>
    )
  }

  return (
    <MarcoAcceso titulo="Nueva contraseña" texto="Crea una contraseña que solo tú conozcas.">
      <form className="vl-stack" noValidate onSubmit={enviar}>
        {errorGeneral && (
          <Alerta tono="error" titulo="No se pudo guardar la contraseña">
            <p>{errorGeneral}</p>
          </Alerta>
        )}
        <Campo etiqueta="Nueva contraseña" id="restablecer-nueva" obligatorio error={errores.nueva}>
          <input
            id="restablecer-nueva"
            className="vl-input"
            type={ver ? 'text' : 'password'}
            autoComplete="new-password"
            value={nueva}
            onChange={(evento) => cambiar(evento.target.value, confirmacion)}
            aria-invalid={errores.nueva ? true : undefined}
            aria-describedby={['restablecer-reglas', errores.nueva && 'restablecer-nueva-error'].filter(Boolean).join(' ')}
          />
        </Campo>
        <ReglasContrasena id="restablecer-reglas" contrasena={nueva} />
        <Campo etiqueta="Repite la nueva contraseña" id="restablecer-confirmacion" obligatorio error={errores.confirmacion}>
          <input
            id="restablecer-confirmacion"
            className="vl-input"
            type={ver ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmacion}
            onChange={(evento) => cambiar(nueva, evento.target.value)}
            {...describirCampo('restablecer-confirmacion', errores.confirmacion)}
          />
        </Campo>
        <label className="vl-check-row m1-acceso__ver">
          <input className="vl-radio" type="checkbox" checked={ver} onChange={(evento) => setVer(evento.target.checked)} />
          <span className="vl-text-body-sm">Mostrar contraseñas</span>
        </label>
        <button className="vl-button vl-button--primary m1-acceso__accion" type="submit" aria-disabled={enviando || undefined}>
          {enviando ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </MarcoAcceso>
  )
}
