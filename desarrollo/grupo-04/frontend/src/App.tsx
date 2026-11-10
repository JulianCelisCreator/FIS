import { useCallback, useEffect, useState } from 'react'
import './App.css'

type Role = 'ADMIN' | 'PATINADOR'

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

  // RF-M5-05: Estado para controlar la vista por Rol
  const [rol, setRol] = useState<Role>('ADMIN')

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
      paymentDueDay: tipo === 'SINGLE_DAY' ? '' : actual.paymentDueDay || '5',
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

      await api(editando ? `/planes/${editando.id}` : '/planes', {
        method: editando ? 'PATCH' : 'POST',
        body: JSON.stringify(datos),
      })

      setMostrarFormulario(false)
      setEditando(null)
      setMensaje(
        editando
          ? 'Plan actualizado correctamente.'
          : 'Plan creado correctamente.',
      )
      await cargarPlanes()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No fue posible guardar el plan.',
      )
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
      setError(
        e instanceof Error ? e.message : 'No fue posible registrar la tarifa.',
      )
    } finally {
      setGuardando(false)
    }
  }

  const consultarDetalle = async (
    plan: Plan,
    tipo: 'tarifas' | 'auditoria',
  ) => {
    limpiarMensajes()
    setDetalle(null)
    setDetalleTitulo(
      tipo === 'tarifas'
        ? `Historial de tarifas: ${plan.name}`
        : `Auditoría: ${plan.name}`,
    )
    setCargandoDetalle(true)

    try {
      const resultado = await api(`/planes/${plan.id}/${tipo}`)
      setDetalle(resultado)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No fue posible consultar el historial.',
      )
      setDetalleTitulo('')
    } finally {
      setCargandoDetalle(false)
    }
  }

  const desactivarPlan = async (plan: Plan) => {
    if (
      !window.confirm(
        `¿Deseas desactivar el plan "${plan.name}"? El historial se conservará.`,
      )
    ) {
      return
    }

    limpiarMensajes()

    try {
      await api(`/planes/${plan.id}/desactivar`, { method: 'PATCH' })
      setMensaje('Plan desactivado correctamente.')
      await cargarPlanes()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No fue posible desactivar el plan.',
      )
    }
  }

  // RF-M5-05: Filtrado de planes según el rol seleccionado
  const planesVisibles = planes.filter((plan) => {
    if (rol === 'PATINADOR') {
      // El patinador solo puede ver los planes activos que cuentan con tarifa vigente
      return plan.status === 'ACTIVE' && plan.currentTariff !== null
    }
    return true // El Administrador ve todos los planes
  })

  return (
    <main className="admin-container">
      <header className="admin-header">
        <div>
          <h1 style={{ margin: 0 }}>
            {rol === 'ADMIN' ? 'Gestión de Planes y Tarifas' : 'Planes Vigentes'}
          </h1>
          <p style={{ margin: '4px 0 0 0', opacity: 0.8 }}>
            {rol === 'ADMIN'
              ? 'Consulta y administra los planes y sus tarifas.'
              : 'Consulta los planes de formación disponibles y sus tarifas vigentes.'}
          </p>
        </div>

        {/* RF-M5-05: Control selector de rol */}
        <div className="role-selector-box">
          <label htmlFor="role-select">Vista por rol:</label>
          <select
            id="role-select"
            value={rol}
            onChange={(e) => setRol(e.target.value as Role)}
            className="role-dropdown"
          >
            <option value="ADMIN">Administrador (Control total)</option>
            <option value="PATINADOR">Patinador / Cliente (Consulta)</option>
          </select>
        </div>
      </header>

      <div className="admin-toolbar">
        {/* Solo el Administrador puede crear planes */}
        {rol === 'ADMIN' && (
          <button type="button" className="btn btn-primary" onClick={abrirCrear}>
            + Crear plan
          </button>
        )}
        <button
          type="button"
          className="btn"
          onClick={() => void cargarPlanes()}
        >
          Actualizar lista
        </button>
      </div>

      {mensaje && <p role="status">{mensaje}</p>}
      {error && <p role="alert">{error}</p>}
      {cargando && <p>Cargando planes...</p>}

      {/* DIÁLOGO MODAL 1: Crear o Editar Plan */}
      {mostrarFormulario && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h2>{editando ? 'Editar plan' : 'Crear plan'}</h2>

            <form onSubmit={guardarPlan}>
              <div className="form-group">
                <label>Nombre del plan</label>
                <input
                  required
                  maxLength={100}
                  value={formulario.name}
                  onChange={(e) =>
                    setFormulario({ ...formulario, name: e.target.value })
                  }
                />
              </div>

              {!editando && (
                <>
                  <div className="form-group">
                    <label>Tipo de plan</label>
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
                  </div>

                  <div className="form-group">
                    <label>Periodicidad</label>
                    <select value={formulario.billingPeriod} disabled>
                      <option value="SESSION">Por sesión</option>
                      <option value="MONTHLY">Mensual</option>
                    </select>
                  </div>
                </>
              )}

              {formulario.billingPeriod === 'MONTHLY' && (
                <div className="form-group">
                  <label>Día de pago (del 1 al 5)</label>
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
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setMostrarFormulario(false)}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={guardando}
                >
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIÁLOGO MODAL 2: Registrar Tarifa */}
      {planTarifa && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h2>Registrar tarifa: {planTarifa.name}</h2>

            <form onSubmit={guardarTarifa}>
              <div className="form-group">
                <label>Valor en pesos colombianos (COP)</label>
                <input
                  required
                  type="number"
                  min={1}
                  step={1}
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Fecha de vigencia</label>
                <input
                  required
                  type="date"
                  min={new Date().toLocaleDateString('en-CA', {
                    timeZone: 'America/Bogota',
                  })}
                  value={vigencia}
                  onChange={(e) => setVigencia(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPlanTarifa(null)}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={guardando}
                >
                  {guardando ? 'Guardando...' : 'Registrar tarifa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!cargando && !error && planesVisibles.length === 0 && (
        <p>No hay planes vigentes disponibles para este rol.</p>
      )}

      {/* Lista / Tarjetas de Planes */}
      <div className="planes-grid">
        {!cargando &&
          planesVisibles.map((plan) => (
            <article key={plan.id} className="plan-card">
              <div>
                <div className="plan-card-header">
                  <h2>{plan.name}</h2>
                  <span
                    className={`badge ${
                      plan.status === 'ACTIVE'
                        ? 'badge-active'
                        : 'badge-inactive'
                    }`}
                  >
                    {plan.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <p style={{ margin: '4px 0' }}>
                  <strong>Tipo:</strong>{' '}
                  {TIPOS.find((tipo) => tipo.value === plan.type)?.label ??
                    plan.type}
                </p>

                <p style={{ margin: '4px 0' }}>
                  <strong>Periodicidad:</strong>{' '}
                  {plan.billingPeriod === 'MONTHLY' ? 'Mensual' : 'Por sesión'}
                </p>

                {plan.paymentDueDay !== null && (
                  <p style={{ margin: '4px 0' }}>
                    <strong>Día de pago:</strong> Día {plan.paymentDueDay}
                  </p>
                )}

                <div className="plan-price-box">
                  <span style={{ fontSize: '12px', opacity: 0.7 }}>
                    Tarifa Vigente:
                  </span>
                  <div className="plan-price-amount">
                    {plan.currentTariff
                      ? formatoPrecio(plan.currentTariff.amountCop)
                      : 'Sin tarifa'}
                  </div>
                  {plan.currentTariff && (
                    <span style={{ fontSize: '11px', opacity: 0.7 }}>
                      Desde: {plan.currentTariff.effectiveFrom}
                    </span>
                  )}
                </div>
              </div>

              {/* Botonera de acciones (Diferenciada según el rol) */}
              <div className="plan-card-actions">
                {rol === 'ADMIN' ? (
                  <>
                    <div className="plan-card-actions-row">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => abrirEditar(plan)}
                        disabled={plan.status !== 'ACTIVE'}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => abrirTarifa(plan)}
                        disabled={plan.status !== 'ACTIVE'}
                      >
                        + Tarifa
                      </button>
                    </div>

                    <div className="plan-card-actions-row">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => void consultarDetalle(plan, 'tarifas')}
                      >
                        Historial
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => void consultarDetalle(plan, 'auditoria')}
                      >
                        Auditoría
                      </button>
                    </div>

                    {plan.status === 'ACTIVE' && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => void desactivarPlan(plan)}
                        style={{ color: '#ef4444', borderColor: '#ef4444' }}
                      >
                        Desactivar plan
                      </button>
                    )}
                  </>
                ) : (
                  // Vista Patinador: Solo consulta el historial de tarifas si lo desea
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void consultarDetalle(plan, 'tarifas')}
                  >
                    Ver historial de tarifas
                  </button>
                )}
              </div>
            </article>
          ))}
      </div>

      {/* DIÁLOGO MODAL 3 y 4: Historial de Tarifas / Auditoría */}
      {(detalleTitulo || cargandoDetalle) && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h2>{detalleTitulo}</h2>
            {cargandoDetalle && <p>Cargando información...</p>}
            {detalle !== null && (
              <pre
                style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                  background: 'var(--code-bg)',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                }}
              >
                {JSON.stringify(detalle, null, 2)}
              </pre>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setDetalle(null)
                  setDetalleTitulo('')
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default App