import { useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/services/cliente-api.ts'
import { Alerta, Campo, Insignia, ListaDatos } from '../../../shared/ui/componentes.tsx'
import { registrarCuenta } from '../services/acceso.service.ts'
import { ROLES_AUTORREGISTRO, type CuentaRegistrada, type RolAutorregistro } from '../types/acceso.types.ts'
import {
  LONGITUD_MINIMA_CONTRASENA,
  validarRegistro,
  type CamposRegistro,
  type ErroresRegistro,
} from '../utils/validar-registro.ts'
import { describirCampo } from '../utils/describir-campo.ts'

const VACIO: CamposRegistro = { nombres: '', apellidos: '', correo: '', contrasena: '', rol: '' }

const ORDEN_CAMPOS: (keyof CamposRegistro)[] = ['nombres', 'apellidos', 'correo', 'contrasena', 'rol']

/**
 * RF-M1-01 · Registro de usuario (W01, pestaña «Registrarse»). Los errores
 * aparecen solo después de intentar enviar; el correo duplicado se muestra en
 * su campo.
 */
export function FormularioRegistro({ alIrAIngresar }: { alIrAIngresar?: (cuenta: CuentaRegistrada) => void }) {
  const [campos, setCampos] = useState<CamposRegistro>(VACIO)
  const [errores, setErrores] = useState<ErroresRegistro>({})
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [verContrasena, setVerContrasena] = useState(false)
  const [cuenta, setCuenta] = useState<CuentaRegistrada | null>(null)

  const cambiar = (campo: keyof CamposRegistro, valor: string) => {
    const siguientes = { ...campos, [campo]: valor }
    setCampos(siguientes)
    // Tras el primer intento, el error del campo se actualiza mientras se corrige.
    if (intentado) setErrores(validarRegistro(siguientes))
  }

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviando) return
    setIntentado(true)
    setErrorGeneral(null)

    const encontrados = validarRegistro(campos)
    setErrores(encontrados)
    const primero = ORDEN_CAMPOS.find((campo) => encontrados[campo])
    if (primero) {
      document.getElementById(`registro-${primero}`)?.focus()
      return
    }

    setEnviando(true)
    try {
      setCuenta(
        await registrarCuenta({
          nombres: campos.nombres.trim(),
          apellidos: campos.apellidos.trim(),
          correo: campos.correo.trim(),
          contrasena: campos.contrasena,
          rol: campos.rol as RolAutorregistro,
        }),
      )
    } catch (error) {
      if (error instanceof ErrorApi && error.estado === 409) {
        setErrores({ correo: error.message })
        document.getElementById('registro-correo')?.focus()
      } else {
        setErrorGeneral(error instanceof Error ? error.message : 'No se pudo crear la cuenta. Intenta de nuevo.')
      }
    } finally {
      setEnviando(false)
    }
  }

  if (cuenta) {
    const rol = ROLES_AUTORREGISTRO.find((opcion) => opcion.rol === cuenta.rol)?.texto ?? cuenta.rol
    return (
      <div className="vl-stack m1-acceso__resultado" role="status">
        <Alerta tono="success" titulo="Cuenta creada">
          <p>Ya puedes ingresar con tu correo y tu contraseña.</p>
        </Alerta>
        <ListaDatos
          filas={[
            ['Nombre', cuenta.nombre],
            ['Correo', <span key="correo" className="m1-acceso__dato">{cuenta.correo}</span>],
            ['Rol', rol],
            [
              'Verificación del correo',
              <Insignia key="verificacion" entidad="correo" estado={cuenta.correoVerificado ? 'verificado' : 'pendiente-verificacion'} />,
            ],
          ]}
        />
        {alIrAIngresar && (
          <button className="vl-button vl-button--primary m1-acceso__accion" type="button" onClick={() => alIrAIngresar(cuenta)}>
            Ir a ingresar
          </button>
        )}
      </div>
    )
  }

  return (
    <form className="vl-stack" noValidate onSubmit={enviar} aria-describedby={errorGeneral ? 'registro-error' : undefined}>
      {errorGeneral && (
        <div id="registro-error">
          <Alerta tono="error" titulo="No se pudo crear la cuenta">
            <p>{errorGeneral}</p>
          </Alerta>
        </div>
      )}

      <div className="m1-acceso__fila">
        <Campo etiqueta="Nombres" id="registro-nombres" obligatorio error={errores.nombres}>
          <input
            id="registro-nombres"
            className="vl-input"
            autoComplete="given-name"
            placeholder="Sofía"
            value={campos.nombres}
            onChange={(evento) => cambiar('nombres', evento.target.value)}
            {...describirCampo('registro-nombres', errores.nombres)}
          />
        </Campo>
        <Campo etiqueta="Apellidos" id="registro-apellidos" obligatorio error={errores.apellidos}>
          <input
            id="registro-apellidos"
            className="vl-input"
            autoComplete="family-name"
            placeholder="Ramírez"
            value={campos.apellidos}
            onChange={(evento) => cambiar('apellidos', evento.target.value)}
            {...describirCampo('registro-apellidos', errores.apellidos)}
          />
        </Campo>
      </div>

      <Campo etiqueta="Correo electrónico" id="registro-correo" obligatorio error={errores.correo}>
        <input
          id="registro-correo"
          className="vl-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          placeholder="sofia@example.com"
          value={campos.correo}
          onChange={(evento) => cambiar('correo', evento.target.value)}
          {...describirCampo('registro-correo', errores.correo)}
        />
      </Campo>

      <Campo
        etiqueta="Contraseña"
        id="registro-contrasena"
        obligatorio
        ayuda={`Mínimo ${LONGITUD_MINIMA_CONTRASENA} caracteres, con al menos una letra y un número.`}
        error={errores.contrasena}
      >
        <input
          id="registro-contrasena"
          className="vl-input"
          type={verContrasena ? 'text' : 'password'}
          autoComplete="new-password"
          value={campos.contrasena}
          onChange={(evento) => cambiar('contrasena', evento.target.value)}
          {...describirCampo('registro-contrasena', errores.contrasena, true)}
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

      <Campo
        etiqueta="Me registro como"
        id="registro-rol"
        obligatorio
        ayuda="Si registras a un menor de edad, necesitarás su autorización y su póliza vigente."
        error={errores.rol}
      >
        <select
          id="registro-rol"
          className="vl-select"
          value={campos.rol}
          onChange={(evento) => cambiar('rol', evento.target.value)}
          {...describirCampo('registro-rol', errores.rol, true)}
        >
          <option value="">Elige un rol…</option>
          {ROLES_AUTORREGISTRO.map((opcion) => (
            <option key={opcion.rol} value={opcion.rol}>
              {opcion.texto}
            </option>
          ))}
        </select>
      </Campo>

      <button
        className="vl-button vl-button--primary m1-acceso__accion"
        type="submit"
        aria-disabled={enviando || undefined}
      >
        {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  )
}
