import { useEffect, useRef, useState } from 'react'
import { Alerta, Campo, Insignia } from '../../../shared/design-system/componentes.tsx'
import { formatoFecha } from '../../../shared/utils/formato.ts'
import { listarPlanes } from '../services/m5.service.ts'
import { TIPOS_PLAN, type PlanAdministrado, type PlanDetalle, type TipoPlan } from '../types/m5.types.ts'
import { textoFacturacion, textoTarifa, textoTipo } from '../utils/textos-plan.ts'
import { DialogoDesactivar, DialogoHistorial, DialogoPlan, DialogoTarifa } from './dialogos-plan.tsx'

type Dialogo =
  | { tipo: 'crear' }
  | { tipo: 'editar' | 'tarifa' | 'historial' | 'desactivar'; plan: PlanAdministrado }
  | null

type FiltroEstado = 'ACTIVO' | 'INACTIVO' | ''

/** RF-M5-01 a RF-M5-05: pantalla «Planes y tarifas» del Administrador (wireframes/grupo-04/planes). */
export function PlanesTarifas() {
  const [buscar, setBuscar] = useState('')
  const [tipo, setTipo] = useState<TipoPlan | ''>('')
  const [estado, setEstado] = useState<FiltroEstado>('ACTIVO')
  const [version, setVersion] = useState(0)
  const [planes, setPlanes] = useState<PlanAdministrado[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  // Solo el buscador espera 300 ms a que se deje de escribir; los filtros y la
  // recarga tras guardar consultan de inmediato.
  const [buscarAplicado, setBuscarAplicado] = useState('')
  useEffect(() => {
    const espera = setTimeout(() => setBuscarAplicado(buscar.trim()), 300)
    return () => clearTimeout(espera)
  }, [buscar])

  useEffect(() => {
    let vigente = true
    listarPlanes({ buscar: buscarAplicado || undefined, tipo: tipo || undefined, estado: estado || undefined })
      .then((datos) => {
        if (!vigente) return
        setPlanes(datos)
        setError(null)
      })
      .catch((e: Error) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [buscarAplicado, tipo, estado, version])

  const recargar = (mensaje: string) => {
    setAviso(mensaje)
    setVersion((v) => v + 1)
  }
  const cerrar = () => setDialogo(null)

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="ps-stack">
          <nav className="ps-breadcrumb" aria-label="Ruta">
            <span>Pagos</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Planes y tarifas</span>
          </nav>
          <h1>Planes y tarifas</h1>
          <p className="ps-text-body-sm">Oferta de planes de la academia y su tarifa vigente.</p>
        </div>
        <button className="ps-button ps-button--primary" type="button" onClick={() => setDialogo({ tipo: 'crear' })}>
          Crear plan
        </button>
      </header>

      <ps-filter-bar>
        <form className="ps-filter-bar" role="search" aria-label="Filtrar planes" onSubmit={(evento) => evento.preventDefault()}>
          <Campo etiqueta="Buscar" id="filtro-buscar">
            <input
              id="filtro-buscar"
              className="ps-input"
              type="search"
              placeholder="Nombre del plan"
              value={buscar}
              onChange={(evento) => setBuscar(evento.target.value)}
            />
          </Campo>
          <Campo etiqueta="Tipo" id="filtro-tipo">
            <select id="filtro-tipo" className="ps-select" value={tipo} onChange={(evento) => setTipo(evento.target.value as TipoPlan | '')}>
              <option value="">Todos</option>
              {TIPOS_PLAN.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>{opcion.texto}</option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Estado" id="filtro-estado">
            <select id="filtro-estado" className="ps-select" value={estado} onChange={(evento) => setEstado(evento.target.value as FiltroEstado)}>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
              <option value="">Todos</option>
            </select>
          </Campo>
        </form>
      </ps-filter-bar>

      {aviso && <Alerta tono="success"><p>{aviso}</p></Alerta>}
      {error && <Alerta tono="error" titulo="No se pudieron cargar los planes">{error}</Alerta>}
      {planes === null && !error && <p className="ps-text-caption" role="status">Cargando planes…</p>}
      {planes?.length === 0 && (
        <div className="ps-card ps-stack">
          <p className="ps-text-heading-h5">No hay planes con esos filtros</p>
          <p className="ps-text-body-sm">Cambia los filtros o crea un plan nuevo.</p>
        </div>
      )}
      {planes && planes.length > 0 && (
        <ps-data-table>
          <table className="ps-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Tipo</th>
                <th>Facturación</th>
                <th>Día límite</th>
                <th className="ps-num">Tarifa vigente</th>
                <th>Vigente desde</th>
                <th className="ps-num">Patinadores</th>
                <th>Estado</th>
                <th><span className="app-oculto">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {planes.map((plan) => (
                <tr key={plan.id}>
                  <td data-label="Plan">{plan.nombre}</td>
                  <td data-label="Tipo">{textoTipo(plan.tipo)}</td>
                  <td data-label="Facturación">{textoFacturacion(plan.periodicidad)}</td>
                  <td data-label="Día límite">{plan.diaLimitePago ? `Día ${plan.diaLimitePago}` : '—'}</td>
                  <td data-label="Tarifa vigente" className="ps-num">
                    {plan.tarifaVigente ? textoTarifa(plan.tarifaVigente.valor, plan.periodicidad) : 'Sin tarifa'}
                    {plan.tarifaProgramada && (
                      <span className="ps-text-caption app-bloque">
                        {textoTarifa(plan.tarifaProgramada.valor, plan.periodicidad)} desde {formatoFecha(plan.tarifaProgramada.vigenteDesde)}
                      </span>
                    )}
                  </td>
                  <td data-label="Vigente desde">{plan.tarifaVigente ? formatoFecha(plan.tarifaVigente.vigenteDesde) : '—'}</td>
                  <td data-label="Patinadores" className="ps-num">{plan.patinadores}</td>
                  <td data-label="Estado">
                    <Insignia entidad="plan" estado={plan.estado === 'ACTIVO' ? 'activo' : 'inactivo'} />
                  </td>
                  <td data-label="Acciones">
                    <MenuAcciones plan={plan} alElegir={(accion) => setDialogo({ tipo: accion, plan })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ps-data-table>
      )}

      {dialogo?.tipo === 'crear' && (
        <DialogoPlan
          plan={null}
          alCerrar={cerrar}
          alGuardar={(creado: PlanDetalle) => {
            recargar(`Se creó el plan ${creado.nombre}. Registra su tarifa para poder asignarlo.`)
            setDialogo({ tipo: 'tarifa', plan: creado })
          }}
        />
      )}
      {dialogo?.tipo === 'editar' && (
        <DialogoPlan
          plan={dialogo.plan}
          alCerrar={cerrar}
          alGuardar={(editado) => {
            recargar(`Se guardaron los cambios del plan ${editado.nombre}.`)
            cerrar()
          }}
        />
      )}
      {dialogo?.tipo === 'tarifa' && (
        <DialogoTarifa
          plan={dialogo.plan}
          alCerrar={cerrar}
          alGuardar={(actualizado) => {
            const nueva = actualizado.tarifas[0]
            recargar(
              nueva?.estado === 'PROGRAMADA'
                ? `Tarifa de ${actualizado.nombre} programada desde el ${formatoFecha(nueva.vigenteDesde)}.`
                : `${actualizado.nombre} tiene tarifa vigente y ya se puede asignar.`,
            )
            cerrar()
          }}
        />
      )}
      {dialogo?.tipo === 'historial' && (
        <DialogoHistorial
          plan={dialogo.plan}
          alCerrar={cerrar}
          alRegistrarTarifa={() => setDialogo({ tipo: 'tarifa', plan: dialogo.plan })}
        />
      )}
      {dialogo?.tipo === 'desactivar' && (
        <DialogoDesactivar
          plan={dialogo.plan}
          alCerrar={cerrar}
          alGuardar={(desactivado) => {
            recargar(`El plan ${desactivado.nombre} quedó inactivo. Sus patinadores lo conservan.`)
            cerrar()
          }}
        />
      )}
    </div>
  )
}

type Accion = 'editar' | 'tarifa' | 'historial' | 'desactivar'

/** Acciones por fila (IconButton + Menu). Un plan inactivo solo se edita o se consulta. */
function MenuAcciones({ plan, alElegir }: { plan: PlanAdministrado; alElegir: (accion: Accion) => void }) {
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

  const acciones: { id: Accion; texto: string }[] = [
    { id: 'editar', texto: 'Editar' },
    ...(plan.estado === 'ACTIVO' ? [{ id: 'tarifa' as const, texto: 'Tarifa' }] : []),
    { id: 'historial', texto: 'Historial' },
    ...(plan.estado === 'ACTIVO' ? [{ id: 'desactivar' as const, texto: 'Desactivar' }] : []),
  ]
  const idMenu = `acciones-plan-${plan.id}`

  return (
    <span className="app-row-menu" ref={contenedor}>
      <button
        className="ps-icon-button"
        type="button"
        aria-label={`Acciones del plan ${plan.nombre}`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={idMenu}
        onClick={() => setAbierto((a) => !a)}
      >
        <ps-icon name="more-vertical" />
      </button>
      <div id={idMenu} className="ps-menu__list app-menu" role="menu" hidden={!abierto}>
        {acciones.map((accion) => (
          <button
            key={accion.id}
            className="ps-button ps-button--ghost ps-button--sm"
            role="menuitem"
            type="button"
            onClick={() => {
              setAbierto(false)
              alElegir(accion.id)
            }}
          >
            {accion.texto}
          </button>
        ))}
      </div>
    </span>
  )
}
