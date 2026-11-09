import { MarcaVelora } from '../../../shared/ui/marca-velora.tsx'
import { FormularioRegistro } from './formulario-registro.tsx'
import './pantalla-acceso.css'

/**
 * W01 · Acceso (RF-M1-01). Pantalla pública, sin navegación interna ni datos
 * de patinadores: banda de pista con la marca y, al lado, el formulario.
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
            <h1>Crea tu cuenta</h1>
            <p className="vl-text-body-sm">
              Regístrate como patinador, acudiente, profesor o visitante. El personal administrativo recibe su cuenta de la
              escuela.
            </p>
          </header>
          <FormularioRegistro />
        </div>
      </main>
    </div>
  )
}
