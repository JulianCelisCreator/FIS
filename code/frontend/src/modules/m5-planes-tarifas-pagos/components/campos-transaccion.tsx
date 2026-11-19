import { Campo } from '../../../shared/ui/componentes.tsx'
import { MEDIOS_PAGO, type MedioPago, type ValoresTransaccion } from '../types/m5.types.ts'

/**
 * Fecha, medio y referencia del pago, en el orden fijo de TransactionFields del
 * design system (el monto va antes, en cada pestaña).
 */
export function CamposTransaccion({
  valores,
  alCambiar,
  hoy,
  errores,
}: {
  valores: ValoresTransaccion
  alCambiar: (valores: ValoresTransaccion) => void
  hoy: string
  errores: Partial<Record<keyof ValoresTransaccion, string>>
}) {
  const referenciaObligatoria = valores.medioPago !== '' && valores.medioPago !== 'EFECTIVO'
  return (
    <>
      <Campo etiqueta="Fecha de pago" id="fecha-pago" obligatorio ayuda="No puede ser posterior a hoy." error={errores.fechaPago}>
        <input
          id="fecha-pago"
          className="vl-input"
          type="date"
          max={hoy}
          value={valores.fechaPago}
          onChange={(evento) => alCambiar({ ...valores, fechaPago: evento.target.value })}
          aria-invalid={errores.fechaPago ? true : undefined}
        />
      </Campo>
      <Campo etiqueta="Medio de pago" id="medio-pago" obligatorio error={errores.medioPago}>
        <select
          id="medio-pago"
          className="vl-select"
          value={valores.medioPago}
          onChange={(evento) => alCambiar({ ...valores, medioPago: evento.target.value as MedioPago | '' })}
          aria-invalid={errores.medioPago ? true : undefined}
        >
          <option value="">Selecciona…</option>
          {MEDIOS_PAGO.map((medio) => (
            <option key={medio.valor} value={medio.valor}>{medio.texto}</option>
          ))}
        </select>
      </Campo>
      <Campo
        etiqueta="Referencia de la transacción"
        id="referencia"
        obligatorio={referenciaObligatoria}
        ayuda={referenciaObligatoria ? 'Número de la transferencia o del comprobante de consignación.' : 'Opcional en efectivo.'}
        error={errores.referencia}
      >
        <input
          id="referencia"
          className="vl-input"
          maxLength={100}
          value={valores.referencia}
          onChange={(evento) => alCambiar({ ...valores, referencia: evento.target.value })}
          aria-invalid={errores.referencia ? true : undefined}
        />
      </Campo>
    </>
  )
}
