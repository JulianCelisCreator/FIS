import { useEffect, useState, type FormEvent } from 'react'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'
import { NOMBRE_ROL } from '../../../shared/sesion/sesion.types.ts'
import { Alerta, Campo, Insignia, ListaDatos } from '../../../shared/ui/componentes.tsx'
import { cambiarContrasena, consultarMiCuenta, type DatosMiCuenta } from '../services/mi-cuenta.service.ts'
import { describirCampo } from '../utils/describir-campo.ts'
import { reglasIncumplidas } from '../utils/politica-contrasena.ts'
import { ReglasContrasena } from './reglas-contrasena.tsx'
import './pantalla-acceso.css'

type Campos = { actual: string; nueva: string; confirmacion: string }
type Errores = Partial<Record<keyof Campos, string>>
const VACIO: Campos = { actual: '', nueva: '', confirmacion: '' }

function validar(c: Campos): Errores {
  const faltan = reglasIncumplidas(c.nueva)
  return {
    actual: c.actual ? undefined : 'Escribe tu contraseña actual',
    nueva: !c.nueva ? 'Escribe la nueva contraseña' : faltan.length ? faltan.join('. ') : undefined,
    confirmacion: !c.confirmacion ? 'Repite la nueva contraseña' : c.confirmacion !== c.nueva ? 'Las contraseñas no coinciden' : undefined,
  }
}

/**
 * «Mi cuenta» (cualquier rol). HU-M1-08 CA-05: card «Cambiar contraseña»; pide
 * la actual y, al cambiarla, la API cierra las demás sesiones de la cuenta.
 */
export function MiCuenta() {
  const { sesion } = useSesion()
  const [campos, setCampos] = useState<Campos>(VACIO)
  const [errores, setErrores] = useState<Errores>({})
  const [intentado, setIntentado] = useState(false)
  const [ver, setVer] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<{ tono: 'success' | 'error'; texto: string } | null>(null)
  // HU-M1-04 CA-04: correo y si está verificado.
  const [datos, setDatos] = useState<DatosMiCuenta | null>(null)

  useEffect(() => {
    let vigente = true
    consultarMiCuenta()
      .then((d) => vigente && setDatos(d))
      .catch(() => vigente && setDatos(null))
    return () => {
      vigente = false
    }
  }, [])

  const cambiar = (campo: keyof Campos, valor: string) => {
    const siguientes = { ...campos, [campo]: valor }
    setCampos(siguientes)
    if (intentado) setErrores(validar(siguientes))
  }

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviando) return
    setIntentado(true)
    setAviso(null)
    const encontrados = validar(campos)
    setErrores(encontrados)
    const primero = (['actual', 'nueva', 'confirmacion'] as const).find((c) => encontrados[c])
    if (primero) {
      document.getElementById(`cuenta-clave-${primero}`)?.focus()
      return
    }
    setEnviando(true)
    try {
      const { mensaje } = await cambiarContrasena(campos.actual, campos.nueva)
      setAviso({ tono: 'success', texto: mensaje })
      setCampos(VACIO)
      setIntentado(false)
      setErrores({})
    } catch (e) {
      const texto = e instanceof Error ? e.message : 'No se pudo cambiar la contraseña.'
      if (texto.includes('contraseña actual')) {
        setErrores({ actual: texto })
        document.getElementById('cuenta-clave-actual')?.focus()
      } else {
        setAviso({ tono: 'error', texto })
      }
    } finally {
      setEnviando(false)
    }
  }

  if (!sesion) return null

  const correo = datos ? (
    <span>
      <span>{datos.correo}</span>{' '}
      <Insignia entidad="correo" estado={datos.correoVerificado ? 'verificado' : 'sin-verificar'} />
    </span>
  ) : (
    '…'
  )

  return (
    <div className="app-page">
      <header className="vl-stack">
        <nav className="vl-breadcrumb" aria-label="Ruta">
          <span aria-current="page">Mi cuenta</span>
        </nav>
        <h1>Mi cuenta</h1>
        <p className="vl-text-body-sm">Tus datos de acceso a Velora.</p>
      </header>

      <section className="vl-card vl-stack m1-mi-cuenta" aria-labelledby="mi-cuenta-datos">
        <h2 id="mi-cuenta-datos" className="vl-text-heading-h4">Datos de la cuenta</h2>
        <ListaDatos
          filas={[
            ['Nombre', sesion.nombre],
            ['Correo', correo],
            ['Rol', sesion.roles.map((r) => NOMBRE_ROL[r]).join(' y ') || 'Sin rol'],
          ]}
        />
      </section>

      <section className="vl-card m1-mi-cuenta" aria-labelledby="mi-cuenta-clave">
        <form className="vl-stack" noValidate onSubmit={enviar}>
          <h2 id="mi-cuenta-clave" className="vl-text-heading-h4">Cambiar contraseña</h2>
          <p className="vl-text-body-sm">Al cambiarla se cierran tus sesiones en otros dispositivos; esta sigue abierta.</p>
          {aviso && (
            <Alerta tono={aviso.tono}>
              <p>{aviso.texto}</p>
            </Alerta>
          )}
          <Campo etiqueta="Contraseña actual" id="cuenta-clave-actual" obligatorio error={errores.actual}>
            <input
              id="cuenta-clave-actual"
              className="vl-input"
              type={ver ? 'text' : 'password'}
              autoComplete="current-password"
              value={campos.actual}
              onChange={(evento) => cambiar('actual', evento.target.value)}
              {...describirCampo('cuenta-clave-actual', errores.actual)}
            />
          </Campo>
          <Campo etiqueta="Nueva contraseña" id="cuenta-clave-nueva" obligatorio error={errores.nueva}>
            <input
              id="cuenta-clave-nueva"
              className="vl-input"
              type={ver ? 'text' : 'password'}
              autoComplete="new-password"
              value={campos.nueva}
              onChange={(evento) => cambiar('nueva', evento.target.value)}
              aria-invalid={errores.nueva ? true : undefined}
              aria-describedby={['cuenta-reglas', errores.nueva && 'cuenta-clave-nueva-error'].filter(Boolean).join(' ')}
            />
          </Campo>
          <ReglasContrasena id="cuenta-reglas" contrasena={campos.nueva} />
          <Campo etiqueta="Repite la nueva contraseña" id="cuenta-clave-confirmacion" obligatorio error={errores.confirmacion}>
            <input
              id="cuenta-clave-confirmacion"
              className="vl-input"
              type={ver ? 'text' : 'password'}
              autoComplete="new-password"
              value={campos.confirmacion}
              onChange={(evento) => cambiar('confirmacion', evento.target.value)}
              {...describirCampo('cuenta-clave-confirmacion', errores.confirmacion)}
            />
          </Campo>
          <label className="vl-check-row">
            <input className="vl-radio" type="checkbox" checked={ver} onChange={(evento) => setVer(evento.target.checked)} />
            <span className="vl-text-body-sm">Mostrar contraseñas</span>
          </label>
          <div className="app-actions">
            <button className="vl-button vl-button--primary" type="submit" aria-disabled={enviando || undefined}>
              {enviando ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
