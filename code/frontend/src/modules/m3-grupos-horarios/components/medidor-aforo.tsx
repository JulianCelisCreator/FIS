import { Icono, type NombreIcono } from '../../../shared/ui/icono.tsx'
import type { EstadoCupoGrupoM3 } from '../types/m3.types.ts'

/**
 * Regla RF2.5 / RF-M3-02 (aritmética entera según docs/specs/design-system.md §9.2):
 * - ocupados * 100 < aforoMax * 90  -> tono success ("Con cupo", Verde <90%)
 * - ocupados * 100 >= aforoMax * 90 -> tono warning ("Alerta al 90 %", Amarillo >=90%)
 * - ocupados >= aforoMax            -> tono error   ("Lleno", Rojo 100%)
 */
function resolverAforoGrupo(ocupados: number, aforoMax: number): {
  tono: 'success' | 'warning' | 'error' | 'neutral'
  estado: EstadoCupoGrupoM3
  etiqueta: string
  icono: NombreIcono
  porcentaje: number
  invalido: boolean
} {
  if (!Number.isInteger(ocupados) || !Number.isInteger(aforoMax) || aforoMax <= 0 || ocupados < 0) {
    return {
      tono: 'neutral',
      estado: 'con-cupo',
      etiqueta: '—',
      icono: 'neutro',
      porcentaje: 0,
      invalido: true,
    }
  }
  const porcentaje = Math.min(100, Math.round((ocupados * 100) / aforoMax))
  if (ocupados >= aforoMax) {
    return {
      tono: 'error',
      estado: 'lleno',
      etiqueta: 'Lleno',
      icono: 'error',
      porcentaje: 100,
      invalido: false,
    }
  }
  if (ocupados * 100 >= aforoMax * 90) {
    return {
      tono: 'warning',
      estado: 'alerta-90',
      etiqueta: 'Alerta al 90 %',
      icono: 'advertencia',
      porcentaje,
      invalido: false,
    }
  }
  return {
    tono: 'success',
    estado: 'con-cupo',
    etiqueta: 'Con cupo',
    icono: 'correcto',
    porcentaje,
    invalido: false,
  }
}

/**
 * Componente CapacityMeter del Design System (design-system/components/capacity-meter/).
 * Muestra barra de progreso con código de colores (Verde <90%, Amarillo >=90%, Rojo 100%)
 * y texto + ícono de estado accesible.
 */
export function MedidorAforo({
  ocupados,
  aforoMax,
  etiqueta = 'Cupo',
  mostrarPorcentaje = false,
}: {
  ocupados: number
  aforoMax: number
  etiqueta?: string
  mostrarPorcentaje?: boolean
}) {
  const resultado = resolverAforoGrupo(ocupados, aforoMax)

  return (
    <div className={`m3-capacity m3-capacity--${resultado.tono}`} data-tone={resultado.tono}>
      <div
        className="m3-capacity__bar"
        role="meter"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={resultado.invalido ? undefined : aforoMax}
        aria-valuenow={resultado.invalido ? undefined : Math.min(ocupados, aforoMax)}
        aria-invalid={resultado.invalido || undefined}
      >
        <div className="m3-capacity__fill" style={{ width: `${resultado.porcentaje}%` }} />
      </div>
      <p className="m3-capacity__meta">
        <span className="m3-capacity__count">
          {resultado.invalido ? '—' : `${ocupados}/${aforoMax}`}
          {mostrarPorcentaje && !resultado.invalido ? ` (${resultado.porcentaje} %)` : ''}
        </span>
        <span className="m3-capacity__state">
          <Icono nombre={resultado.icono} />
          <span>{resultado.etiqueta}</span>
        </span>
      </p>
    </div>
  )
}
