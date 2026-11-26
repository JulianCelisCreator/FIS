import { useState, type ReactNode } from 'react'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'
import { Alerta } from '../../../shared/ui/componentes.tsx'
import { MarcaVelora } from '../../../shared/ui/marca-velora.tsx'
import type { DatosIngreso } from '../services/acceso.service.ts'
import { ActivarCuenta } from './activar-cuenta.tsx'
import { FormularioIngreso } from './formulario-ingreso.tsx'
import './pantalla-acceso.css'

/**
 * Marco de las pantallas públicas de M1 (ingreso y recuperación de
 * contraseña): banda de pista con la marca y, al lado, el contenido.
 */
export function MarcoAcceso({ titulo, texto, children }: { titulo: string; texto: string; children: ReactNode }) {
  return (
    <div className="m1-acceso">
      <aside className="m1-acceso__pista">
        <a className="vl-brand" href="#/" aria-label="Velora, ir al inicio de la aplicación">
          <span className="vl-brand__mark">
            <MarcaVelora />
          </span>
          <span className="vl-brand__type">
            <span className="vl-brand__word">VELORA</span>
            <span className="vl-brand__tag">Escuela de patinaje</span>
          </span>
        </a>
        <p className="m1-acceso__lema">Grupos, competencias y pagos de tu escuela, en un mismo lugar.</p>
      </aside>

      <main className="m1-acceso__panel">
        <div className="m1-acceso__contenido">
          <header className="m1-acceso__encabezado">
            <h1>{titulo}</h1>
            <p className="vl-text-body-sm">{texto}</p>
          </header>
          {children}
        </div>
      </main>
    </div>
  )
}

/**
 * HU-M1-02 · Ingreso. Pantalla pública, sin navegación interna ni datos de
 * patinadores. Sin pestaña «Registrarse»: las cuentas las crea el
 * Administrador (HU-M1-01). Tras cerrar sesión (HU-M1-03) muestra la confirmación.
 */
export function PantallaAcceso() {
  const { sesionRecienCerrada } = useSesion()
  // HU-M1-12: credenciales de una cuenta «Por registrar» que debe crear su contraseña.
  const [porActivar, setPorActivar] = useState<DatosIngreso | null>(null)

  if (porActivar) return <ActivarCuenta credenciales={porActivar} alCancelar={() => setPorActivar(null)} />

  return (
    <MarcoAcceso titulo="Ingresa a Velora" texto="Usa el correo y la contraseña de tu cuenta.">
      {/* HU-M1-03 CA-01: confirmación breve al volver al ingreso. */}
      {sesionRecienCerrada && (
        <Alerta tono="info" titulo="Cerraste sesión">
          <p>Ingresa de nuevo cuando quieras.</p>
        </Alerta>
      )}
      <FormularioIngreso alRequerirActivacion={setPorActivar} />
    </MarcoAcceso>
  )
}
