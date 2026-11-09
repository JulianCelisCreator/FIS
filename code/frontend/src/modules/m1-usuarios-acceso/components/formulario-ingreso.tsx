import { useState, type FormEvent } from 'react'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'
import type { Rol } from '../../../shared/sesion/sesion.types.ts'
import { Alerta, Campo } from '../../../shared/ui/componentes.tsx'
import { ingresar } from '../services/acceso.service.ts'
import { ROLES_INGRESO } from '../types/acceso.types.ts'
import { describirCampo } from '../utils/describir-campo.ts'
import { validarIngreso, type CamposIngreso, type ErroresIngreso } from '../utils/validar-ingreso.ts'

const ORDEN_CAMPOS: (keyof CamposIngreso)[] = ['correo', 'contrasena', 'rol']

/**
 * RF-M1-02 · Inicio de sesión (W01, pestaña «Ingresar»): correo, contraseña y
 * el rol con el que se ingresa («Soy»). Al ingresar, la sesión queda en el
 * proveedor y la aplicación muestra las pantallas de ese rol.
 */
export function FormularioIngreso({ inicial }: { inicial?: { correo?: string; rol?: Rol } }) {
  const { establecerSesion } = useSesion()
  const [campos, setCampos] = useState<CamposIngreso>({
    correo: inicial?.correo ?? '',
    contrasena: '',
    rol: inicial?.rol ?? '',
  })
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

    const encontrados = validarIngreso(campos)
    setErrores(encontrados)
    const primero = ORDEN_CAMPOS.find((campo) => encontrados[campo])
    if (primero) {
      document.getElementById(`ingreso-${primero}`)?.focus()
      return
    }

    setEnviando(true)
    try {
      const sesion = await ingresar({ correo: campos.correo.trim(), contrasena: campos.contrasena, rol: campos.rol as Rol })
      establecerSesion(sesion)
    } catch (error) {
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
          placeholder="sofia@example.com"
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

      <Campo etiqueta="Soy" id="ingreso-rol" obligatorio error={errores.rol}>
        <select
          id="ingreso-rol"
          className="vl-select"
          value={campos.rol}
          onChange={(evento) => cambiar('rol', evento.target.value)}
          {...describirCampo('ingreso-rol', errores.rol)}
        >
          <option value="">Elige tu rol…</option>
          {ROLES_INGRESO.map((opcion) => (
            <option key={opcion.rol} value={opcion.rol}>
              {opcion.texto}
            </option>
          ))}
        </select>
      </Campo>

      <button className="vl-button vl-button--primary m1-acceso__accion" type="submit" aria-disabled={enviando || undefined}>
        {enviando ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}
