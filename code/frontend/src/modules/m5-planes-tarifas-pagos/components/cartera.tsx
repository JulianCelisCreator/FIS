import { useEffect, useState } from 'react'
import {
  Alerta,
  Campo,
  DialogoConfirmacion,
  Insignia,
} from '../../../shared/ui/componentes.tsx'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'
import { formatoCop, formatoFecha } from '../../../shared/utils/formato.ts'
import { enlace } from '../../../shared/utils/use-ruta.ts'
import { consultarCartera, estadoCuenta, planesParaElegir } from '../services/m5.service.ts'
import {
  ESTADO_CARTERA_DS,
  PERMISOS_M5,
  type EstadoCartera,
  type EstadoCuenta,
  type FilaCartera,
  type FiltrosCartera,
  type PlanOfertado,
  type RespuestaCartera,
} from '../types/m5.types.ts'
import { nombreCobro } from '../utils/textos-pagos.ts'

/** RF-M5-13: «Estado de cartera» del Administrador y el Contador (wireframes/grupo-04/cartera). */
export function Cartera() {
  const { tienePermiso } = useSesion()
  const puedeCobrar = tienePermiso(PERMISOS_M5.pagoRegistrar)

  const [estado, setEstado] = useState<EstadoCartera | ''>('')
  const [planId, setPlanId] = useState('')
  const [patinador, setPatinador] = useState('')
  const [acudiente, setAcudiente] = useState('')
  const [venceDesde, setVenceDesde] = useState('')
  const [venceHasta, setVenceHasta] = useState('')
  const [planes, setPlanes] = useState<PlanOfertado[]>([])
  const [respuesta, setRespuesta] = useState<RespuestaCartera | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<FilaCartera | null>(null)

  // Los textos esperan 300 ms a que se deje de escribir; los selectores consultan de inmediato.
  const [textos, setTextos] = useState({ patinador: '', acudiente: '' })
  useEffect(() => {
    const espera = setTimeout(() => setTextos({ patinador: patinador.trim(), acudiente: acudiente.trim() }), 300)
    return () => clearTimeout(espera)
  }, [patinador, acudiente])

  useEffect(() => {
    planesParaElegir(false)
      .then(setPlanes)
      .catch(() => setPlanes([]))
  }, [])

  useEffect(() => {
    let vigente = true
    const filtros: FiltrosCartera = {
      estado: estado || undefined,
      planId: planId ? Number(planId) : undefined,
      patinador: textos.patinador || undefined,
      acudiente: textos.acudiente || undefined,
      venceDesde: venceDesde || undefined,
      venceHasta: venceHasta || undefined,
    }
    consultarCartera(filtros)
      .then((datos) => {
        if (!vigente) return
        setRespuesta(datos)
        setError(null)
      })
      .catch((e: Error) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [estado, planId, textos, venceDesde, venceHasta])

  const hayFiltros = estado || planId || patinador || acudiente || venceDesde || venceHasta
  const limpiar = () => {
    setEstado('')
    setPlanId('')
    setPatinador('')
    setAcudiente('')
    setVenceDesde('')
    setVenceHasta('')
  }
  const resumen = respuesta?.resumen

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb" aria-label="Ruta">
            <span>Pagos</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Cartera</span>
          </nav>
          <h1>Estado de cartera</h1>
          <p className="vl-text-body-sm">Saldo pendiente y cobros vencidos por patinador.</p>
        </div>
        {puedeCobrar && (
          <a className="vl-button vl-button--primary" href={enlace('registrar-pago')}>
            Registrar pago
          </a>
        )}
      </header>

      {resumen && (
        <dl className="app-tablero" aria-label="Resumen de la cartera de la escuela">
          <div>
            <dt>Cartera pendiente</dt>
            <dd className="app-tablero__cifra">{formatoCop(resumen.saldoPendiente)}</dd>
            <dd className="vl-text-caption">En {resumen.cobrosConSaldo} cobros con saldo</dd>
          </div>
          <div>
            <dt>Al día</dt>
            <dd className="app-tablero__cifra">{resumen.alDia}</dd>
          </div>
          <div>
            <dt>Pendiente</dt>
            <dd className="app-tablero__cifra">{resumen.pendiente}</dd>
          </div>
          <div>
            <dt>Vencido</dt>
            <dd className="app-tablero__cifra app-tablero__cifra--alerta">{resumen.vencido}</dd>
          </div>
          <div>
            <dt>Saldo vencido</dt>
            <dd className="app-tablero__cifra">{formatoCop(resumen.saldoVencido)}</dd>
            <dd className="vl-text-caption">De los {resumen.vencido} patinadores en Vencido</dd>
          </div>
        </dl>
      )}

      <Alerta tono="info" titulo="Fechas límite y mora">
        <p>
          Las mensualidades se pagan del día 1 al 5; con saldo, el estado cambia solo a «Vencido» desde el día 6. El primer
          mes atrasado se sigue entrenando; desde el segundo se cobra un recargo por mora y al tercero se cancela el plan.
          El sistema calcula el estado; nadie lo edita.
        </p>
      </Alerta>

      <form className="vl-filter-bar" role="search" aria-label="Filtrar cartera" onSubmit={(evento) => evento.preventDefault()}>
        <Campo etiqueta="Estado de cartera" id="filtro-estado">
          <select id="filtro-estado" className="vl-select" value={estado} onChange={(e) => setEstado(e.target.value as EstadoCartera | '')}>
            <option value="">Todos</option>
            <option value="AL_DIA">Al día</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="VENCIDO">Vencido</option>
          </select>
        </Campo>
        <Campo etiqueta="Plan" id="filtro-plan">
          <select id="filtro-plan" className="vl-select" value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">Todos</option>
            {planes.map((plan) => (
              <option key={plan.id} value={plan.id}>{plan.nombre}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Patinador" id="filtro-patinador">
          <input
            id="filtro-patinador"
            className="vl-input"
            type="search"
            placeholder="Nombre o documento"
            value={patinador}
            onChange={(e) => setPatinador(e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Acudiente" id="filtro-acudiente">
          <input
            id="filtro-acudiente"
            className="vl-input"
            type="search"
            placeholder="Nombre del acudiente"
            value={acudiente}
            onChange={(e) => setAcudiente(e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Vence desde" id="filtro-desde">
          <input id="filtro-desde" className="vl-input" type="date" value={venceDesde} onChange={(e) => setVenceDesde(e.target.value)} />
        </Campo>
        <Campo etiqueta="Vence hasta" id="filtro-hasta">
          <input id="filtro-hasta" className="vl-input" type="date" value={venceHasta} onChange={(e) => setVenceHasta(e.target.value)} />
        </Campo>
        {hayFiltros && (
          <div className="app-filtro-accion">
            <button className="vl-button vl-button--ghost vl-button--sm" type="button" onClick={limpiar}>
              Limpiar filtros
            </button>
          </div>
        )}
      </form>

      {error && <Alerta tono="error" titulo="No se pudo consultar la cartera">{error}</Alerta>}
      {!respuesta && !error && <p className="vl-text-caption" role="status">Cargando cartera…</p>}
      {respuesta?.patinadores.length === 0 && (
        <div className="vl-card vl-stack">
          <p className="vl-text-heading-h5">No hay patinadores con esos filtros</p>
          <p className="vl-text-body-sm">Cambia o limpia los filtros para ver más resultados.</p>
        </div>
      )}
      {respuesta && respuesta.patinadores.length > 0 && (
        <div className="vl-table-wrap">
          <table className="vl-table">
            <caption className="app-oculto">Cartera por patinador</caption>
            <thead>
              <tr>
                <th>Patinador</th>
                <th>Acudiente</th>
                <th>Plan</th>
                <th>Estado</th>
                <th className="vl-num">Saldo pendiente</th>
                <th className="vl-num">Cobros vencidos</th>
                <th>Vencimiento más antiguo</th>
                <th><span className="app-oculto">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {respuesta.patinadores.map((fila) => (
                <tr key={fila.patinadorId}>
                  <td data-label="Patinador">{fila.patinador}</td>
                  <td data-label="Acudiente">{fila.acudientes || (fila.esMenor ? 'Sin acudiente' : '— (mayor de edad)')}</td>
                  <td data-label="Plan">{fila.plan ?? 'Sin plan'}</td>
                  <td data-label="Estado"><Insignia entidad="cartera" estado={ESTADO_CARTERA_DS[fila.estado]} /></td>
                  <td data-label="Saldo pendiente" className="vl-num">{formatoCop(fila.saldoPendiente)}</td>
                  <td data-label="Cobros vencidos" className="vl-num">{fila.cobrosVencidos}</td>
                  <td data-label="Vencimiento más antiguo">
                    {fila.vencimientoMasAntiguo ? formatoFecha(fila.vencimientoMasAntiguo) : '—'}
                  </td>
                  <td data-label="Acciones">
                    <button className="vl-button vl-button--ghost vl-button--sm" type="button" onClick={() => setDetalle(fila)}>
                      Ver cobros
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {respuesta && respuesta.patinadores.length > 0 && (
        <p className="vl-text-caption">
          {respuesta.patinadores.length === 1 ? '1 patinador' : `${respuesta.patinadores.length} patinadores`}
          {hayFiltros ? ' con los filtros aplicados' : ''}.
        </p>
      )}

      {detalle && <DialogoCobros fila={detalle} puedeCobrar={puedeCobrar} alCerrar={() => setDetalle(null)} />}
    </div>
  )
}

/** Cobros del patinador (pagados y con saldo), con acceso a registrar el pago. */
function DialogoCobros({ fila, puedeCobrar, alCerrar }: { fila: FilaCartera; puedeCobrar: boolean; alCerrar: () => void }) {
  const [cuenta, setCuenta] = useState<EstadoCuenta | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    estadoCuenta(fila.patinadorId)
      .then((datos) => vigente && setCuenta(datos))
      .catch((e: Error) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [fila.patinadorId])

  const totalSaldo = cuenta?.cobros.reduce((suma, cobro) => suma + cobro.saldo, 0) ?? 0

  return (
    <DialogoConfirmacion abierto variante="form" titulo={`Cobros de ${fila.patinador}`} textoCancelar="Cerrar" alCancelar={alCerrar}>
      <p className="vl-text-body-sm">
        {fila.plan ?? 'Sin plan'} · Acudiente: {fila.acudientes || '— (mayor de edad)'}
      </p>
      {error && <Alerta tono="error">{error}</Alerta>}
      {!cuenta && !error && <p className="vl-text-caption" role="status">Cargando cobros…</p>}
      {cuenta && cuenta.cobros.length === 0 && <p className="vl-text-body-sm">El patinador no tiene cobros.</p>}
      {cuenta && cuenta.cobros.length > 0 && (
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
              {cuenta.cobros.map((cobro) => (
                <tr key={cobro.id}>
                  <td data-label="Cobro">{nombreCobro(cobro)}</td>
                  <td data-label="Valor" className="vl-num">{formatoCop(cobro.valor)}</td>
                  <td data-label="Pagado" className="vl-num">{formatoCop(cobro.pagado)}</td>
                  <td data-label="Saldo" className="vl-num">{formatoCop(cobro.saldo)}</td>
                  <td data-label="Fecha límite">{formatoFecha(cobro.fechaLimite)}</td>
                  <td data-label="Estado">
                    {cobro.saldo === 0 ? (
                      <Insignia entidad="cobro" estado="pagado" />
                    ) : cobro.vencido ? (
                      <Insignia entidad="cartera" estado="vencido" />
                    ) : (
                      <Insignia entidad="cobro" estado="pendiente" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {cuenta && <p className="vl-text-label">Saldo total: {formatoCop(totalSaldo)}</p>}
      {puedeCobrar && totalSaldo > 0 && (
        <a className="vl-button vl-button--primary" href={enlace('registrar-pago', { patinador: fila.patinadorId })}>
          Registrar pago de este patinador
        </a>
      )}
    </DialogoConfirmacion>
  )
}
