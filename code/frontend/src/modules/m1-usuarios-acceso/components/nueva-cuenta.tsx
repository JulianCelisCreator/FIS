import { useState, type FormEvent } from 'react'
import { ErrorApi } from '../../../shared/services/cliente-api.ts'
import { Alerta, Campo, Insignia, ListaDatos } from '../../../shared/ui/componentes.tsx'
import { crearCuenta } from '../services/cuentas.service.ts'
import { ROLES_CUENTA, type CuentaCreada, type RolCuenta } from '../types/cuentas.types.ts'
import { describirCampo } from '../utils/describir-campo.ts'
import { validarCuenta, type CamposCuenta, type ErroresCuenta } from '../utils/validar-cuenta.ts'
import './nueva-cuenta.css'

const VACIO: CamposCuenta = { nombres: '', apellidos: '', correo: '', rol: '' }
const ORDEN_CAMPOS: (keyof CamposCuenta)[] = ['nombres', 'apellidos', 'correo', 'rol']

/**
 * HU-M1-01 · Nueva cuenta. El Administrador registra los datos básicos y el
 * rol. Al crearla, ve una sola vez la contraseña temporal para entregarla.
 */
export function NuevaCuenta() {
  const [campos, setCampos] = useState<CamposCuenta>(VACIO)
  const [errores, setErrores] = useState<ErroresCuenta>({})
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [cuenta, setCuenta] = useState<CuentaCreada | null>(null)

  const cambiar = (campo: keyof CamposCuenta, valor: string) => {
    const siguientes = { ...campos, [campo]: valor }
    setCampos(siguientes)
    // Tras el primer intento, cada error se actualiza mientras se corrige.
    if (intentado) setErrores(validarCuenta(siguientes))
  }

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviando) return
    setIntentado(true)
    setErrorGeneral(null)

    const encontrados = validarCuenta(campos)
    setErrores(encontrados)
    const primero = ORDEN_CAMPOS.find((campo) => encontrados[campo])
    if (primero) {
      document.getElementById(`cuenta-${primero}`)?.focus()
      return
    }

    setEnviando(true)
    try {
      setCuenta(
        await crearCuenta({
          nombres: campos.nombres.trim(),
          apellidos: campos.apellidos.trim(),
          correo: campos.correo.trim(),
          rol: campos.rol as RolCuenta,
        }),
      )
    } catch (error) {
      if (error instanceof ErrorApi && error.estado === 409) {
        // CA-02: el correo ya está en uso; el error va en su campo.
        setErrores({ correo: error.message })
        document.getElementById('cuenta-correo')?.focus()
      } else {
        setErrorGeneral(error instanceof Error ? error.message : 'No se pudo crear la cuenta. Intenta de nuevo.')
      }
    } finally {
      setEnviando(false)
    }
  }

  const otraCuenta = () => {
    setCuenta(null)
    setCampos(VACIO)
    setErrores({})
    setIntentado(false)
  }

  const cantidadErrores = Object.keys(errores).length

  return (
    <div className="app-page">
      <header className="vl-stack">
        <nav className="vl-breadcrumb" aria-label="Ruta">
          <span>Usuarios</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Nueva cuenta</span>
        </nav>
        <h1>Nueva cuenta</h1>
        <p className="vl-text-body-sm">
          Registra a un profesor, patinador, acudiente, contador o fisioterapeuta. La persona recibe una contraseña temporal
          para su primer ingreso.
        </p>
      </header>

      {cuenta ? (
        <ResultadoCuenta cuenta={cuenta} alCrearOtra={otraCuenta} />
      ) : (
        <form className="vl-card vl-stack m1-cuenta" noValidate onSubmit={enviar}>
          {errorGeneral && (
            <Alerta tono="error" titulo="No se pudo crear la cuenta">
              <p>{errorGeneral}</p>
            </Alerta>
          )}
          {!errorGeneral && cantidadErrores > 1 && (
            <Alerta tono="error" titulo={`Revisa ${cantidadErrores} campos`}>
              <p>Cada campo indica qué debes corregir.</p>
            </Alerta>
          )}

          <div className="m1-cuenta__fila">
            <Campo etiqueta="Nombres" id="cuenta-nombres" obligatorio error={errores.nombres}>
              <input
                id="cuenta-nombres"
                className="vl-input"
                autoComplete="off"
                placeholder="Laura"
                value={campos.nombres}
                onChange={(evento) => cambiar('nombres', evento.target.value)}
                {...describirCampo('cuenta-nombres', errores.nombres)}
              />
            </Campo>
            <Campo etiqueta="Apellidos" id="cuenta-apellidos" obligatorio error={errores.apellidos}>
              <input
                id="cuenta-apellidos"
                className="vl-input"
                autoComplete="off"
                placeholder="Cubillos"
                value={campos.apellidos}
                onChange={(evento) => cambiar('apellidos', evento.target.value)}
                {...describirCampo('cuenta-apellidos', errores.apellidos)}
              />
            </Campo>
          </div>

          <Campo etiqueta="Correo electrónico" id="cuenta-correo" obligatorio error={errores.correo}>
            <input
              id="cuenta-correo"
              className="vl-input"
              type="email"
              inputMode="email"
              autoComplete="off"
              spellCheck={false}
              placeholder="laura.cubillos@example.com"
              value={campos.correo}
              onChange={(evento) => cambiar('correo', evento.target.value)}
              {...describirCampo('cuenta-correo', errores.correo)}
            />
          </Campo>

          <Campo
            etiqueta="Rol"
            id="cuenta-rol"
            obligatorio
            ayuda="Define qué podrá ver y hacer la persona en la plataforma."
            error={errores.rol}
          >
            <select
              id="cuenta-rol"
              className="vl-select"
              value={campos.rol}
              onChange={(evento) => cambiar('rol', evento.target.value)}
              {...describirCampo('cuenta-rol', errores.rol, true)}
            >
              <option value="">Elige un rol…</option>
              {ROLES_CUENTA.map((opcion) => (
                <option key={opcion.rol} value={opcion.rol}>
                  {opcion.texto}
                </option>
              ))}
            </select>
          </Campo>

          <div className="app-actions m1-cuenta__acciones">
            <a className="vl-button vl-button--secondary" href="#/">
              Cancelar
            </a>
            <button className="vl-button vl-button--primary" type="submit" aria-disabled={enviando || undefined}>
              {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

/** Resultado de CA-01: cuenta creada y contraseña temporal, que no se vuelve a mostrar. */
function ResultadoCuenta({ cuenta, alCrearOtra }: { cuenta: CuentaCreada; alCrearOtra: () => void }) {
  const [copiada, setCopiada] = useState(false)
  const rol = ROLES_CUENTA.find((opcion) => opcion.rol === cuenta.rol)?.texto ?? cuenta.rol

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(cuenta.contrasenaTemporal)
      setCopiada(true)
    } catch {
      setCopiada(false)
    }
  }

  return (
    <section className="vl-card vl-stack m1-cuenta" aria-labelledby="cuenta-creada">
      <Alerta tono="success" titulo="Cuenta creada">
        <p id="cuenta-creada">La cuenta de {cuenta.nombre} quedó registrada con el rol {rol}.</p>
      </Alerta>

      <ListaDatos
        filas={[
          ['Nombre', cuenta.nombre],
          ['Correo', <span key="correo" className="m1-cuenta__dato">{cuenta.correo}</span>],
          ['Rol', rol],
          ['Estado', <Insignia key="estado" entidad="cuenta" estado="por-registrar" />],
        ]}
      />

      <div className="m1-cuenta__clave">
        <p className="vl-field__label" id="clave-temporal-titulo">
          Contraseña temporal
        </p>
        <div className="m1-cuenta__clave-fila">
          <output className="m1-cuenta__clave-valor" aria-labelledby="clave-temporal-titulo">
            {cuenta.contrasenaTemporal}
          </output>
          <button className="vl-button vl-button--secondary vl-button--sm" type="button" onClick={copiar}>
            {copiada ? 'Copiada' : 'Copiar'}
          </button>
        </div>
        <p className="vl-field__help">
          Entrégala a la persona por un medio seguro. Solo se muestra ahora: si sales de esta pantalla no podrás volver a
          verla.
        </p>
      </div>

      <div className="app-actions m1-cuenta__acciones">
        <button className="vl-button vl-button--primary" type="button" onClick={alCrearOtra}>
          Crear otra cuenta
        </button>
      </div>
    </section>
  )
}
