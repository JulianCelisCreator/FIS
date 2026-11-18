import { useEffect, useState } from 'react'
import { Alerta, Campo, Insignia, Pestanas } from '../../../shared/ui/componentes.tsx'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'
import { formatoCop, formatoFecha, hoyEnClub } from '../../../shared/utils/formato.ts'
import { enlace } from '../../../shared/utils/use-ruta.ts'
import { buscarPatinadores, estadoCuenta, urlComprobante } from '../services/m5.service.ts'
import {
  ESTADO_CARTERA_DS,
  PERMISOS_M5,
  type EstadoCuenta,
  type PatinadorM5,
} from '../types/m5.types.ts'
import { cobroAplicado, nombreCobro, textoMedio } from '../utils/textos-pagos.ts'

type Periodo = 'seis-meses' | 'anio' | 'todo'

const PERIODOS: { id: Periodo; texto: string }[] = [
  { id: 'seis-meses', texto: 'Últimos 6 meses' },
  { id: 'anio', texto: String(Number(hoyEnClub().slice(0, 4))) },
  { id: 'todo', texto: 'Todo' },
]

/** Primer día desde el que se muestran los pagos del periodo elegido. */
function inicioDelPeriodo(periodo: Periodo, hoy: string): string | null {
  if (periodo === 'todo') return null
  if (periodo === 'anio') return `${hoy.slice(0, 4)}-01-01`
  const fecha = new Date(`${hoy}T00:00:00Z`)
  fecha.setUTCMonth(fecha.getUTCMonth() - 6)
  return fecha.toISOString().slice(0, 10)
}

/**
 * RF-M5-17 y RF-M5-18: pagos del acudiente (de sus patinadores) y del patinador
 * mayor de edad (los suyos). Solo lectura (wireframes/grupo-04/mis-pagos).
 */
export function MisPagos() {
  const { tieneRol } = useSesion()
  const esAcudiente = tieneRol('ACUDIENTE')
  const [patinadores, setPatinadores] = useState<PatinadorM5[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elegido, setElegido] = useState<number | null>(null)

  useEffect(() => {
    let vigente = true
    buscarPatinadores('')
      .then((lista) => vigente && setPatinadores(lista))
      .catch((e: Error) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [])

  const actual = patinadores?.find((p) => p.id === elegido) ?? patinadores?.[0] ?? null
  const titulo = esAcudiente ? 'Pagos de mis patinadores' : 'Mis pagos'

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb" aria-label="Ruta">
            <span>Pagos</span>
          </nav>
          <h1>{titulo}</h1>
          <p className="vl-text-body-sm">
            {esAcudiente
              ? 'Cobros, pagos y estado de cuenta de cada patinador a tu cargo.'
              : 'Tu plan, tus cobros y tus pagos registrados.'}
          </p>
        </div>
        {patinadores && patinadores.length > 1 && (
          <div className="app-viendo-a">
            <Campo etiqueta="Viendo a" id="viendo-a">
              <select
                id="viendo-a"
                className="vl-select"
                value={actual?.id ?? ''}
                onChange={(evento) => setElegido(Number(evento.target.value))}
              >
                {patinadores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </Campo>
          </div>
        )}
      </header>

      {error && <Alerta tono="error" titulo="No se pudieron consultar tus pagos">{error}</Alerta>}
      {!patinadores && !error && <p className="vl-text-caption" role="status">Cargando…</p>}
      {patinadores?.length === 0 && (
        <Alerta tono="info" titulo={esAcudiente ? 'No tienes patinadores asociados' : 'Tus pagos los consulta tu acudiente'}>
          <p>
            {esAcudiente
              ? 'Cuando la escuela asocie un patinador a tu cuenta, aquí verás sus cobros y pagos.'
              : 'Mientras seas menor de edad, el estado de tus pagos lo consulta tu acudiente. Si crees que es un error, comunícate con la administración.'}
          </p>
        </Alerta>
      )}
      {actual && <CuentaDelPatinador key={actual.id} patinador={actual} esAcudiente={esAcudiente} />}
    </div>
  )
}

function CuentaDelPatinador({ patinador, esAcudiente }: { patinador: PatinadorM5; esAcudiente: boolean }) {
  const { tienePermiso } = useSesion()
  const puedeDescargar = tienePermiso(PERMISOS_M5.comprobanteDescargar)
  const puedeCambiarPlan = tienePermiso(PERMISOS_M5.planAsignar)
  const [cuenta, setCuenta] = useState<EstadoCuenta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState<Periodo>('seis-meses')
  const hoy = hoyEnClub()

  useEffect(() => {
    let vigente = true
    estadoCuenta(patinador.id)
      .then((datos) => vigente && setCuenta(datos))
      .catch((e: Error) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [patinador.id])

  if (error) return <Alerta tono="error" titulo="No se pudo consultar el estado de cuenta">{error}</Alerta>
  if (!cuenta) return <p className="vl-text-caption" role="status">Cargando estado de cuenta…</p>

  const pendientes = cuenta.cobros.filter((cobro) => cobro.saldo > 0)
  const masAntiguo = pendientes[0]
  const desde = inicioDelPeriodo(periodo, hoy)
  const pagos = cuenta.pagos.filter((pago) => !desde || pago.fechaPago >= desde)
  const nombreCorto = patinador.nombre.split(' ')[0]
  const mensajeCartera = {
    AL_DIA: esAcudiente ? 'Sin saldos pendientes' : 'No tienes saldos pendientes',
    PENDIENTE: esAcudiente ? 'Hay un cobro por pagar' : 'Tienes un cobro por pagar',
    VENCIDO: pendientes.filter((c) => c.vencido).length > 1 ? 'Hay cobros que pasaron su fecha límite' : 'Un cobro pasó su fecha límite',
  }[cuenta.cartera.estado]

  return (
    <>
      {puedeCambiarPlan && cuenta.plan && (
        <div className="app-actions">
          <a className="vl-button vl-button--secondary" href={enlace('asignar-plan', { pestana: 'cambiar' })}>
            {esAcudiente ? 'Cambiar plan' : 'Cambiar mi plan'}
          </a>
        </div>
      )}

      <dl className="app-tablero" aria-label={`Estado de cuenta de ${patinador.nombre}`}>
        <div>
          <dt>Estado de cartera</dt>
          <dd><Insignia entidad="cartera" estado={ESTADO_CARTERA_DS[cuenta.cartera.estado]} /></dd>
          <dd className="vl-text-caption">{mensajeCartera}</dd>
        </div>
        <div>
          <dt>Saldo pendiente</dt>
          <dd className="app-tablero__cifra">{formatoCop(cuenta.cartera.saldoPendiente)}</dd>
          {masAntiguo && <dd className="vl-text-caption">Fecha límite: {formatoFecha(masAntiguo.fechaLimite)}</dd>}
        </div>
        <div>
          <dt>{esAcudiente ? 'Plan' : 'Mi plan'}</dt>
          <dd className="app-tablero__texto">{cuenta.plan?.nombre ?? 'Sin plan asignado'}</dd>
          {cuenta.plan && (
            <dd className="vl-text-caption">
              {cuenta.plan.tarifa !== null &&
                `${formatoCop(cuenta.plan.tarifa)} ${cuenta.plan.periodicidad === 'MENSUAL' ? 'al mes' : 'por sesión'} · `}
              {cuenta.plan.diaLimitePago ? `pago hasta el día ${cuenta.plan.diaLimitePago}` : `desde ${formatoFecha(cuenta.plan.fechaInicio)}`}
            </dd>
          )}
        </div>
      </dl>

      <section className="vl-stack" aria-labelledby="titulo-pendientes">
        <h2 id="titulo-pendientes" className="vl-text-heading-h4">Cobros pendientes</h2>
        {pendientes.length === 0 ? (
          <div className="vl-card vl-stack">
            <p className="vl-text-heading-h5">{esAcudiente ? `${nombreCorto} no tiene cobros pendientes` : 'No tienes cobros pendientes'}</p>
            <p className="vl-text-body-sm">Los cobros mensuales se generan el primer día de cada mes.</p>
          </div>
        ) : (
          <div className="vl-table-wrap">
            <table className="vl-table">
              <thead>
                <tr>
                  <th>Cobro</th>
                  <th className="vl-num">Valor</th>
                  <th className="vl-num">Pagado</th>
                  <th className="vl-num">Saldo</th>
                  <th>Fecha límite</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((cobro) => (
                  <tr key={cobro.id}>
                    <td data-label="Cobro">{nombreCobro(cobro)}</td>
                    <td data-label="Valor" className="vl-num">{formatoCop(cobro.valor)}</td>
                    <td data-label="Pagado" className="vl-num">{formatoCop(cobro.pagado)}</td>
                    <td data-label="Saldo" className="vl-num">{formatoCop(cobro.saldo)}</td>
                    <td data-label="Fecha límite">{formatoFecha(cobro.fechaLimite)}</td>
                    <td data-label="Estado">
                      {cobro.vencido ? <Insignia entidad="cartera" estado="vencido" /> : <Insignia entidad="cobro" estado="pendiente" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Alerta tono="info" titulo="¿Cómo pagar?">
        <p>
          Acércate a la sede o haz una transferencia y envía el soporte a la administración. La escuela registra el pago; no
          hay pagos en línea. Los cobros mensuales se pagan hasta su fecha límite y, si queda saldo, se marcan «Vencido»
          después de los días de gracia.
        </p>
      </Alerta>

      <section className="vl-stack" aria-labelledby="titulo-pagos">
        <div className="app-head">
          <h2 id="titulo-pagos" className="vl-text-heading-h4">Pagos realizados</h2>
          <Pestanas
            etiqueta="Periodo de los pagos"
            opciones={PERIODOS}
            activa={periodo}
            alCambiar={setPeriodo}
          />
        </div>
        <div id={`panel-${periodo}`} role="tabpanel" aria-labelledby={`pestana-${periodo}`}>
        {pagos.length === 0 ? (
          <div className="vl-card vl-stack">
            <p className="vl-text-heading-h5">{cuenta.pagos.length === 0 ? 'Aún no hay pagos' : 'No hay pagos en este periodo'}</p>
            <p className="vl-text-body-sm">
              {cuenta.pagos.length === 0
                ? `Cuando la escuela registre un pago${esAcudiente ? ` de ${nombreCorto}` : ''}, aparecerá aquí con su comprobante.`
                : 'Elige «Todo» para ver los pagos anteriores.'}
            </p>
          </div>
        ) : (
          <div className="vl-table-wrap">
            <table className="vl-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Comprobante</th>
                  <th>Cobro</th>
                  <th className="vl-num">Monto</th>
                  <th>Medio</th>
                  <th>Estado</th>
                  {puedeDescargar && <th><span className="app-oculto">Acciones</span></th>}
                </tr>
              </thead>
              <tbody>
                {pagos.map((pago) => (
                  <tr key={pago.pagoId} className={pago.estado === 'ANULADO' ? 'app-fila-anulada' : undefined}>
                    <td data-label="Fecha">{formatoFecha(pago.fechaPago)}</td>
                    <td data-label="Comprobante" className="vl-num">{pago.comprobante ? `N.º ${pago.comprobante.replace(/^CP-/, '')}` : '—'}</td>
                    <td data-label="Cobro">{cobroAplicado(pago)}</td>
                    <td data-label="Monto" className="vl-num">{formatoCop(pago.monto)}</td>
                    <td data-label="Medio">{textoMedio(pago.medioPago)}</td>
                    <td data-label="Estado">
                      <Insignia entidad="pago" estado={pago.estado === 'ANULADO' ? 'anulado' : 'registrado'} />
                    </td>
                    {puedeDescargar && (
                      <td data-label="Acciones">
                        {pago.comprobante && (
                          <a className="vl-button vl-button--ghost vl-button--sm" href={urlComprobante(pago.pagoId)} target="_blank" rel="noopener">
                            Comprobante
                          </a>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </section>
    </>
  )
}
