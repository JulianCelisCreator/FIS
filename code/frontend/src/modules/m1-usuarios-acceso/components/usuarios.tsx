import { useEffect, useRef, useState } from 'react'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'
import { NOMBRE_ROL, type Rol } from '../../../shared/sesion/sesion.types.ts'
import { Alerta, Avatar, Campo, DialogoConfirmacion, Insignia } from '../../../shared/ui/componentes.tsx'
import { Icono } from '../../../shared/ui/icono.tsx'
import { desactivarCuenta, listarCuentas, reactivarCuenta, TAMANO_PAGINA } from '../services/cuentas.service.ts'
import {
  ESTADO_INSIGNIA,
  ESTADOS_CUENTA,
  type CuentaListada,
  type EstadoCuenta,
  type PaginaCuentas,
} from '../types/cuentas.types.ts'
import './usuarios.css'

type Aviso = { tono: 'success' | 'error'; texto: string } | null

const ROLES = Object.entries(NOMBRE_ROL) as [Rol, string][]

/**
 * HU-M1-05 · Usuarios. El Administrador ve todas las cuentas, las busca y
 * filtra (en el servidor), crea una nueva (HU-M1-01), la desactiva o la
 * reactiva. Nunca se elimina una cuenta.
 */
export function Usuarios() {
  const { sesion } = useSesion()
  const [buscar, setBuscar] = useState('')
  const [buscarAplicado, setBuscarAplicado] = useState('')
  const [rol, setRol] = useState<Rol | ''>('')
  const [estado, setEstado] = useState<EstadoCuenta | ''>('')
  const [pagina, setPagina] = useState(1)
  const [version, setVersion] = useState(0)
  const [respuesta, setRespuesta] = useState<{ clave: string; datos: PaginaCuentas | null; error: string | null } | null>(null)
  const [aviso, setAviso] = useState<Aviso>(null)
  const [porDesactivar, setPorDesactivar] = useState<CuentaListada | null>(null)

  // El buscador espera 300 ms a que se deje de escribir; los filtros consultan de inmediato.
  useEffect(() => {
    const espera = setTimeout(() => {
      setBuscarAplicado(buscar.trim())
      setPagina(1)
    }, 300)
    return () => clearTimeout(espera)
  }, [buscar])

  // La respuesta solo vale si es de la consulta actual; mientras llega otra, se muestra «cargando».
  // Una respuesta que llega tarde (de una consulta anterior) se descarta con la última clave pedida.
  const clave = JSON.stringify([buscarAplicado, rol, estado, pagina, version])
  const ultimaClave = useRef(clave)
  useEffect(() => {
    ultimaClave.current = clave
    const guardar = (nueva: { datos: PaginaCuentas | null; error: string | null }) => {
      if (ultimaClave.current === clave) setRespuesta({ clave, ...nueva })
    }
    listarCuentas({ buscar: buscarAplicado || undefined, rol: rol || undefined, estado: estado || undefined, pagina })
      .then((pagina) => guardar({ datos: pagina, error: null }))
      .catch((e: Error) => guardar({ datos: null, error: e.message }))
  }, [clave, buscarAplicado, rol, estado, pagina])
  const actual = respuesta?.clave === clave ? respuesta : null
  const datos = actual?.datos ?? null
  const error = actual?.error ?? null

  const recargar = (nuevo: Aviso) => {
    setAviso(nuevo)
    setVersion((v) => v + 1)
  }

  const reactivar = async (cuenta: CuentaListada) => {
    try {
      const reactivada = await reactivarCuenta(cuenta.id)
      const textoEstado = reactivada.estado === 'POR_REGISTRAR' ? 'vuelve a estar «Por registrar»' : 'vuelve a estar activa'
      recargar({ tono: 'success', texto: `La cuenta de ${cuenta.nombre} ${textoEstado}.` })
    } catch (e) {
      setAviso({ tono: 'error', texto: e instanceof Error ? e.message : 'No se pudo reactivar la cuenta.' })
    }
  }

  const cambiarFiltro = <T,>(aplicar: (valor: T) => void) => (valor: T) => {
    aplicar(valor)
    setPagina(1)
  }

  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / TAMANO_PAGINA)) : 1
  const desde = datos && datos.total > 0 ? (datos.pagina - 1) * TAMANO_PAGINA + 1 : 0
  const hasta = datos ? desde + datos.cuentas.length - (datos.total > 0 ? 1 : 0) : 0
  const conFiltros = Boolean(buscarAplicado || rol || estado)

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb" aria-label="Ruta">
            <span aria-current="page">Usuarios</span>
          </nav>
          <h1>Usuarios</h1>
          <p className="vl-text-body-sm">Cuentas de acceso a la plataforma. Una cuenta no se elimina: se desactiva y conserva su historial.</p>
        </div>
        <a className="vl-button vl-button--primary" href="#/nueva-cuenta">
          Nueva cuenta
        </a>
      </header>

      <form className="vl-filter-bar" role="search" aria-label="Filtrar cuentas" onSubmit={(evento) => evento.preventDefault()}>
        <Campo etiqueta="Buscar" id="usuarios-buscar">
          <input
            id="usuarios-buscar"
            className="vl-input"
            type="search"
            placeholder="Nombre o correo"
            value={buscar}
            onChange={(evento) => setBuscar(evento.target.value)}
          />
        </Campo>
        <Campo etiqueta="Rol" id="usuarios-rol">
          <select
            id="usuarios-rol"
            className="vl-select"
            value={rol}
            onChange={(evento) => cambiarFiltro(setRol)(evento.target.value as Rol | '')}
          >
            <option value="">Todos</option>
            {ROLES.map(([valor, texto]) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Estado" id="usuarios-estado">
          <select
            id="usuarios-estado"
            className="vl-select"
            value={estado}
            onChange={(evento) => cambiarFiltro(setEstado)(evento.target.value as EstadoCuenta | '')}
          >
            <option value="">Todos</option>
            {ESTADOS_CUENTA.map((opcion) => (
              <option key={opcion.estado} value={opcion.estado}>{opcion.texto}</option>
            ))}
          </select>
        </Campo>
      </form>

      {aviso && (
        <Alerta tono={aviso.tono}>
          <p>{aviso.texto}</p>
        </Alerta>
      )}
      {error && (
        <Alerta tono="error" titulo="No se pudieron cargar las cuentas">
          <p>{error}</p>
        </Alerta>
      )}

      {datos === null && !error && <TablaCargando />}

      {datos?.total === 0 && (
        <div className="vl-card vl-stack">
          <p className="vl-text-heading-h5">{conFiltros ? 'Ninguna cuenta coincide con la búsqueda' : 'Aún no hay cuentas'}</p>
          <p className="vl-text-body-sm">
            {conFiltros ? 'Prueba con otro nombre o correo, o quita los filtros de rol y estado.' : 'Crea la primera con «Nueva cuenta».'}
          </p>
        </div>
      )}

      {datos && datos.total > 0 && (
        <>
          <div className="vl-table-wrap">
            <table className="vl-table">
              <caption className="app-oculto">Cuentas de usuario</caption>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th><span className="app-oculto">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {datos.cuentas.map((cuenta) => {
                  const esPropia = cuenta.id === sesion?.id
                  return (
                    <tr key={cuenta.id}>
                      <td data-label="Nombre">
                        <span className="m1-usuarios__persona">
                          <Avatar nombre={cuenta.nombre} tamano="sm" />
                          <span>{cuenta.nombre}</span>
                        </span>
                      </td>
                      <td data-label="Correo" className="m1-usuarios__correo">{cuenta.correo}</td>
                      <td data-label="Rol">
                        {cuenta.roles.length > 0 ? (
                          <span className="m1-usuarios__roles">
                            {cuenta.roles.map((r) => (
                              // Un rol no es un estado: insignia neutra sin ícono (HU-M1-06).
                              <span key={r} className="vl-badge vl-badge--neutral">{NOMBRE_ROL[r]}</span>
                            ))}
                          </span>
                        ) : (
                          <span className="vl-text-caption">Sin rol</span>
                        )}
                      </td>
                      <td data-label="Estado">
                        <Insignia entidad="cuenta" estado={ESTADO_INSIGNIA[cuenta.estado]} />
                      </td>
                      <td data-label="Acciones">
                        {/* La propia cuenta no se desactiva ni cambia de rol desde aquí. */}
                        {esPropia ? (
                          <span className="vl-text-caption m1-usuarios__tu">Tu cuenta</span>
                        ) : (
                          <MenuCuenta
                            cuenta={cuenta}
                            alDesactivar={() => setPorDesactivar(cuenta)}
                            alReactivar={() => void reactivar(cuenta)}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <nav className="m1-usuarios__paginas" aria-label="Páginas de cuentas">
            <p className="vl-text-body-sm" aria-live="polite">
              Mostrando <span className="m1-usuarios__cifra">{desde}–{hasta}</span> de{' '}
              <span className="m1-usuarios__cifra">{datos.total}</span>
            </p>
            {totalPaginas > 1 && (
              <div className="app-actions">
                <button
                  className="vl-button vl-button--secondary vl-button--sm"
                  type="button"
                  disabled={datos.pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                >
                  Anterior
                </button>
                <button
                  className="vl-button vl-button--secondary vl-button--sm"
                  type="button"
                  disabled={datos.pagina >= totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Siguiente
                </button>
              </div>
            )}
          </nav>
        </>
      )}

      {porDesactivar && (
        <DialogoDesactivar
          cuenta={porDesactivar}
          alCerrar={() => setPorDesactivar(null)}
          alDesactivar={() => {
            recargar({ tono: 'success', texto: `La cuenta de ${porDesactivar.nombre} quedó desactivada. Conserva todos sus datos.` })
            setPorDesactivar(null)
          }}
        />
      )}
    </div>
  )
}

/** CA-03: confirmación antes de desactivar; explica que la persona no pierde su historial. */
function DialogoDesactivar({
  cuenta,
  alCerrar,
  alDesactivar,
}: {
  cuenta: CuentaListada
  alCerrar: () => void
  alDesactivar: () => void
}) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmar = async () => {
    setEnviando(true)
    setError(null)
    try {
      await desactivarCuenta(cuenta.id)
      alDesactivar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo desactivar la cuenta.')
      setEnviando(false)
    }
  }

  return (
    <DialogoConfirmacion
      abierto
      titulo={`¿Desactivar la cuenta de ${cuenta.nombre}?`}
      textoConfirmar="Desactivar cuenta"
      ocupado={enviando}
      alConfirmar={() => void confirmar()}
      alCancelar={alCerrar}
    >
      <div className="vl-text-body-sm">
        <ul>
          <li>Dejará de poder ingresar a la plataforma; si tiene una sesión abierta, termina en su siguiente acción.</li>
          <li>No pierde sus datos ni su historial: puedes reactivarla cuando quieras.</li>
        </ul>
      </div>
      {error && (
        <Alerta tono="error" titulo="No se pudo desactivar la cuenta">
          <p>{error}</p>
        </Alerta>
      )}
    </DialogoConfirmacion>
  )
}

/** Acciones por fila (IconButton + Menu): «Desactivar» o «Reactivar», nunca «Eliminar». */
function MenuCuenta({
  cuenta,
  alDesactivar,
  alReactivar,
}: {
  cuenta: CuentaListada
  alDesactivar: () => void
  alReactivar: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!abierto) return
    const cerrarFuera = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false)
    }
    const cerrarConEscape = (evento: KeyboardEvent) => evento.key === 'Escape' && setAbierto(false)
    document.addEventListener('mousedown', cerrarFuera)
    document.addEventListener('keydown', cerrarConEscape)
    return () => {
      document.removeEventListener('mousedown', cerrarFuera)
      document.removeEventListener('keydown', cerrarConEscape)
    }
  }, [abierto])

  const acciones =
    cuenta.estado === 'DESACTIVADA'
      ? [{ id: 'reactivar', texto: 'Reactivar', alElegir: alReactivar }]
      : [{ id: 'desactivar', texto: 'Desactivar', alElegir: alDesactivar }]
  const idMenu = `acciones-cuenta-${cuenta.id}`

  return (
    <span className="app-row-menu" ref={contenedor}>
      <button
        className="vl-icon-button"
        type="button"
        aria-label={`Acciones de la cuenta de ${cuenta.nombre}`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={idMenu}
        onClick={() => setAbierto((a) => !a)}
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
              accion.alElegir()
            }}
          >
            {accion.texto}
          </button>
        ))}
      </div>
    </span>
  )
}

/** Cargando: filas Skeleton con la forma de la tabla, no un spinner en medio del contenido. */
function TablaCargando() {
  return (
    <div className="vl-table-wrap" role="status" aria-label="Cargando cuentas">
      <div className="m1-usuarios__esqueleto" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="m1-usuarios__esqueleto-fila">
            <span />
            <span />
            <span />
            <span />
          </div>
        ))}
      </div>
    </div>
  )
}
