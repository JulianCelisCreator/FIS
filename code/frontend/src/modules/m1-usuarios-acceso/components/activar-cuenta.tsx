import { useState, type FormEvent } from 'react'
import type { Sesion } from '../../../shared/sesion/sesion.types.ts'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'
import { Alerta, Campo } from '../../../shared/ui/componentes.tsx'
import { activarCuenta, type DatosIngreso } from '../services/acceso.service.ts'
import { describirCampo } from '../utils/describir-campo.ts'
import { reglasIncumplidas } from '../utils/politica-contrasena.ts'
import { MarcoAcceso } from './pantalla-acceso.tsx'
import { ReglasContrasena } from './reglas-contrasena.tsx'

type Errores = { nueva?: string; confirmacion?: string }

/**
 * HU-M1-12 · «Crea tu contraseña» en el primer ingreso. Llega desde el ingreso
 * cuando la cuenta está «Por registrar» (CA-02), con el correo y la contraseña
 * temporal que la persona acaba de escribir; solo viven en memoria mientras
 * dura esta pantalla. Al guardar, la cuenta queda «Activa» (CA-03) y la
 * persona entra con la sesión que abre la API.
 */
export function ActivarCuenta({ credenciales, alCancelar }: { credenciales: DatosIngreso; alCancelar: () => void }) {
  const { establecerSesion } = useSesion()
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [ver, setVer] = useState(false)
  const [errores, setErrores] = useState<Errores>({})
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [sesion, setSesion] = useState<Sesion | null>(null)

  const validar = (n: string, c: string): Errores => {
    const faltan = reglasIncumplidas(n)
    return {
      nueva: !n
        ? 'Escribe la nueva contraseña'
        : faltan.length
          ? faltan.join('. ')
          : n === credenciales.contrasena
            ? 'La nueva contraseña debe ser distinta de la temporal'
            : undefined,
      confirmacion: !c ? 'Repite la nueva contraseña' : c !== n ? 'Las contraseñas no coinciden' : undefined,
    }
  }

  const cambiar = (n: string, c: string) => {
    setNueva(n)
    setConfirmacion(c)
    if (intentado) setErrores(validar(n, c))
  }

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviando) return
    setIntentado(true)
    setErrorGeneral(null)
    const encontrados = validar(nueva, confirmacion)
    setErrores(encontrados)
    if (encontrados.nueva || encontrados.confirmacion) {
      document.getElementById(encontrados.nueva ? 'activar-nueva' : 'activar-confirmacion')?.focus()
      return
    }
    setEnviando(true)
    try {
      setSesion(await activarCuenta(credenciales, nueva))
    } catch (error) {
      setErrorGeneral(error instanceof Error ? error.message : 'No se pudo activar la cuenta. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  if (sesion) {
    return (
      <MarcoAcceso titulo="Cuenta activada" texto="Desde ahora ingresas con la contraseña que acabas de crear.">
        <div className="vl-stack">
          <Alerta tono="success" titulo="Tu cuenta está activa">
            <p>Ya puedes usar Velora. Tu contraseña temporal dejó de funcionar.</p>
          </Alerta>
          <button className="vl-button vl-button--primary m1-acceso__accion" type="button" onClick={() => establecerSesion(sesion)}>
            Entrar a Velora
          </button>
        </div>
      </MarcoAcceso>
    )
  }

  return (
    <MarcoAcceso titulo="Crea tu contraseña" texto={`Cuenta ${credenciales.correo}`}>
      <form className="vl-stack" noValidate onSubmit={enviar}>
        <Alerta tono="info" titulo="Es tu primer ingreso">
          <p>Crea una contraseña personal para activar tu cuenta. La contraseña temporal deja de servir al guardarla.</p>
        </Alerta>
        {errorGeneral && (
          <Alerta tono="error" titulo="No se pudo activar la cuenta">
            <p>{errorGeneral}</p>
          </Alerta>
        )}
        <Campo etiqueta="Nueva contraseña" id="activar-nueva" obligatorio error={errores.nueva}>
          <input
            id="activar-nueva"
            className="vl-input"
            type={ver ? 'text' : 'password'}
            autoComplete="new-password"
            value={nueva}
            onChange={(evento) => cambiar(evento.target.value, confirmacion)}
            aria-invalid={errores.nueva ? true : undefined}
            aria-describedby={['activar-reglas', errores.nueva && 'activar-nueva-error'].filter(Boolean).join(' ')}
          />
        </Campo>
        <ReglasContrasena id="activar-reglas" contrasena={nueva} />
        <Campo etiqueta="Repite la nueva contraseña" id="activar-confirmacion" obligatorio error={errores.confirmacion}>
          <input
            id="activar-confirmacion"
            className="vl-input"
            type={ver ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmacion}
            onChange={(evento) => cambiar(nueva, evento.target.value)}
            {...describirCampo('activar-confirmacion', errores.confirmacion)}
          />
        </Campo>
        <label className="vl-check-row m1-acceso__ver">
          <input className="vl-radio" type="checkbox" checked={ver} onChange={(evento) => setVer(evento.target.checked)} />
          <span className="vl-text-body-sm">Mostrar contraseñas</span>
        </label>
        <button className="vl-button vl-button--primary m1-acceso__accion" type="submit" aria-disabled={enviando || undefined}>
          {enviando ? 'Activando…' : 'Activar cuenta'}
        </button>
        <button className="vl-link app-boton-enlace m1-acceso__enlace" type="button" onClick={alCancelar}>
          Volver a iniciar sesión
        </button>
      </form>
    </MarcoAcceso>
  )
}
