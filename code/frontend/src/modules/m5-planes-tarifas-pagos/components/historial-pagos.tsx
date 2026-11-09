import { useEffect, useState } from 'react'
import { Alerta, Campo, Insignia } from '../../../shared/ui/componentes.tsx'
import { formatoCop, formatoFecha } from '../../../shared/utils/formato.ts'
import { enlace } from '../../../shared/utils/use-ruta.ts'
import { buscarPatinadores, historialPagos } from '../services/m5.service.ts'
import type { PagoDemo, PatinadorM5 } from '../types/m5.types.ts'
import { AvisoApiPendienteM5 } from './aviso-api-m5.tsx'

export function HistorialPagos({ patinadorInicial }: { patinadorInicial?: number }) {
  const [patinadores, setPatinadores] = useState<PatinadorM5[]>([])
  const [patinadorId, setPatinadorId] = useState<number | null>(patinadorInicial ?? null)
  const [respuesta, setRespuesta] = useState<{
    patinadorId: number | null
    pagos: PagoDemo[]
    error: string | null
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    buscarPatinadores()
      .then((lista) => vigente && setPatinadores(lista))
      .catch((e: Error) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [])

  useEffect(() => {
    let vigente = true
    historialPagos(patinadorId ?? undefined)
      .then((lista) => vigente && setRespuesta({ patinadorId, pagos: lista, error: null }))
      .catch((e: Error) => vigente && setRespuesta({ patinadorId, pagos: [], error: e.message }))
    return () => {
      vigente = false
    }
  }, [patinadorId])

  const alFiltrar = (id: number | null) => {
    setPatinadorId(id)
    window.location.hash = enlace('historial-pagos', id === null ? {} : { patinador: id })
  }

  const respuestaActual = respuesta?.patinadorId === patinadorId ? respuesta : null
  const pagosVisibles = respuestaActual?.pagos ?? null

  return (
    <div className="app-page">
      <header className="vl-stack">
        <nav className="vl-breadcrumb" aria-label="Ruta">
          <span>Pagos</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Historial de pagos</span>
        </nav>
        <h1>Historial de pagos</h1>
        <p className="vl-text-body-sm">Consulta los pagos recibidos, abonos y comprobantes de la demostración local.</p>
      </header>

      <Alerta tono="info" titulo="Historial local de demostración">
        <p>Los registros son ficticios, solo existen en esta sesión del navegador y se reinician al recargar la página.</p>
      </Alerta>
      <AvisoApiPendienteM5 peticiones={['GET /m5/pagos (historial de pagos y abonos)']} />
      <Campo etiqueta="Filtrar por patinador" id="historial-patinador">
        <select
          id="historial-patinador"
          className="vl-select"
          value={patinadorId ?? ''}
          onChange={(evento) => alFiltrar(evento.target.value ? Number(evento.target.value) : null)}
        >
          <option value="">Todos los patinadores</option>
          {patinadores.map((patinador) => (
            <option key={patinador.id} value={patinador.id}>{patinador.nombre}</option>
          ))}
        </select>
      </Campo>
      {(error || respuestaActual?.error) && (
        <Alerta tono="error" titulo="No se pudo cargar el historial">{error ?? respuestaActual?.error}</Alerta>
      )}
      {pagosVisibles === null && <p className="vl-text-caption" role="status">Cargando pagos…</p>}
      {pagosVisibles?.length === 0 && (
        <Alerta tono="info" titulo="Aún no hay pagos registrados">
          <p>Cuando registres un pago o abono, aparecerá aquí con su comprobante.</p>
        </Alerta>
      )}
      {pagosVisibles && pagosVisibles.length > 0 && (
        <div className="vl-table-wrap">
          <table className="vl-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Patinador</th>
                <th>Concepto</th>
                <th>Monto</th>
                <th>Medio</th>
                <th>Comprobante</th>
                <th>Registrado por</th>
              </tr>
            </thead>
            <tbody>
              {pagosVisibles.map((pago) => (
                <tr key={pago.id}>
                  <td data-label="Fecha">{formatoFecha(pago.fechaPago)}</td>
                  <td data-label="Patinador">{pago.patinadorNombre}</td>
                  <td data-label="Concepto">{pago.concepto}</td>
                  <td data-label="Monto">{formatoCop(pago.monto)}</td>
                  <td data-label="Medio">{pago.medioPago}{pago.referencia ? ` · ${pago.referencia}` : ''}</td>
                  <td data-label="Comprobante"><Insignia entidad="pago" estado="registrado" /> {pago.comprobante}</td>
                  <td data-label="Registrado por">{pago.registradoPor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
