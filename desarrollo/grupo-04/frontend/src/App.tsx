

import { useCallback, useEffect, useState } from 'react'
import './App.css'

type Tariff = {
  id?: string
  amountCop: number
  effectiveFrom: string
}

type Plan = {
  id: string
  name: string
  type: string
  billingPeriod: string
  paymentDueDay: number | null
  status: string
  currentTariff: Tariff | null
  availableForAssignment?: boolean
}

type PlanForm = {
  name: string
  type: string
  billingPeriod: string
  paymentDueDay: string
}

const TIPOS = [
  { value: 'SINGLE_DAY', label: 'Día único' },
  { value: 'THREE_DAYS_WEEK', label: '3 días por semana' },
  { value: 'SIX_DAYS_WEEK', label: '6 días por semana' },
  { value: 'SIX_DAYS_WEEK_GYM', label: '6 días + gimnasio' },
]

const nuevoFormulario = (): PlanForm => ({
  name: '',
  type: 'THREE_DAYS_WEEK',
  billingPeriod: 'MONTHLY',
  paymentDueDay: '5',
})

async function api<T = unknown>(
  ruta: string,
  opciones: RequestInit = {},
): Promise<T> {
  const respuesta = await fetch(`/api${ruta}`, {
    ...opciones,
    headers: {
      ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
      ...opciones.headers,
    },
  })

  if (!respuesta.ok) {
    const mensaje = await respuesta.text()
    throw new Error(mensaje || `Error HTTP ${respuesta.status}`)
  }

  if (respuesta.status === 204) return undefined as T

  return respuesta.json() as Promise<T>
}

function App() {
  const [planes, setPlanes] = useState<Plan[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [formulario, setFormulario] = useState<PlanForm>(nuevoFormulario())
  const [editando, setEditando] = useState<Plan | null>(null)
  const [guardando, setGuardando] = useState(false)

  const [planTarifa, setPlanTarifa] = useState<Plan | null>(null)
  const [importe, setImporte] = useState('')
  const [vigencia, setVigencia] = useState('')

  const [detalleTitulo, setDetalleTitulo] = useState('')
  const [detalle, setDetalle] = useState<unknown>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  const cargarPlanes = useCallback(async () => {
    try {
      setError('')
      const datos = await api<Plan[]>('/planes')
      setPlanes(datos)
    } catch (e) {
      setError(
        e instanceof Error
          ? `No fue posible cargar los planes: ${e.message}`
          : 'No fue posible cargar los planes.',
      )
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargarPlanes()
  }, [cargarPlanes])

  const formatoPrecio = (valor: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor)

  const limpiarMensajes = () => {
    setError('')
    setMensaje('')
  }

  const abrirCrear = () => {
    limpiarMensajes()
    setEditando(null)
    setFormulario(nuevoFormulario())
    setMostrarFormulario(true)
  }

  const abrirEditar = (plan: Plan) => {
    limpiarMensajes()
    setEditando(plan)
    setFormulario({
      name: plan.name,
      type: plan.type,
      billingPeriod: plan.billingPeriod,
      paymentDueDay: String(plan.paymentDueDay ?? 5),
    })
    setMostrarFormulario(true)
  }

  const cambiarTipo = (tipo: string) => {
    setFormulario((actual) => ({
      ...actual,
      type: tipo,
      billingPeriod: tipo === 'SINGLE_DAY' ? 'SESSION' : 'MONTHLY',
      paymentDueDay: tipo === 'SINGLE_DAY'
        ? ''
        : actual.paymentDueDay || '5',
    }))
  }

  const guardarPlan = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    limpiarMensajes()
    setGuardando(true)

    try {
      const datos: Record<string, unknown> = {
        name: formulario.name.trim(),
      }

      if (!editando) {
        datos.type = formulario.type
        datos.billingPeriod = formulario.billingPeriod

        if (formulario.billingPeriod === 'MONTHLY') {
          datos.paymentDueDay = Number(formulario.paymentDueDay)
        }
      } else if (editando.billingPeriod === 'MONTHLY') {
        datos.paymentDueDay = Number(formulario.paymentDueDay)
      }

      await api(
        editando ? `/planes/${editando.id}` : '/planes',
        {
          method: editando ? 'PATCH' : 'POST',
          body: JSON.stringify(datos),
        },
      )

      setMostrarFormulario(false)
      setEditando(null)
      setMensaje(editando ? 'Plan actualizado correctamente.' : 'Plan creado correctamente.')
      await cargarPlanes()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible guardar el plan.')
    } finally {
      setGuardando(false)
    }
  }

  const abrirTarifa = (plan: Plan) => {
    limpiarMensajes()
    setPlanTarifa(plan)
    setImporte('')
    setVigencia('')
  }

  const guardarTarifa = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!planTarifa) return

    limpiarMensajes()
    setGuardando(true)

    try {
      await api(`/planes/${planTarifa.id}/tarifas`, {
        method: 'POST',
        body: JSON.stringify({
          amountCop: Number(importe),
          effectiveFrom: vigencia,
        }),
      })

      setMensaje('Tarifa registrada correctamente.')
      setPlanTarifa(null)
      await cargarPlanes()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible registrar la tarifa.')
    } finally {
      setGuardando(false)
    }
  }

  const consultarDetalle = async (plan: Plan, tipo: 'tarifas' | 'auditoria') => {
    limpiarMensajes()
    setDetalle(null)
    setDetalleTitulo(
      tipo === 'tarifas'
        ? `Historial de tarifas: ${plan.name}`
        : `Auditoría: ${plan.name}`,
    )
    setCargandoDetalle(true)

    try {
      const resultado = await api(
        `/planes/${plan.id}/${tipo}`,
      )
      setDetalle(resultado)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible consultar el historial.')
      setDetalleTitulo('')
    } finally {
      setCargandoDetalle(false)
    }
  }

  const desactivarPlan = async (plan: Plan) => {
    if (!window.confirm(`¿Deseas desactivar el plan "${plan.name}"? El historial se conservará.`)) {
      return
    }

    limpiarMensajes()

    try {
      await api(`/planes/${plan.id}/desactivar`, { method: 'PATCH' })
      setMensaje('Plan desactivado correctamente.')
      await cargarPlanes()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible desactivar el plan.')
    }
  }

  return (
    <main>
      <h1>Planes disponibles</h1>
      <p>Consulta y administra los planes y sus tarifas.</p>

      <p>
        <button type="button" onClick={abrirCrear}>
          Crear plan
        </button>{' '}
        <button type="button" onClick={() => void cargarPlanes()}>
          Actualizar lista
        </button>
      </p>

      {mensaje && <p role="status">{mensaje}</p>}
      {error && <p role="alert">{error}</p>}
      {cargando && <p>Cargando planes...</p>}

      {mostrarFormulario && (
        <section>
          <h2>{editando ? 'Editar plan' : 'Crear plan'}</h2>

          <form onSubmit={guardarPlan}>
            <p>
              <label>
                Nombre del plan
                <br />
                <input
                  required
                  maxLength={100}
                  value={formulario.name}
                  onChange={(e) =>
                    setFormulario({ ...formulario, name: e.target.value })
                  }
                />
              </label>
            </p>

            {!editando && (
              <>
                <p>
                  <label>
                    Tipo de plan
                    <br />
                    <select
                      value={formulario.type}
                      onChange={(e) => cambiarTipo(e.target.value)}
                    >
                      {TIPOS.map((tipo) => (
                        <option key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </p>

                <p>
                  <label>
                    Periodicidad
                    <br />
                    <select value={formulario.billingPeriod} disabled>
                      <option value="SESSION">Por sesión</option>
                      <option value="MONTHLY">Mensual</option>
                    </select>
                  </label>
                </p>
              </>
            )}

            {formulario.billingPeriod === 'MONTHLY' && (
              <p>
                <label>
                  Día de pago (del 1 al 5)
                  <br />
                  <input
                    required
                    type="number"
                    min={1}
                    max={5}
                    value={formulario.paymentDueDay}
                    onChange={(e) =>
                      setFormulario({
                        ...formulario,
                        paymentDueDay: e.target.value,
                      })
                    }
                  />
                </label>
              </p>
            )}

            <button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>{' '}
            <button
              type="button"
              onClick={() => setMostrarFormulario(false)}
              disabled={guardando}
            >
              Cancelar
            </button>
          </form>
        </section>
      )}

      {planTarifa && (
        <section>
          <h2>Registrar tarifa: {planTarifa.name}</h2>

          <form onSubmit={guardarTarifa}>
            <p>
              <label>
                Valor en pesos colombianos
                <br />
                <input
                  required
                  type="number"
                  min={1}
                  step={1}
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                />
              </label>
            </p>

            <p>
              <label>
                Fecha de vigencia
                <br />
                <input
                  required
                  type="date"
                  min={new Date().toLocaleDateString('en-CA', {
                    timeZone: 'America/Bogota',
                  })}
                  value={vigencia}
                  onChange={(e) => setVigencia(e.target.value)}
                />
              </label>
            </p>

            <button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Registrar tarifa'}
            </button>{' '}
            <button type="button" onClick={() => setPlanTarifa(null)}>
              Cancelar
            </button>
          </form>
        </section>
      )}

      {!cargando && !error && planes.length === 0 && (
        <p>No hay planes registrados.</p>
      )}

      {!cargando && planes.map((plan) => (
        <article key={plan.id}>
          <h2>{plan.name}</h2>

          <p>
            Tipo:{' '}
            {TIPOS.find((tipo) => tipo.value === plan.type)?.label ?? plan.type}
          </p>

          <p>
            Periodicidad:{' '}
            {plan.billingPeriod === 'MONTHLY' ? 'Mensual' : 'Por sesión'}
          </p>

          {plan.paymentDueDay !== null && (
            <p>Día de pago: {plan.paymentDueDay}</p>
          )}

          <p>
            Tarifa:{' '}
            {plan.currentTariff
              ? formatoPrecio(plan.currentTariff.amountCop)
              : 'Sin tarifa'}
          </p>

          {plan.currentTariff && (
            <p>Vigente desde: {plan.currentTariff.effectiveFrom}</p>
          )}

          <p>
            Estado:{' '}
            {plan.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
          </p>

          <p>
            <button type="button" onClick={() => abrirEditar(plan)} disabled={plan.status !== 'ACTIVE'}>
              Editar
            </button>{' '}
            <button type="button" onClick={() => abrirTarifa(plan)} disabled={plan.status !== 'ACTIVE'}>
              Registrar tarifa
            </button>
          </p>

          <p>
            <button
              type="button"
              onClick={() => void consultarDetalle(plan, 'tarifas')}
            >
              Historial de tarifas
            </button>{' '}
            <button
              type="button"
              onClick={() => void consultarDetalle(plan, 'auditoria')}
            >
              Ver auditoría
            </button>
          </p>

          {plan.status === 'ACTIVE' && (
            <p>
              <button type="button" onClick={() => void desactivarPlan(plan)}>
                Desactivar plan
              </button>
            </p>
          )}
        </article>
      ))}

      {(detalleTitulo || cargandoDetalle) && (
        <section>
          <h2>{detalleTitulo}</h2>
          {cargandoDetalle && <p>Cargando historial...</p>}
          {detalle !== null && (
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {JSON.stringify(detalle, null, 2)}
            </pre>
          )}
          <button
            type="button"
            onClick={() => {
              setDetalle(null)
              setDetalleTitulo('')
            }}
          >
            Cerrar historial
          </button>
        </section>
      )}
    </main>
  )
}

export default App
