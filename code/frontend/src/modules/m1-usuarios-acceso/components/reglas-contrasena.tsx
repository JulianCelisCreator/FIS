import { Icono } from '../../../shared/ui/icono.tsx'
import { REGLAS_CONTRASENA } from '../utils/politica-contrasena.ts'

/**
 * Ayuda de la contraseña nueva (HU-M1-08 CA-04): lista las condiciones y marca
 * en vivo cuáles se cumplen. El estado va con ícono y texto, nunca solo color.
 */
export function ReglasContrasena({ id, contrasena }: { id: string; contrasena: string }) {
  return (
    <ul className="m1-reglas" id={id} aria-label="Condiciones de la contraseña">
      {REGLAS_CONTRASENA.map((regla) => {
        const cumple = regla.cumple(contrasena)
        return (
          <li key={regla.id} className={cumple ? 'm1-reglas__item m1-reglas__item--ok' : 'm1-reglas__item'}>
            <Icono nombre={cumple ? 'correcto' : 'neutro'} />
            <span>
              {regla.texto}
              <span className="app-oculto">{cumple ? ': cumple' : ': falta'}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
