import { useEffect, useRef, useState } from 'react'
import { Alerta, Campo, Insignia } from '../../../shared/ui/componentes.tsx'
import { Icono } from '../../../shared/ui/icono.tsx'
import { cerrarFrase, formatoCop } from '../../../shared/utils/formato.ts'
import { listarInventario, listarProveedores } from '../services/inventario.service.ts'
import {
  contactoProveedor,
  estadoInsigniaUniforme,
  textoTipoUniforme,
  type Proveedor,
  type UniformeInventario,
} from '../types/inventario.types.ts'
import {
  DialogoEstadoProveedor,
  DialogoEstadoUniforme,
  DialogoProveedor,
  DialogoUniforme,
  DialogoAjustarStock,
} from './dialogos-inventario.tsx'

type FiltroStock = '' | 'STOCK_NORMAL' | 'ALERTA_MINIMO'
type FiltroEstado = '' | 'ACTIVO' | 'INACTIVO'
type Accion = 'editar' | 'ajustar-stock' | 'activar' | 'desactivar'

type Dialogo =
  | { tipo: 'crear-uniforme' }
  | { tipo: 'editar-uniforme'; uniforme: UniformeInventario }
  | { tipo: 'ajustar-stock'; uniforme: UniformeInventario }
  | { tipo: 'crear-proveedor' }
  | { tipo: 'estado-uniforme'; uniforme: UniformeInventario; activar: boolean }
  | { tipo: 'estado-proveedor'; proveedor: Proveedor; activar: boolean }
  | null

const POR_PAGINA = 8

/** Sin tildes ni mayúsculas para que «pantalon» encuentre «Pantalón». */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function contarReferencias(uniformes: UniformeInventario[], proveedorId: number): number {
  return uniformes.filter((uniforme) => uniforme.proveedorId === proveedorId).length
}

/**
 * RF-M6-06: inventario de uniformes del Administrador. La API de M6 todavía no
 * existe, así que los datos vienen de un servicio de demostración en memoria.
 */
export function InventarioUniformes() {
  const [uniformes, setUniformes] = useState<UniformeInventario[] | null>(null)
  const [proveedores, setProveedores] = useState<Proveedor[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const [buscar, setBuscar] = useState('')
  const [buscarAplicado, setBuscarAplicado] = useState('')
  const [filtroStock, setFiltroStock] = useState<FiltroStock>('')
  const [filtroProveedor, setFiltroProveedor] = useState<number | ''>('')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('ACTIVO')
  const [pagina, setPagina] = useState(1)

  const [dialogo, setDialogo] = useState<Dialogo>(null)

  // Solo el buscador espera a que se deje de escribir; los filtros y la recarga
  // después de guardar consultan de inmediato.
  useEffect(() => {
    const espera = setTimeout(() => setBuscarAplicado(buscar.trim()), 300)
    return () => clearTimeout(espera)
  }, [buscar])

  useEffect(() => {
    let vigente = true
    Promise.all([listarInventario(), listarProveedores()])
      .then(([inventario, listaProveedores]) => {
        if (!vigente) return
        setUniformes(inventario)
        setProveedores(listaProveedores)
        setError(null)
      })
      .catch((e: Error) => {
        if (vigente) setError(e.message)
      })
    return () => {
      vigente = false
    }
  }, [version])

  const listaUniformes = uniformes ?? []
  const listaProveedores = proveedores ?? []
  const cargando = uniformes === null || proveedores === null

  const activas = listaUniformes.filter((uniforme) => uniforme.activo)
  const alertas = activas.filter((uniforme) => uniforme.estadoStock === 'ALERTA_MINIMO')
  const unidadesDisponibles = activas.reduce(
    (total, uniforme) => total + uniforme.cantidadDisponible,
    0,
  )
  const proveedoresActivos = listaProveedores.filter((proveedor) => proveedor.activo).length

  const filtrados = listaUniformes.filter((uniforme) => {
    if (filtroEstado === 'ACTIVO' && !uniforme.activo) return false
    if (filtroEstado === 'INACTIVO' && uniforme.activo) return false
    if (filtroStock && uniforme.estadoStock !== filtroStock) return false
    if (filtroProveedor !== '' && uniforme.proveedorId !== filtroProveedor) return false
    if (!buscarAplicado) return true
    const texto = normalizar(
      [
        uniforme.referencia,
        textoTipoUniforme(uniforme.tipo),
        `talla ${uniforme.talla}`,
        uniforme.proveedor.razonSocial,
      ].join(' '),
    )
    return texto.includes(normalizar(buscarAplicado))
  })

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * POR_PAGINA
  const visibles = filtrados.slice(inicio, inicio + POR_PAGINA)

  const limpiarFiltros = () => {
    setBuscar('')
    setBuscarAplicado('')
    setFiltroStock('')
    setFiltroProveedor('')
    setFiltroEstado('ACTIVO')
    setPagina(1)
  }

  const cerrar = () => setDialogo(null)
  const recargar = (mensaje: string) => {
    setAviso(mensaje)
    setVersion((valor) => valor + 1)
    setDialogo(null)
  }

  const elegirAccion = (uniforme: UniformeInventario, accion: Accion) => {
    if (accion === 'editar') {
      setDialogo({ tipo: 'editar-uniforme', uniforme })
    } else if (accion === 'ajustar-stock') {
      setDialogo({ tipo: 'ajustar-stock', uniforme })
    } else {
      setDialogo({ tipo: 'estado-uniforme', uniforme, activar: accion === 'activar' })
    }
  }

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb" aria-label="Ruta">
            <span>Uniformes</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Inventario</span>
          </nav>
          <h1>Inventario de uniformes</h1>
          <p className="vl-text-body-sm">Referencias, tallas, existencias y proveedores.</p>
          <p className="vl-text-caption">RF-M6-06</p>
        </div>
        <button
          className="vl-button vl-button--primary"
          type="button"
          onClick={() => setDialogo({ tipo: 'crear-uniforme' })}
        >
          Registrar referencia
        </button>
      </header>

      {aviso && (
        <Alerta tono="success">
          <p>{aviso}</p>
        </Alerta>
      )}

      {error && (
        <Alerta tono="error" titulo="No se pudo cargar el inventario">
          <p>{error}</p>
          <div className="app-actions">
            <button
              className="vl-button vl-button--secondary vl-button--sm"
              type="button"
              onClick={() => setVersion((valor) => valor + 1)}
            >
              Reintentar
            </button>
          </div>
        </Alerta>
      )}

      {cargando && !error && (
        <p className="vl-text-caption" role="status">
          Cargando inventario…
        </p>
      )}

      {!cargando && (
        <>
          <dl className="app-stats" aria-label="Resumen del inventario">
            <div className="app-stat">
              <dt>Referencias activas</dt>
              <dd>
                <span className="app-stat__valor">{activas.length}</span>
                <span className="app-stat__nota">de {listaUniformes.length} registradas</span>
              </dd>
            </div>
            <div className="app-stat">
              <dt>Unidades disponibles</dt>
              <dd>
                <span className="app-stat__valor">{unidadesDisponibles}</span>
                <span className="app-stat__nota">en referencias activas</span>
              </dd>
            </div>
            <div className={`app-stat${alertas.length > 0 ? ' app-stat--alerta' : ''}`}>
              <dt>Alertas de mínimo</dt>
              <dd>
                <span className="app-stat__valor">{alertas.length}</span>
                <span className="app-stat__nota">
                  {alertas.length === 0 ? 'sin alertas' : 'requieren reposición'}
                </span>
              </dd>
            </div>
            <div className="app-stat">
              <dt>Proveedores activos</dt>
              <dd>
                <span className="app-stat__valor">{proveedoresActivos}</span>
                <span className="app-stat__nota">de {listaProveedores.length} registrados</span>
              </dd>
            </div>
          </dl>

          <div className="app-cols app-cols--2">
            {alertas.length > 0 ? (
              <Alerta
                tono="warning"
                titulo={`${alertas.length} ${
                  alertas.length === 1 ? 'referencia está' : 'referencias están'
                } en la cantidad mínima o por debajo`}
              >
                <p>Revisa antes de confirmar nuevas ventas o préstamos.</p>
                <p className="vl-text-body-sm">
                  {alertas
                    .slice(0, 3)
                    .map(
                      (uniforme) =>
                        `${uniforme.referencia} (${uniforme.cantidadDisponible} de ${uniforme.cantidadMinima})`,
                    )
                    .join(' · ')}
                  {alertas.length > 3 ? ` · +${alertas.length - 3} más` : ''}
                </p>
              </Alerta>
            ) : (
              <Alerta tono="success" titulo="Stock por encima del mínimo">
                <p>Todas las referencias activas tienen existencias suficientes.</p>
              </Alerta>
            )}

            <section className="vl-card vl-stack" aria-labelledby="proveedores-titulo">
              <div className="app-panel-head">
                <div>
                  <h2 id="proveedores-titulo" className="vl-text-heading-h5">
                    Proveedores registrados
                  </h2>
                  <p className="vl-text-caption">
                    {proveedoresActivos} activos de {listaProveedores.length}
                  </p>
                </div>
                <button
                  className="vl-button vl-button--secondary vl-button--sm"
                  type="button"
                  onClick={() => setDialogo({ tipo: 'crear-proveedor' })}
                >
                  Registrar proveedor
                </button>
              </div>

              {listaProveedores.length === 0 ? (
                <p className="vl-text-body-sm">
                  Aún no hay proveedores. Registra uno para poder crear referencias.
                </p>
              ) : (
                <ul className="app-proveedores">
                  {listaProveedores.map((proveedor) => {
                    const referencias = contarReferencias(listaUniformes, proveedor.id)
                    return (
                      <li key={proveedor.id} className="app-proveedor">
                        <div className="app-proveedor__datos">
                          <div className="app-proveedor__linea">
                            <span className="app-proveedor__nombre">{proveedor.razonSocial}</span>
                            <Insignia
                              entidad="proveedor"
                              estado={proveedor.activo ? 'activo' : 'inactivo'}
                            />
                          </div>
                          <p className="app-proveedor__meta">
                            NIT {proveedor.nitDocumento} · {contactoProveedor(proveedor)}
                          </p>
                          <p className="vl-text-caption">
                            {referencias === 1
                              ? '1 referencia asociada'
                              : `${referencias} referencias asociadas`}
                          </p>
                        </div>
                        <div className="app-proveedor__acciones">
                          <button
                            className={`vl-button ${
                              proveedor.activo ? 'vl-button--ghost' : 'vl-button--secondary'
                            } vl-button--sm`}
                            type="button"
                            aria-label={`${proveedor.activo ? 'Desactivar' : 'Reactivar'} el proveedor ${proveedor.razonSocial}`}
                            onClick={() =>
                              setDialogo({
                                tipo: 'estado-proveedor',
                                proveedor,
                                activar: !proveedor.activo,
                              })
                            }
                          >
                            {proveedor.activo ? 'Desactivar' : 'Reactivar'}
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>

          <form
            className="vl-filter-bar"
            role="search"
            aria-label="Filtrar inventario"
            onSubmit={(evento) => evento.preventDefault()}
          >
            <Campo etiqueta="Buscar" id="filtro-inventario-buscar">
              <input
                id="filtro-inventario-buscar"
                className="vl-input"
                type="search"
                placeholder="Referencia, tipo o talla"
                value={buscar}
                onChange={(evento) => {
                  setBuscar(evento.target.value)
                  setPagina(1)
                }}
              />
            </Campo>
            <Campo etiqueta="Estado de stock" id="filtro-inventario-stock">
              <select
                id="filtro-inventario-stock"
                className="vl-select"
                value={filtroStock}
                onChange={(evento) => {
                  setFiltroStock(evento.target.value as FiltroStock)
                  setPagina(1)
                }}
              >
                <option value="">Todos</option>
                <option value="STOCK_NORMAL">Stock normal</option>
                <option value="ALERTA_MINIMO">En mínimo</option>
              </select>
            </Campo>
            <Campo etiqueta="Proveedor" id="filtro-inventario-proveedor">
              <select
                id="filtro-inventario-proveedor"
                className="vl-select"
                value={filtroProveedor}
                onChange={(evento) => {
                  setFiltroProveedor(evento.target.value ? Number(evento.target.value) : '')
                  setPagina(1)
                }}
              >
                <option value="">Todos</option>
                {listaProveedores.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.razonSocial}
                    {proveedor.activo ? '' : ' (inactivo)'}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Estado" id="filtro-inventario-estado">
              <select
                id="filtro-inventario-estado"
                className="vl-select"
                value={filtroEstado}
                onChange={(evento) => {
                  setFiltroEstado(evento.target.value as FiltroEstado)
                  setPagina(1)
                }}
              >
                <option value="ACTIVO">Activas</option>
                <option value="INACTIVO">Inactivas</option>
                <option value="">Todas</option>
              </select>
            </Campo>
          </form>

          {filtrados.length === 0 ? (
            <div className="vl-card vl-stack">
              <p className="vl-text-heading-h5">No hay referencias con esos filtros</p>
              <p className="vl-text-body-sm">
                Cambia los filtros o registra una referencia nueva.
              </p>
              <div className="app-actions">
                <button
                  className="vl-button vl-button--secondary vl-button--sm"
                  type="button"
                  onClick={limpiarFiltros}
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="vl-table-wrap">
                <table className="vl-table app-tabla-inventario">
                  <caption className="app-oculto">Inventario de uniformes</caption>
                  <thead>
                    <tr>
                      <th>Referencia</th>
                      <th>Tipo</th>
                      <th>Talla</th>
                      <th>Proveedor</th>
                      <th className="vl-num">Costo</th>
                      <th className="vl-num">Precio</th>
                      <th className="vl-num">Disponible</th>
                      <th className="vl-num">Mínimo</th>
                      <th>Estado</th>
                      <th>
                        <span className="app-oculto">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((uniforme) => (
                      <tr key={uniforme.id}>
                        <td data-label="Referencia">
                          <span className="app-referencia">{uniforme.referencia}</span>
                        </td>
                        <td data-label="Tipo">{textoTipoUniforme(uniforme.tipo)}</td>
                        <td data-label="Talla">{uniforme.talla}</td>
                        <td data-label="Proveedor">
                          <span className="app-celda-apilada">
                            {uniforme.proveedor.razonSocial}
                            {!uniforme.proveedor.activo && (
                              <span className="vl-text-caption">Proveedor inactivo</span>
                            )}
                          </span>
                        </td>
                        <td data-label="Costo" className="vl-num">
                          {formatoCop(uniforme.costo)}
                        </td>
                        <td data-label="Precio" className="vl-num">
                          {formatoCop(uniforme.precioVenta)}
                        </td>
                        <td data-label="Disponible" className="vl-num">
                          <span className="app-celda-apilada">
                            <span
                              className={
                                uniforme.estadoStock === 'ALERTA_MINIMO'
                                  ? 'app-stock-bajo'
                                  : undefined
                              }
                            >
                              {uniforme.cantidadDisponible}
                            </span>
                            {uniforme.estadoStock === 'ALERTA_MINIMO' && (
                              <span className="vl-text-caption">Bajo mínimo</span>
                            )}
                          </span>
                        </td>
                        <td data-label="Mínimo" className="vl-num">
                          {uniforme.cantidadMinima}
                        </td>
                        <td data-label="Estado">
                          <Insignia
                            entidad="uniforme"
                            estado={estadoInsigniaUniforme(uniforme)}
                          />
                        </td>
                        <td data-label="Acciones">
                          <MenuAcciones uniforme={uniforme} alElegir={elegirAccion} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="app-table-footer">
                <p className="vl-text-caption" role="status">
                  Mostrando {inicio + 1}–{Math.min(inicio + POR_PAGINA, filtrados.length)} de{' '}
                  {filtrados.length} referencias
                </p>
                <div className="app-pagination">
                  <button
                    className="vl-button vl-button--secondary vl-button--sm"
                    type="button"
                    disabled={paginaActual === 1}
                    onClick={() => setPagina((valor) => Math.max(1, valor - 1))}
                  >
                    Anterior
                  </button>
                  <span className="app-pagination__estado">
                    Página {paginaActual} de {totalPaginas}
                  </span>
                  <button
                    className="vl-button vl-button--secondary vl-button--sm"
                    type="button"
                    disabled={paginaActual === totalPaginas}
                    onClick={() => setPagina((valor) => Math.min(totalPaginas, valor + 1))}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}

          <Alerta tono="info" titulo="Reglas del inventario">
            <p>
              Cantidades y precios no admiten valores negativos. La referencia es única y la
              combinación de tipo, talla y proveedor también. Las referencias con movimientos no se
              eliminan físicamente: se desactivan y conservan su historial.
            </p>
          </Alerta>
        </>
      )}

      {dialogo?.tipo === 'ajustar-stock' && (
        <DialogoAjustarStock
          uniforme={dialogo.uniforme}
          alCerrar={cerrar}
          alGuardar={(actualizado) =>
            recargar(`Se ajustó el stock de ${actualizado.referencia}; disponible: ${actualizado.cantidadDisponible}.`)
          }
        />
      )}

      {dialogo?.tipo === 'crear-uniforme' && (
        <DialogoUniforme
          uniforme={null}
          uniformes={listaUniformes}
          proveedores={listaProveedores}
          alCerrar={cerrar}
          alGuardar={(creado) => recargar(`Se registró la referencia ${creado.referencia}.`)}
        />
      )}

      {dialogo?.tipo === 'editar-uniforme' && (
        <DialogoUniforme
          uniforme={dialogo.uniforme}
          uniformes={listaUniformes}
          proveedores={listaProveedores}
          alCerrar={cerrar}
          alGuardar={(editado) => recargar(`Se guardaron los cambios de ${editado.referencia}.`)}
        />
      )}

      {dialogo?.tipo === 'crear-proveedor' && (
        <DialogoProveedor
          proveedores={listaProveedores}
          alCerrar={cerrar}
          alGuardar={(creado) => recargar(cerrarFrase(`Se registró el proveedor ${creado.razonSocial}`))}
        />
      )}

      {dialogo?.tipo === 'estado-uniforme' && (
        <DialogoEstadoUniforme
          uniforme={dialogo.uniforme}
          activar={dialogo.activar}
          alCerrar={cerrar}
          alGuardar={(actualizado) =>
            recargar(
              actualizado.activo
                ? `La referencia ${actualizado.referencia} quedó activa.`
                : `La referencia ${actualizado.referencia} quedó inactiva; su historial se conserva.`,
            )
          }
        />
      )}

      {dialogo?.tipo === 'estado-proveedor' && (
        <DialogoEstadoProveedor
          proveedor={dialogo.proveedor}
          referencias={contarReferencias(listaUniformes, dialogo.proveedor.id)}
          activar={dialogo.activar}
          alCerrar={cerrar}
          alGuardar={(actualizado) =>
            recargar(
              actualizado.activo
                ? cerrarFrase(`El proveedor ${actualizado.razonSocial} quedó activo`)
                : cerrarFrase(
                    `El proveedor ${actualizado.razonSocial} quedó inactivo; sus referencias conservan el vínculo`,
                  ),
            )
          }
        />
      )}
    </div>
  )
}

/** Acciones por fila (IconButton + Menu). Una referencia inactiva solo se consulta o reactiva. */
function MenuAcciones({
  uniforme,
  alElegir,
}: {
  uniforme: UniformeInventario
  alElegir: (uniforme: UniformeInventario, accion: Accion) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!abierto) return
    const cerrarFuera = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false)
    }
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', cerrarFuera)
    document.addEventListener('keydown', cerrarConEscape)
    return () => {
      document.removeEventListener('mousedown', cerrarFuera)
      document.removeEventListener('keydown', cerrarConEscape)
    }
  }, [abierto])

  const acciones: { id: Accion; texto: string }[] = [
    { id: 'editar', texto: 'Consultar / editar' },
    ...(uniforme.activo ? [{ id: 'ajustar-stock' as Accion, texto: 'Ajustar stock' }] : []),
    uniforme.activo
      ? { id: 'desactivar', texto: 'Desactivar' }
      : { id: 'activar', texto: 'Reactivar' },
  ]
  const idMenu = `acciones-uniforme-${uniforme.id}`

  return (
    <span className="app-row-menu" ref={contenedor}>
      <button
        className="vl-icon-button"
        type="button"
        aria-label={`Acciones de la referencia ${uniforme.referencia}`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={idMenu}
        onClick={() => setAbierto((valor) => !valor)}
      >
        <Icono nombre="mas" />
      </button>
      <div id={idMenu} className="vl-menu__list app-menu" role="menu" hidden={!abierto}>
        {acciones.map((accion) => (
          <button
            key={accion.id}
            className="vl-button vl-button--ghost vl-button--sm"
            role="menuitem"
            type="button"
            onClick={() => {
              setAbierto(false)
              alElegir(uniforme, accion.id)
            }}
          >
            {accion.texto}
          </button>
        ))}
      </div>
    </span>
  )
}
