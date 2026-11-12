import { AvisoApiPendienteM5 } from './aviso-api-m5.tsx'

export function HistorialPagos() {
  return (
    <div className="app-page">
      <header className="vl-stack">
        <nav className="vl-breadcrumb" aria-label="Ruta">
          <span>Pagos</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Historial de pagos</span>
        </nav>
        <h1>Historial de pagos</h1>
        <p className="vl-text-body-sm">Consulta los pagos recibidos, abonos y comprobantes.</p>
      </header>
      <AvisoApiPendienteM5 peticiones={['GET /m5/pagos (historial de pagos y abonos)']} />
    </div>
  )
}
