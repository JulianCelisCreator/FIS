import { useEffect, useState } from 'react'
import {
  Alerta,
  Campo,
  DialogoConfirmacion,
  ListaDatos,
} from '../../../shared/design-system/componentes.tsx'
import {
  formatoCop,
  formatoFecha,
  formatoFechaDeMarca,
  hoyEnClub,
  leerPesos,
} from '../../../shared/utils/formato.ts'
import {
  crearPlan,
  desactivarPlan,
  detallePlan,
  editarPlan,
  registrarTarifa,
} from '../services/m5.service.ts'
import {
  DIAS_LIMITE_PAGO,
  TIPOS_PLAN,
  type PlanAdministrado,
  type PlanDetalle,
  type TipoPlan,
} from '../types/m5.types.ts'
import { primerDiaMesSiguiente } from '../utils/estimacion-cobros.ts'
import { textoFacturacion, textoTarifa, textoTipo } from '../utils/textos-plan.ts'

interface PropsDialogo {
  alCerrar: () => void
}

/** Ejecuta una llamada a la API con estado de «guardando» y mensaje de error. */
function useEnvio() {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enviar = async <T,>(llamada: () => Promise<T>, alTerminar: (resultado: T) => void) => {
    setEnviando(true)
    setError(null)
    try {
      alTerminar(await llamada())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }
  return { enviando, error, enviar }
}

/**
 * RF-M5-01 y RF-M5-02: crear o editar un plan. Al editar, el tipo y la
 * periodicidad no se cambian (se crea otro plan) y el precio va por «Tarifa».
 */
export function DialogoPlan({
  plan,
  alCerrar,
  alGuardar,
}: PropsDialogo & { plan: PlanAdministrado | null; alGuardar: (plan: PlanDetalle, creado: boolean) => void }) {
  const editando = plan !== null
  const [nombre, setNombre] = useState(plan?.nombre ?? '')
  const [tipo, setTipo] = useState<TipoPlan | ''>(plan?.tipo ?? '')
  const [diaLimite, setDiaLimite] = useState(plan?.diaLimitePago ?? 5)
  const [descripcion, setDescripcion] = useState(plan?.descripcion ?? '')
  const [intentado, setIntentado] = useState(false)
  const { enviando, error, enviar } = useEnvio()

  const periodicidad = TIPOS_PLAN.find((t) => t.valor === tipo)?.periodicidad ?? null
  const errorNombre = nombre.trim() ? null : 'El nombre del plan es obligatorio.'
  const errorTipo = tipo ? null : 'Elige el tipo de plan.'

  const guardar = () => {
    setIntentado(true)
    if (errorNombre || errorTipo || !tipo) return
    const mensual = periodicidad === 'MENSUAL'
    if (!editando) {
      void enviar(
        () =>
          crearPlan({
            nombre: nombre.trim(),
            tipo,
            diaLimitePago: mensual ? diaLimite : undefined,
            descripcion: descripcion.trim() || undefined,
          }),
        (creado) => alGuardar(creado, true),
      )
      return
    }
    const cambios = {
      nombre: nombre.trim() !== plan.nombre ? nombre.trim() : undefined,
      diaLimitePago: mensual && diaLimite !== plan.diaLimitePago ? diaLimite : undefined,
      descripcion: descripcion.trim() !== (plan.descripcion ?? '') ? descripcion.trim() : undefined,
    }
    if (Object.values(cambios).every((valor) => valor === undefined)) {
      alCerrar()
      return
    }
    void enviar(() => editarPlan(plan.id, cambios), (editado) => alGuardar(editado, false))
  }

  return (
    <DialogoConfirmacion
      abierto
      variante="form"
      titulo={editando ? `Editar plan: ${plan.nombre}` : 'Crear plan'}
      textoConfirmar={editando ? 'Guardar cambios' : 'Guardar y registrar tarifa'}
      ocupado={enviando}
      alConfirmar={guardar}
      alCancelar={alCerrar}
    >
      <Campo etiqueta="Nombre del plan" id="plan-nombre" obligatorio error={intentado ? errorNombre : null}>
        <input
          id="plan-nombre"
          className="ps-input"
          maxLength={80}
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          aria-invalid={intentado && errorNombre ? true : undefined}
        />
      </Campo>
      {editando ? (
        <>
          <Campo etiqueta="Tipo de plan" id="plan-tipo">
            <input id="plan-tipo" className="ps-input" value={textoTipo(plan.tipo)} readOnly />
          </Campo>
          <Campo etiqueta="Periodicidad" id="plan-periodicidad">
            <input id="plan-periodicidad" className="ps-input" value={textoFacturacion(plan.periodicidad)} readOnly />
          </Campo>
        </>
      ) : (
        <>
          <Campo etiqueta="Tipo de plan" id="plan-tipo" obligatorio error={intentado ? errorTipo : null}>
            <select
              id="plan-tipo"
              className="ps-select"
              value={tipo}
              onChange={(evento) => setTipo(evento.target.value as TipoPlan | '')}
              aria-invalid={intentado && errorTipo ? true : undefined}
            >
              <option value="">Selecciona…</option>
              {TIPOS_PLAN.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>{opcion.texto}</option>
              ))}
            </select>
          </Campo>
          <Campo
            etiqueta="Periodicidad de facturación"
            id="plan-periodicidad"
            ayuda="Depende del tipo: día único se cobra por sesión; los demás, cada mes."
          >
            <input
              id="plan-periodicidad"
              className="ps-input"
              value={periodicidad ? textoFacturacion(periodicidad) : '—'}
              readOnly
            />
          </Campo>
        </>
      )}
      {periodicidad === 'MENSUAL' && (
        <Campo
          etiqueta="Día límite de pago"
          id="plan-dia-limite"
          obligatorio
          ayuda={editando ? 'El cambio solo afecta a los cobros que se generen después.' : 'Solo en planes mensuales.'}
        >
          <select
            id="plan-dia-limite"
            className="ps-select"
            value={diaLimite}
            onChange={(evento) => setDiaLimite(Number(evento.target.value))}
          >
            {DIAS_LIMITE_PAGO.map((dia) => (
              <option key={dia} value={dia}>{dia}</option>
            ))}
          </select>
        </Campo>
      )}
      <Campo etiqueta="Descripción" id="plan-descripcion" ayuda="Opcional. Se muestra en la oferta de planes.">
        <textarea
          id="plan-descripcion"
          className="ps-textarea"
          rows={2}
          maxLength={500}
          value={descripcion}
          onChange={(evento) => setDescripcion(evento.target.value)}
        />
      </Campo>
      {editando ? (
        <>
          <p className="ps-text-body-sm">
            El tipo y la periodicidad no se cambian: para eso se crea un plan nuevo. Para cambiar el precio, usa «Tarifa».
          </p>
          {plan.ultimaModificacion && (
            <p className="ps-audit-entry">
              Última modificación: {plan.ultimaModificacion.por} · {formatoFechaDeMarca(plan.ultimaModificacion.en)}
            </p>
          )}
        </>
      ) : (
        <Alerta tono="info">
          <p>El plan queda activo, pero no se puede asignar hasta que tenga una tarifa vigente. Al guardar se abre el registro de tarifa.</p>
        </Alerta>
      )}
      {error && <Alerta tono="error" titulo="No se pudo guardar el plan">{error}</Alerta>}
    </DialogoConfirmacion>
  )
}

/** RF-M5-04: nueva tarifa con fecha de vigencia (hoy o futura; nunca retroactiva). */
export function DialogoTarifa({
  plan,
  alCerrar,
  alGuardar,
}: PropsDialogo & { plan: PlanAdministrado; alGuardar: (plan: PlanDetalle) => void }) {
  const hoy = hoyEnClub()
  const [valorTexto, setValorTexto] = useState('')
  const [vigenteDesde, setVigenteDesde] = useState(plan.tarifaVigente ? primerDiaMesSiguiente(hoy) : hoy)
  const [intentado, setIntentado] = useState(false)
  const { enviando, error, enviar } = useEnvio()

  const valor = leerPesos(valorTexto)
  const errorValor = valor && valor > 0 ? null : 'El valor debe ser mayor que cero.'
  const errorFecha = vigenteDesde && vigenteDesde >= hoy ? null : `No puede ser anterior a hoy (${formatoFecha(hoy)}).`

  const guardar = () => {
    setIntentado(true)
    if (errorValor || errorFecha || !valor) return
    void enviar(() => registrarTarifa(plan.id, { valor, vigenteDesde }), alGuardar)
  }

  return (
    <DialogoConfirmacion
      abierto
      variante="form"
      titulo={`Registrar tarifa: ${plan.nombre}`}
      textoConfirmar="Registrar tarifa"
      ocupado={enviando}
      alConfirmar={guardar}
      alCancelar={alCerrar}
    >
      <ListaDatos
        filas={[
          [
            'Tarifa vigente',
            plan.tarifaVigente
              ? `${textoTarifa(plan.tarifaVigente.valor, plan.periodicidad)} desde ${formatoFecha(plan.tarifaVigente.vigenteDesde)}`
              : 'Sin tarifa vigente',
          ],
        ]}
      />
      <Campo etiqueta="Nuevo valor (COP)" id="tarifa-valor" obligatorio ayuda="Debe ser mayor que cero." error={intentado ? errorValor : null}>
        <input
          id="tarifa-valor"
          className="ps-input ps-input--numeric"
          inputMode="numeric"
          placeholder="$ 0"
          value={valorTexto}
          onChange={(evento) => setValorTexto(evento.target.value)}
          onBlur={() => valor !== null && setValorTexto(formatoCop(valor))}
          aria-invalid={intentado && errorValor ? true : undefined}
        />
      </Campo>
      <Campo
        etiqueta="Vigente desde"
        id="tarifa-desde"
        obligatorio
        ayuda={`No puede ser anterior a hoy (${formatoFecha(hoy)}).`}
        error={intentado ? errorFecha : null}
      >
        <input
          id="tarifa-desde"
          className="ps-input"
          type="date"
          min={hoy}
          value={vigenteDesde}
          onChange={(evento) => setVigenteDesde(evento.target.value)}
          aria-invalid={intentado && errorFecha ? true : undefined}
        />
      </Campo>
      <p className="ps-text-body-sm">
        Los cobros ya generados conservan la tarifa con que se emitieron. La tarifa anterior pasa al historial.
      </p>
      {error && <Alerta tono="error" titulo="No se pudo registrar la tarifa">{error}</Alerta>}
    </DialogoConfirmacion>
  )
}

/** Historial de tarifas del plan (vigente, programadas e históricas). */
export function DialogoHistorial({
  plan,
  alCerrar,
  alRegistrarTarifa,
}: PropsDialogo & { plan: PlanAdministrado; alRegistrarTarifa: () => void }) {
  const [detalle, setDetalle] = useState<PlanDetalle | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    detallePlan(plan.id)
      .then((datos) => vigente && setDetalle(datos))
      .catch((e: Error) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [plan.id])

  const ESTADO: Record<string, string> = { VIGENTE: ' (vigente)', PROGRAMADA: ' (programada)', HISTORICA: '' }

  return (
    <DialogoConfirmacion
      abierto
      titulo={`Historial de tarifas: ${plan.nombre}`}
      textoCancelar="Cerrar"
      textoConfirmar={plan.estado === 'ACTIVO' ? 'Registrar tarifa' : undefined}
      alConfirmar={alRegistrarTarifa}
      alCancelar={alCerrar}
    >
      {error && <Alerta tono="error">{error}</Alerta>}
      {!detalle && !error && <p className="ps-text-caption" role="status">Cargando historial…</p>}
      {detalle && detalle.tarifas.length === 0 && <p className="ps-text-body-sm">El plan aún no tiene tarifas.</p>}
      {detalle && detalle.tarifas.length > 0 && (
        <ps-data-table>
          <table className="ps-table">
            <thead>
              <tr><th className="ps-num">Valor</th><th>Desde</th><th>Hasta</th><th>Registro</th></tr>
            </thead>
            <tbody>
              {detalle.tarifas.map((tarifa) => (
                <tr key={tarifa.id}>
                  <td data-label="Valor" className="ps-num">{formatoCop(tarifa.valor)}</td>
                  <td data-label="Desde">{formatoFecha(tarifa.vigenteDesde)}</td>
                  <td data-label="Hasta">
                    {tarifa.vigenteHasta ? formatoFecha(tarifa.vigenteHasta) : '—'}
                    {ESTADO[tarifa.estado]}
                  </td>
                  <td data-label="Registro">{tarifa.registradoPor} · {formatoFechaDeMarca(tarifa.registradoEn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ps-data-table>
      )}
    </DialogoConfirmacion>
  )
}

/** RF-M5-03: desactivar (no existe eliminar). */
export function DialogoDesactivar({
  plan,
  alCerrar,
  alGuardar,
}: PropsDialogo & { plan: PlanAdministrado; alGuardar: (plan: PlanDetalle) => void }) {
  const [motivo, setMotivo] = useState('')
  const { enviando, error, enviar } = useEnvio()

  return (
    <DialogoConfirmacion
      abierto
      titulo={`¿Desactivar el plan ${plan.nombre}?`}
      textoConfirmar="Desactivar plan"
      ocupado={enviando}
      alConfirmar={() => void enviar(() => desactivarPlan(plan.id, motivo.trim() || undefined), alGuardar)}
      alCancelar={alCerrar}
    >
      <div className="ps-text-body-sm">
        <ul>
          <li>No aparecerá en la lista de planes para asignar ni para cambiar.</li>
          <li>
            {plan.patinadores === 1
              ? 'El patinador que lo tiene hoy lo conserva.'
              : `Los ${plan.patinadores} patinadores que lo tienen hoy lo conservan.`}
          </li>
          <li>Los cobros y pagos históricos no cambian.</li>
        </ul>
      </div>
      <Campo etiqueta="Motivo" id="desactivar-motivo" ayuda="Opcional. Queda en la auditoría.">
        <textarea
          id="desactivar-motivo"
          className="ps-textarea"
          rows={2}
          maxLength={500}
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
        />
      </Campo>
      {error && <Alerta tono="error" titulo="No se pudo desactivar el plan">{error}</Alerta>}
    </DialogoConfirmacion>
  )
}
