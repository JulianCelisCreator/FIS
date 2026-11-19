import { TarjetaPersona } from '../../../shared/ui/componentes.tsx'
import type { PatinadorConAutorizacion } from '../types/autorizaciones.types.ts'
import { detallePatinador } from '../utils/autorizacion.ts'

/**
 * PlayerContextSwitcher de HU-M1-09: con más de un hijo, el acudiente cambia
 * de patinador sin salir del perfil. El Administrador usa el mismo control
 * para registrar la autorización en nombre de cualquier familia.
 */
export function SelectorContextoPatinador({
  patinadores,
  seleccionadoId,
  alSeleccionar,
  esAdministrador,
}: {
  patinadores: PatinadorConAutorizacion[]
  seleccionadoId: number | null
  alSeleccionar: (patinadorId: number) => void
  esAdministrador: boolean
}) {
  const seleccionado = patinadores.find((patinador) => patinador.id === seleccionadoId) ?? patinadores[0]

  if (patinadores.length === 1) {
    return (
      <section className="vl-card m1-familia__contexto" aria-label="Patinador seleccionado">
        <TarjetaPersona nombre={seleccionado.nombre} detalle={detallePatinador(seleccionado)} />
      </section>
    )
  }

  return (
    <section className="vl-card m1-familia__contexto">
      <div className="m1-familia__contexto-texto">
        <p className="vl-text-label">Patinador a cargo</p>
        <p className="vl-text-caption">
          {esAdministrador
            ? 'Elige el patinador cuya autorización vas a consultar o registrar.'
            : 'Cambia de patinador para consultar o registrar su autorización.'}
        </p>
      </div>
      <label className="vl-field m1-familia__selector" htmlFor="familia-patinador">
        <span className="vl-field__label">Patinador</span>
        <select
          id="familia-patinador"
          className="vl-select"
          value={seleccionado?.id ?? ''}
          onChange={(evento) => alSeleccionar(Number(evento.target.value))}
        >
          {patinadores.map((patinador) => (
            <option key={patinador.id} value={patinador.id}>
              {patinador.nombre} · {patinador.edad} años
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}
