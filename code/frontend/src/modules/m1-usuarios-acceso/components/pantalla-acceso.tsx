import { useState } from 'react'
import type { Rol } from '../../../shared/sesion/sesion.types.ts'
import { Pestanas } from '../../../shared/ui/componentes.tsx'
import { MarcaVelora } from '../../../shared/ui/marca-velora.tsx'
import type { CuentaRegistrada } from '../types/acceso.types.ts'
import { FormularioIngreso } from './formulario-ingreso.tsx'
import { FormularioRegistro } from './formulario-registro.tsx'
import './pantalla-acceso.css'

export type PestanaAcceso = 'ingresar' | 'registro'

const PESTANAS: { id: PestanaAcceso; texto: string }[] = [
  { id: 'ingresar', texto: 'Ingresar' },
  { id: 'registro', texto: 'Registrarse' },
]

const ENCABEZADOS: Record<PestanaAcceso, { titulo: string; texto: string }> = {
  ingresar: {
    titulo: 'Ingresa a Velora',
    texto: 'Usa el correo y la contraseña de tu cuenta, y elige con qué rol entras.',
  },
  registro: {
    titulo: 'Crea tu cuenta',
    texto:
      'Regístrate como patinador, acudiente, profesor o visitante. El personal administrativo recibe su cuenta de la escuela.',
  },
}

/**
 * W01 · Acceso (RF-M1-01 y RF-M1-02). Pantalla pública, sin navegación interna
 * ni datos de patinadores: banda de pista con la marca y, al lado, las
 * pestañas Ingresar y Registrarse.
 */
export function PantallaAcceso({ pestanaInicial = 'ingresar' }: { pestanaInicial?: PestanaAcceso }) {
  const [pestana, setPestana] = useState<PestanaAcceso>(pestanaInicial)
  // Datos para precargar el ingreso después de registrarse.
  const [precarga, setPrecarga] = useState<{ correo: string; rol: Rol } | null>(null)

  const irAIngresar = (cuenta: CuentaRegistrada) => {
    setPrecarga({ correo: cuenta.correo, rol: cuenta.rol })
    setPestana('ingresar')
  }

  const encabezado = ENCABEZADOS[pestana]

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
            <h1>{encabezado.titulo}</h1>
            <p className="vl-text-body-sm">{encabezado.texto}</p>
          </header>

          <Pestanas etiqueta="Ingresar o registrarse" opciones={PESTANAS} activa={pestana} alCambiar={setPestana} />

          <div id={`panel-${pestana}`} role="tabpanel" aria-labelledby={`pestana-${pestana}`}>
            {pestana === 'ingresar' ? (
              <FormularioIngreso key={precarga?.correo ?? 'vacio'} inicial={precarga ?? undefined} />
            ) : (
              <FormularioRegistro alIrAIngresar={irAIngresar} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
