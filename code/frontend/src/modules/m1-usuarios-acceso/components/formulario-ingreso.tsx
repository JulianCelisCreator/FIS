import { useState, type FormEvent } from 'react'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'
import { Alerta, Campo } from '../../../shared/ui/componentes.tsx'
import { ingresar } from '../services/acceso.service.ts'
import { describirCampo } from '../utils/describir-campo.ts'
import { validarIngreso, type CamposIngreso, type ErroresIngreso } from '../utils/validar-ingreso.ts'

const ORDEN_CAMPOS: (keyof CamposIngreso)[] = ['correo', 'contrasena']

/**
 * HU-M1-02 · Inicio de sesión con correo y contraseña. Sin selector de rol: el
 * sistema identifica los roles de la cuenta. Al ingresar, la sesión queda en
 * el proveedor y la aplicación muestra las pantallas autorizadas.
 */
export function FormularioIngreso() {
  const { establecerSesion } = useSesion()
  const [campos, setCampos] = useState<CamposIngreso>({ correo: '', contrasena: '' })
  const [errores, setErrores] = useState<ErroresIngreso>({})
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [verContrasena, setVerContrasena] = useState(false)

  const cambiar = (campo: keyof CamposIngreso, valor: string) => {
    const siguientes = { ...campos, [campo]: valor }
    setCampos(siguientes)
    if (intentado) setErrores(validarIngreso(siguientes))
  }

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviando) return
    setIntentado(true)
    setErrorGeneral(null)

    // CA-05: si falta un dato se indica aquí, sin llamar al servidor.
    const encontrados = validarIngreso(campos)
    setErrores(encontrados)
    const primero = ORDEN_CAMPOS.find((campo) => encontrados[campo])
    if (primero) {
      document.getElementById(`ingreso-${primero}`)?.focus()
      return
    }

    setEnviando(true)
    try {
      establecerSesion(await ingresar({ correo: campos.correo.trim(), contrasena: campos.contrasena }))
    } catch (error) {
      // CA-02 y CA-03: el mensaje de la API no revela cuál dato falló.
      setErrorGeneral(error instanceof Error ? error.message : 'No se pudo ingresar. Intenta de nuevo.')
      setCampos((actuales) => ({ ...actuales, contrasena: '' }))
      document.getElementById('ingreso-contrasena')?.focus()
      setEnviando(false)
    }
  }

  return (
    <form className="vl-stack" noValidate onSubmit={enviar}>
      {errorGeneral && (
        <Alerta tono="error" titulo="No pudimos iniciar tu sesión">
          <p>{errorGeneral}</p>
        </Alerta>
      )}

      <Campo etiqueta="Correo electrónico" id="ingreso-correo" obligatorio error={errores.correo}>
        <input
          id="ingreso-correo"
          className="vl-input"
          type="email"
          inputMode="email"
          autoComplete="username"
          spellCheck={false}
          placeholder="laura.cubillos@example.com"
          value={campos.correo}
          onChange={(evento) => cambiar('correo', evento.target.value)}
          {...describirCampo('ingreso-correo', errores.correo)}
        />
      </Campo>

      <Campo etiqueta="Contraseña" id="ingreso-contrasena" obligatorio error={errores.contrasena}>
        <input
          id="ingreso-contrasena"
          className="vl-input"
          type={verContrasena ? 'text' : 'password'}
          autoComplete="current-password"
          value={campos.contrasena}
          onChange={(evento) => cambiar('contrasena', evento.target.value)}
          {...describirCampo('ingreso-contrasena', errores.contrasena)}
        />
      </Campo>
      <label className="vl-check-row m1-acceso__ver">
        <input
          className="vl-radio"
          type="checkbox"
          checked={verContrasena}
          onChange={(evento) => setVerContrasena(evento.target.checked)}
        />
        <span className="vl-text-body-sm">Mostrar contraseña</span>
      </label>

      <button className="vl-button vl-button--primary m1-acceso__accion" type="submit" aria-disabled={enviando || undefined}>
        {enviando ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}
