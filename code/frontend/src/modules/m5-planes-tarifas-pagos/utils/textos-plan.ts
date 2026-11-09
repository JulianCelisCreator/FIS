import { formatoCop } from '../../../shared/utils/formato.ts'
import { TIPOS_PLAN, type Periodicidad, type TipoPlan } from '../types/m5.types.ts'

export function textoTipo(tipo: TipoPlan): string {
  return TIPOS_PLAN.find((t) => t.valor === tipo)?.texto ?? tipo
}

export function textoFacturacion(periodicidad: Periodicidad): string {
  return periodicidad === 'MENSUAL' ? 'Mensual' : 'Por sesión'
}

/** «$ 180.000» o «$ 35.000 / sesión». */
export function textoTarifa(valor: number, periodicidad: Periodicidad): string {
  return periodicidad === 'POR_SESION' ? `${formatoCop(valor)} / sesión` : formatoCop(valor)
}
