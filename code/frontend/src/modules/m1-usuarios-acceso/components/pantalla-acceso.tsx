import { MarcaVelora } from '../../../shared/ui/marca-velora.tsx'
import { FormularioIngreso } from './formulario-ingreso.tsx'
import './pantalla-acceso.css'

/**
 * HU-M1-02 · Ingreso. Pantalla pública, sin navegación interna ni datos de
 * patinadores. Sin pestaña «Registrarse»: las cuentas las crea el
 * Administrador (HU-M1-01).
 */
export function PantallaAcceso() {
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
            <h1>Ingresa a Velora</h1>
            <p className="vl-text-body-sm">Usa el correo y la contraseña de tu cuenta.</p>
          </header>
          <FormularioIngreso />
        </div>
      </main>
    </div>
  )
}
