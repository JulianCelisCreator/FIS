import { useState, type FormEvent } from 'react'
import { Alerta, Campo } from '../../../shared/ui/componentes.tsx'
import { formatoCop, formatoFecha, hoyEnClub } from '../../../shared/utils/formato.ts'
import { generarReporte } from '../services/reportes.service.ts'
import {
  TIPOS_REPORTE,
  validarRango,
  type ErroresRango,
  type FormatoValor,
  type Reporte,
  type TipoReporte,
} from '../types/reportes.types.ts'

const numero = new Intl.NumberFormat('es-CO')
const fechaHora = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
})

function formatear(valor: string | number | null | undefined, formato: FormatoValor): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (formato === 'cop') {
    const pesos = Number(valor)
    return pesos < 0 ? `− ${formatoCop(-pesos)}` : formatoCop(pesos)
  }
  if (formato === 'numero') return numero.format(Number(valor))
  if (formato === 'fecha') return formatoFecha(String(valor))
  return String(valor)
}

/**
 * Reportes financieros (HU-6.4 / RF-M6-04) para Administrador y Contador.
 * Solo consulta: el tipo y el rango se eligen aquí y el servidor calcula todo.
 */
export function ReportesFinancieros() {
  const hoy = hoyEnClub()
  const [tipo, setTipo] = useState<TipoReporte>('ingresos')
  const [desde, setDesde] = useState(`${hoy.slice(0, 8)}01`)
  const [hasta, setHasta] = useState(hoy)
  const [errores, setErrores] = useState<ErroresRango>({})
  const [reporte, setReporte] = useState<Reporte | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const generar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (cargando) return
    const encontrados = validarRango(desde, hasta)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return
    setCargando(true)
    setError(null)
    try {
      setReporte(await generarReporte(tipo, desde, hasta))
    } catch (e) {
      setReporte(null)
      setError(e instanceof Error ? e.message : 'No se pudo generar el reporte.')
    } finally {
      setCargando(false)
    }
  }

  const ayuda = TIPOS_REPORTE.find((item) => item.valor === tipo)?.ayuda

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb"><span>Administración</span><span>/</span><span>Reportes financieros</span></nav>
          <h1>Reportes financieros</h1>
          <p className="vl-text-body-sm">Consulta ingresos, pagos, cartera y movimientos de uniformes de un período.</p>
        </div>
      </header>

      <form className="vl-filter-bar" onSubmit={generar} noValidate aria-label="Parámetros del reporte">
        <Campo etiqueta="Tipo de reporte" id="reporte-tipo" ayuda={ayuda}>
          <select id="reporte-tipo" className="vl-select" value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoReporte)}>
            {TIPOS_REPORTE.map((item) => <option key={item.valor} value={item.valor}>{item.texto}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Fecha inicial" id="reporte-desde" obligatorio error={errores.desde}>
          <input id="reporte-desde" className="vl-input" type="date" value={desde} max={hasta || undefined}
            aria-invalid={!!errores.desde || undefined} onChange={(e) => setDesde(e.target.value)} />
        </Campo>
        <Campo etiqueta="Fecha final" id="reporte-hasta" obligatorio error={errores.hasta}>
          <input id="reporte-hasta" className="vl-input" type="date" value={hasta} min={desde || undefined}
            aria-invalid={!!errores.hasta || undefined} onChange={(e) => setHasta(e.target.value)} />
        </Campo>
        <button className="vl-button vl-button--primary" type="submit" aria-disabled={cargando || undefined}>
          {cargando ? 'Generando…' : 'Generar reporte'}
        </button>
      </form>

      {error && <Alerta tono="error" titulo="No se pudo generar el reporte"><p>{error}</p></Alerta>}

      {reporte && (
        <section className="vl-stack" aria-labelledby="titulo-reporte">
          <div className="app-panel-head">
            <div className="vl-stack">
              <h2 id="titulo-reporte" className="vl-text-heading-h5">{reporte.titulo}</h2>
              <p className="vl-text-caption">
                Período {formatoFecha(reporte.desde)} – {formatoFecha(reporte.hasta)} · Generado el{' '}
                {fechaHora.format(new Date(reporte.generadoEn))}
              </p>
            </div>
          </div>

          {reporte.sinDatos && (
            <Alerta tono="info" titulo="Sin información en el período">
              <p>No hay registros entre las fechas elegidas; los totales aparecen en cero.</p>
            </Alerta>
          )}

          <dl className="app-stats" aria-label="Totales del reporte">
            {reporte.totales.map((total) => (
              <div className="app-stat" key={total.clave}>
                <dt>{total.etiqueta}</dt>
                <dd><span className="app-stat__valor">{formatear(total.valor, total.formato)}</span></dd>
              </div>
            ))}
          </dl>

          {reporte.notas.map((nota) => <p key={nota} className="vl-text-caption">{nota}</p>)}

          {!reporte.sinDatos && (
            <div className="vl-table-wrap">
              <table className="vl-table">
                <caption className="vl-text-caption">Detalle: {numero.format(reporte.filas.length)} registros</caption>
                <thead>
                  <tr>{reporte.columnas.map((columna) => <th key={columna.clave} scope="col">{columna.etiqueta}</th>)}</tr>
                </thead>
                <tbody>
                  {reporte.filas.map((fila, indice) => (
                    <tr key={indice}>
                      {reporte.columnas.map((columna) => (
                        <td key={columna.clave} data-label={columna.etiqueta}>{formatear(fila[columna.clave], columna.formato)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
