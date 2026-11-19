import { useEffect, useState, type FormEvent } from 'react'
import {
  ajustarStock,
  crearUniforme,
  desactivarUniforme,
  listarUniformes,
} from '../services/uniformes.service'
import type { TipoUniforme, Uniforme } from '../types/uniforme'
import './inventario-uniformes.css'

const nombresTipo: Record<TipoUniforme, string> = {
  CAMISETA: 'Camiseta oficial',
  CHAQUETA: 'Chaqueta',
  PANTALON: 'Pantalón',
  UNIFORME_COMPLETO: 'Uniforme completo',
}

function dinero(valor: number) {
  return `$ ${valor.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
}

function Icon({ name }: { name: 'search' | 'plus' | 'adjust' | 'off' | 'menu' | 'alert' | 'close' }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    adjust: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
    off: <><circle cx="12" cy="12" r="8" /><path d="M8 12h8" /></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    alert: <><path d="M12 3 3 20h18L12 3Z" /><path d="M12 9v4M12 17h.01" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  }
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function EstadoStock({ uniforme }: { uniforme: Uniforme }) {
  const alerta = uniforme.estadoStock === 'ALERTA_MINIMO'
  return (
    <span className={`status-badge ${alerta ? 'status-badge--warning' : 'status-badge--success'}`}>
      <span className="status-dot" aria-hidden="true" />
      {alerta ? 'Alerta por cantidad mínima' : 'Stock normal'}
    </span>
  )
}

export default function InventarioUniformesPage() {
  const [uniformes, setUniformes] = useState<Uniforme[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [tipo, setTipo] = useState<TipoUniforme | ''>('')
  const [soloActivos, setSoloActivos] = useState(true)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [modal, setModal] = useState<'crear' | 'ajustar' | 'desactivar' | null>(null)
  const [seleccionado, setSeleccionado] = useState<Uniforme | null>(null)
  const [movimiento, setMovimiento] = useState('')
  const [motivo, setMotivo] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      setUniformes(await listarUniformes({
        buscar: busqueda || undefined,
        tipo: tipo || undefined,
        activo: soloActivos ? 'true' : undefined,
      }))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No fue posible cargar el inventario')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const datos = new FormData(evento.currentTarget)
    try {
      await crearUniforme({
        referencia: String(datos.get('referencia')),
        tipo: String(datos.get('tipo')) as TipoUniforme,
        talla: String(datos.get('talla')),
        costo: Number(datos.get('costo')),
        precioVenta: Number(datos.get('precioVenta')),
        cantidadDisponible: Number(datos.get('cantidadDisponible')),
        cantidadMinima: Number(datos.get('cantidadMinima')),
      })
      setModal(null)
      setMensaje('Referencia registrada correctamente')
      await cargar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No fue posible registrar la referencia')
    }
  }

  async function ajustar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!seleccionado) return
    try {
      await ajustarStock(seleccionado.id, Number(movimiento), motivo)
      setModal(null)
      setMensaje('Stock actualizado correctamente')
      await cargar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No fue posible ajustar el stock')
    }
  }

  async function desactivar() {
    if (!seleccionado || motivo.trim().length === 0) return
    try {
      await desactivarUniforme(seleccionado.id, motivo)
      setModal(null)
      setMensaje('Referencia desactivada. El historial se conserva')
      await cargar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No fue posible desactivar la referencia')
    }
  }

  function abrir(seleccion: Uniforme, tipoModal: 'ajustar' | 'desactivar') {
    setSeleccionado(seleccion)
    setMovimiento('')
    setMotivo('')
    setModal(tipoModal)
  }

  const alertas = uniformes.filter((item) => item.estadoStock === 'ALERTA_MINIMO').length
  const disponibles = uniformes.reduce((total, item) => total + item.cantidadDisponible, 0)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">V</span><span>Velora</span></div>
        <nav aria-label="Navegación principal">
          <p className="nav-label">Administración</p>
          <a href="#panel">Panel</a>
          <a href="#personal">Personal</a>
          <a href="#reportes">Reportes</a>
          <p className="nav-label nav-label--space">Uniformes</p>
          <a className="nav-active" href="#inventario">Inventario</a>
          <a href="#ventas">Ventas</a>
          <a href="#prestamos">Préstamos</a>
        </nav>
        <div className="user-card"><span className="avatar">AL</span><span><strong>Andrea López</strong><small>Administrador</small></span></div>
      </aside>

      <main className="main-content" id="inventario">
        <header className="mobile-header"><button className="icon-button" type="button" aria-label="Abrir navegación"><Icon name="menu" /></button><span className="brand-text">Velora</span></header>
        <div className="page-heading">
          <div><p className="breadcrumb">Administración / Inventario</p><h1>Inventario de uniformes</h1><p>Referencias, tallas, existencias y proveedores</p></div>
          <button className="button button--primary" type="button" onClick={() => setModal('crear')}><Icon name="plus" />Registrar referencia</button>
        </div>

        {mensaje && <div className="alert alert--success" role="status"><span>✓</span><p>{mensaje}</p><button type="button" onClick={() => setMensaje('')} aria-label="Cerrar mensaje"><Icon name="close" /></button></div>}
        {error && <div className="alert alert--error" role="alert"><Icon name="alert" /><p>{error}</p><button type="button" onClick={() => setError('')} aria-label="Cerrar error"><Icon name="close" /></button></div>}

        <section className="summary-grid" aria-label="Resumen de inventario">
          <article><span>Referencias activas</span><strong>{uniformes.length}</strong></article>
          <article><span>Unidades disponibles</span><strong>{disponibles}</strong></article>
          <article className={alertas ? 'summary-alert' : ''}><span>Con cantidad mínima</span><strong>{alertas}</strong></article>
        </section>

        <section className="inventory-panel">
          <form className="filter-bar" onSubmit={(evento) => { evento.preventDefault(); void cargar() }}>
            <label className="search-field"><span>Buscar</span><span className="input-wrap"><Icon name="search" /><input value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Referencia, talla o proveedor" /></span></label>
            <label><span>Tipo</span><select value={tipo} onChange={(evento) => setTipo(evento.target.value as TipoUniforme | '')}><option value="">Todos</option>{Object.entries(nombresTipo).map(([valor, nombre]) => <option value={valor} key={valor}>{nombre}</option>)}</select></label>
            <label className="active-filter"><span>Estado</span><select value={soloActivos ? 'true' : 'false'} onChange={(evento) => setSoloActivos(evento.target.value === 'true')}><option value="true">Activas</option><option value="false">Todas</option></select></label>
            <button className="button button--secondary" type="submit">Filtrar</button>
          </form>

          {cargando ? (
            <div className="loading-state" aria-live="polite">Cargando inventario…</div>
          ) : uniformes.length === 0 ? (
            <div className="empty-state"><span className="empty-icon"><Icon name="search" /></span><h2>Sin resultados</h2><p>No hay referencias que coincidan con los filtros.</p><button className="button button--secondary" type="button" onClick={() => { setBusqueda(''); setTipo(''); void cargar() }}>Limpiar filtros</button></div>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Referencia</th><th>Tipo</th><th>Talla</th><th className="align-right">Costo</th><th className="align-right">Precio</th><th className="align-right">Disponible</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
                  <tbody>{uniformes.map((uniforme) => (
                    <tr key={uniforme.id}>
                      <td><strong>{uniforme.referencia}</strong><small>{uniforme.proveedor ?? 'Sin proveedor asignado'}</small></td>
                      <td>{nombresTipo[uniforme.tipo]}</td><td>{uniforme.talla}</td>
                      <td className="align-right numeric">{dinero(uniforme.costo)}</td><td className="align-right numeric">{dinero(uniforme.precioVenta)}</td>
                      <td className="align-right"><strong className="stock-number">{uniforme.cantidadDisponible}</strong><small>Mín. {uniforme.cantidadMinima}</small></td>
                      <td><EstadoStock uniforme={uniforme} /></td>
                      <td><div className="row-actions"><button type="button" className="icon-button" title="Ajustar stock" aria-label={`Ajustar stock de ${uniforme.referencia}`} onClick={() => abrir(uniforme, 'ajustar')}><Icon name="adjust" /></button><button type="button" className="icon-button icon-button--danger" title="Desactivar" aria-label={`Desactivar ${uniforme.referencia}`} onClick={() => abrir(uniforme, 'desactivar')}><Icon name="off" /></button></div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="mobile-list">{uniformes.map((uniforme) => <article className="mobile-card" key={uniforme.id}><div><strong>{uniforme.referencia}</strong><EstadoStock uniforme={uniforme} /></div><p>{nombresTipo[uniforme.tipo]} · Talla {uniforme.talla}</p><dl><div><dt>Disponible</dt><dd>{uniforme.cantidadDisponible}</dd></div><div><dt>Mínimo</dt><dd>{uniforme.cantidadMinima}</dd></div><div><dt>Precio</dt><dd className="numeric">{dinero(uniforme.precioVenta)}</dd></div></dl><div className="row-actions"><button className="button button--secondary" type="button" onClick={() => abrir(uniforme, 'ajustar')}>Ajustar stock</button><button className="button button--ghost button--danger" type="button" onClick={() => abrir(uniforme, 'desactivar')}>Desactivar</button></div></article>)}</div>
            </>
          )}
        </section>
      </main>

      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setModal(null) }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading"><div><p>{modal === 'crear' ? 'RF-M6-06' : seleccionado?.referencia}</p><h2 id="modal-title">{modal === 'crear' ? 'Registrar referencia' : modal === 'ajustar' ? 'Ajustar stock' : 'Desactivar referencia'}</h2></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setModal(null)}><Icon name="close" /></button></div>
            {modal === 'crear' && <form onSubmit={crear} className="form-grid">
              <label><span>Referencia *</span><input name="referencia" required maxLength={100} /></label>
              <label><span>Tipo *</span><select name="tipo" required>{Object.entries(nombresTipo).map(([valor, nombre]) => <option value={valor} key={valor}>{nombre}</option>)}</select></label>
              <label><span>Talla *</span><input name="talla" required maxLength={30} /></label>
              <label><span>Costo COP *</span><input name="costo" type="number" min="0" step="0.01" required /></label>
              <label><span>Precio de venta COP *</span><input name="precioVenta" type="number" min="0" step="0.01" required /></label>
              <label><span>Cantidad inicial *</span><input name="cantidadDisponible" type="number" min="0" defaultValue="0" required /></label>
              <label><span>Cantidad mínima *</span><input name="cantidadMinima" type="number" min="0" defaultValue="0" required /></label>
              <div className="modal-actions"><button type="button" className="button button--ghost" onClick={() => setModal(null)}>Cancelar</button><button type="submit" className="button button--primary">Guardar referencia</button></div>
            </form>}
            {modal === 'ajustar' && <form onSubmit={ajustar} className="form-grid"><label className="form-wide"><span>Variación de unidades *</span><input type="number" value={movimiento} onChange={(evento) => setMovimiento(evento.target.value)} required /><small>Usa un valor positivo para ingresar o negativo para retirar.</small></label><label className="form-wide"><span>Observación</span><textarea value={motivo} onChange={(evento) => setMotivo(evento.target.value)} maxLength={500} /></label><div className="modal-actions"><button type="button" className="button button--ghost" onClick={() => setModal(null)}>Cancelar</button><button type="submit" className="button button--primary">Guardar ajuste</button></div></form>}
            {modal === 'desactivar' && <div className="confirm-content"><div className="alert alert--warning"><Icon name="alert" /><p>La referencia conservará su historial y dejará de aparecer como activa.</p></div><label><span>Motivo de desactivación *</span><textarea value={motivo} onChange={(evento) => setMotivo(evento.target.value)} maxLength={500} required /></label><div className="modal-actions"><button type="button" className="button button--ghost" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="button button--danger" disabled={!motivo.trim()} onClick={() => void desactivar()}>Desactivar</button></div></div>}
          </section>
        </div>
      )}
    </div>
  )
}
