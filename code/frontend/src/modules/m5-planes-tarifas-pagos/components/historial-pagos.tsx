import { useEffect, useState } from 'react'
import { Alerta, Campo, DialogoConfirmacion, Insignia, ListaDatos } from '../../../shared/ui/componentes.tsx'
import { formatoCop, formatoFecha } from '../../../shared/utils/formato.ts'
import { historialPagos, urlComprobante, urlExportarHistorial } from '../services/m5.service.ts'
import {
  MEDIOS_PAGO,
  type FiltrosHistorial,
  type MedioPago,
  type PagoHistorial,
  type RespuestaHistorial,
} from '../types/m5.types.ts'
import { cobroAplicado, textoMedio } from '../utils/textos-pagos.ts'

const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
})

/** RF-M5-16: historial de pagos del Administrador y el Contador, con exportación (wireframes/grupo-04/historial-pagos). */
export function HistorialPagos() {
  const [buscar, setBuscar] = useState('')
  const [texto, setTexto] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [medio, setMedio] = useState<MedioPago | ''>('')
  const [estado, setEstado] = useState<'REGISTRADO' | 'ANULADO' | ''>('')
  const [respuesta, setRespuesta] = useState<RespuestaHistorial | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [anulado, setAnulado] = useState<PagoHistorial | null>(null)

  useEffect(() => {
    const espera = setTimeout(() => setTexto(buscar.trim()), 300)
    return () => clearTimeout(espera)
  }, [buscar])

  const filtros: FiltrosHistorial = {
    buscar: texto || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
    medio: medio || undefined,
    estado: estado || undefined,
  }
  const rangoInvalido = Boolean(desde && hasta && desde > hasta)

  useEffect(() => {
    if (rangoInvalido) return
    let vigente = true
    historialPagos({
      buscar: texto || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
      medio: medio || undefined,
      estado: estado || undefined,
    })
      .then((datos) => {
        if (!vigente) return
        setRespuesta(datos)
        setError(null)
      })
      .catch((e: Error) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [texto, desde, hasta, medio, estado, rangoInvalido])

  const hayFiltros = buscar || desde || hasta || medio || estado
  const limpiar = () => {
    setBuscar('')
    setDesde('')
    setHasta('')
    setMedio('')
    setEstado('')
  }
  const pagos = respuesta?.pagos ?? []
  const sinPagos = respuesta !== null && pagos.length === 0

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb" aria-label="Ruta">
            <span>Pagos</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Historial de pagos</span>
          </nav>
          <h1>Historial de pagos</h1>
          <p className="vl-text-body-sm">Todos los pagos registrados, también los anulados.</p>
        </div>
        <div className="app-actions">
          <a
            className="vl-button vl-button--secondary"
            href={urlExportarHistorial(filtros, 'pdf')}
            aria-disabled={sinPagos || rangoInvalido}
            onClick={(evento) => (sinPagos || rangoInvalido) && evento.preventDefault()}
            download
          >
            Exportar PDF
          </a>
          <a
            className="vl-button vl-button--secondary"
            href={urlExportarHistorial(filtros, 'xlsx')}
            aria-disabled={sinPagos || rangoInvalido}
            onClick={(evento) => (sinPagos || rangoInvalido) && evento.preventDefault()}
            download
          >
            Exportar XLSX
          </a>
        </div>
      </header>

      <form className="vl-filter-bar" role="search" aria-label="Filtrar pagos" onSubmit={(evento) => evento.preventDefault()}>
        <Campo etiqueta="Buscar" id="filtro-buscar">
          <input
            id="filtro-buscar"
            className="vl-input"
            type="search"
            placeholder="Patinador, acudiente o N.º de comprobante"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Pagado desde" id="filtro-desde">
          <input id="filtro-desde" className="vl-input" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </Campo>
        <Campo
          etiqueta="Pagado hasta"
          id="filtro-hasta"
          error={rangoInvalido ? 'Debe ser igual o posterior a «Pagado desde».' : undefined}
        >
          <input id="filtro-hasta" className="vl-input" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </Campo>
        <Campo etiqueta="Medio de pago" id="filtro-medio">
          <select id="filtro-medio" className="vl-select" value={medio} onChange={(e) => setMedio(e.target.value as MedioPago | '')}>
            <option value="">Todos</option>
            {MEDIOS_PAGO.map((m) => (
              <option key={m.valor} value={m.valor}>{m.texto}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Estado" id="filtro-estado">
          <select
            id="filtro-estado"
            className="vl-select"
            value={estado}
            onChange={(e) => setEstado(e.target.value as 'REGISTRADO' | 'ANULADO' | '')}
          >
            <option value="">Todos</option>
            <option value="REGISTRADO">Registrado</option>
            <option value="ANULADO">Anulado</option>
          </select>
        </Campo>
        {hayFiltros && (
          <div className="app-filtro-accion">
            <button className="vl-button vl-button--ghost vl-button--sm" type="button" onClick={limpiar}>
              Limpiar filtros
            </button>
          </div>
        )}
      </form>

      {error && <Alerta tono="error" titulo="No se pudo consultar el historial">{error}</Alerta>}
      {!respuesta && !error && <p className="vl-text-caption" role="status">Cargando pagos…</p>}
      {sinPagos && (
        <div className="vl-card vl-stack">
          <p className="vl-text-heading-h5">No hay pagos con esos filtros</p>
          <p className="vl-text-body-sm">Cambia o limpia los filtros para ver más resultados.</p>
        </div>
      )}
      {pagos.length > 0 && respuesta && (
        <>
          <div className="vl-table-wrap">
            <table className="vl-table">
              <caption className="app-oculto">Pagos registrados</caption>
              <thead>
                <tr>
                  <th>Comprobante</th>
                  <th>Fecha</th>
                  <th>Patinador</th>
                  <th>Cobro aplicado</th>
                  <th className="vl-num">Monto</th>
                  <th>Medio</th>
                  <th>Registró</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((pago) => (
                  <tr key={pago.pagoId} className={pago.estado === 'ANULADO' ? 'app-fila-anulada' : undefined}>
                    <td data-label="Comprobante" className="vl-num">
                      {pago.comprobante ? (
                        <a
                          className="vl-link"
                          href={urlComprobante(pago.pagoId)}
                          target="_blank"
                          rel="noopener"
                          aria-label={`Abrir comprobante ${pago.comprobante} en PDF`}
                        >
                          N.º {pago.comprobante.replace(/^CP-/, '')}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td data-label="Fecha" className="app-nowrap">{formatoFecha(pago.fechaPago)}</td>
                    <td data-label="Patinador">{pago.patinador}</td>
                    <td data-label="Cobro aplicado">
                      {cobroAplicado(pago)}
                      {pago.cobros[0] && (
                        <span className="app-dato-secundario">Fecha límite {formatoFecha(pago.cobros[0].fechaLimite)}</span>
                      )}
                    </td>
                    <td data-label="Monto" className="vl-num">{formatoCop(pago.monto)}</td>
                    <td data-label="Medio">{textoMedio(pago.medioPago)}</td>
                    <td data-label="Registró">{pago.registradoPor}</td>
                    <td data-label="Estado">
                      <div className="app-estado-pago">
                        <Insignia entidad="pago" estado={pago.estado === 'ANULADO' ? 'anulado' : 'registrado'} />
                        {pago.estado === 'ANULADO' && (
                          <button className="vl-link app-boton-enlace" type="button" onClick={() => setAnulado(pago)}>
                            Ver motivo
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={4}>
                    Total sin anulados · {respuesta.registrados === 1 ? '1 pago' : `${respuesta.registrados} pagos`}
                  </th>
                  <td className="vl-num">{formatoCop(respuesta.total)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
          {pagos.length >= respuesta.limite && (
            <Alerta tono="info" titulo={`Se muestran los ${respuesta.limite} pagos más recientes`}>
              <p>Acota las fechas para ver pagos más antiguos. El total corresponde a los pagos mostrados.</p>
            </Alerta>
          )}
        </>
      )}

      {anulado && (
        <DialogoConfirmacion
          abierto
          variante="form"
          titulo={`Pago anulado · N.º ${anulado.comprobante?.replace(/^CP-/, '') ?? '—'}`}
          textoCancelar="Cerrar"
          alCancelar={() => setAnulado(null)}
        >
          <ListaDatos
            filas={[
              ['Patinador', anulado.patinador],
              ['Cobro', cobroAplicado(anulado)],
              ['Monto', `${formatoCop(anulado.monto)} · ${textoMedio(anulado.medioPago)} · ${formatoFecha(anulado.fechaPago)}`],
              ['Motivo', anulado.motivoAnulacion ?? '—'],
              [
                'Anulado por',
                `${anulado.anuladoPor ?? '—'}${anulado.anuladoEn ? ` · ${FORMATO_FECHA_HORA.format(new Date(anulado.anuladoEn))}` : ''}`,
              ],
            ]}
          />
        </DialogoConfirmacion>
      )}
    </div>
  )
}
