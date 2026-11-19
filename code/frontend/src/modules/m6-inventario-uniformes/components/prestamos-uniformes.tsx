import { useEffect, useState, type FormEvent } from 'react'
import { Alerta, Campo, Insignia } from '../../../shared/ui/componentes.tsx'
import { formatoCop, hoyEnClub } from '../../../shared/utils/formato.ts'
import { enlace } from '../../../shared/utils/use-ruta.ts'
import { AvisoApiPendienteM5 } from '../../m5-planes-tarifas-pagos/components/aviso-api-m5.tsx'
import {
  crearPrestamo,
  listarInventario,
  listarPatinadoresPrestamo,
  listarResponsablesPrestamo,
  listarPrestamos,
  recibirPrestamo,
  diasPrestamo,
  valorPrestamoPorUnidad,
  type DatosPrestamo,
  type PatinadorPrestamo,
  type PrestamoUniformeApi,
  type ResponsablePrestamo,
} from '../services/inventario.service.ts'

export function PrestamosUniformes() {
  const [prestamos, setPrestamos] = useState<PrestamoUniformeApi[] | null>(null)
  const [implementos, setImplementos] = useState<{ id: number; nombre: string; fotoUrl: string | null; cantidadDisponible: number }[]>([])
  const [patinadores, setPatinadores] = useState<PatinadorPrestamo[]>([])
  const [responsables, setResponsables] = useState<ResponsablePrestamo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [formulario, setFormulario] = useState<DatosPrestamo>({
    uniformeId: 0,
    patinadorId: 0,
    responsableId: 0,
    cantidad: 1,
    valorPorUnidad: 0,
    fechaDevolucionPrevista: '',
    estadoEntrega: 'BUEN_ESTADO',
  })
  const duracionDias = formulario.fechaDevolucionPrevista
    ? diasPrestamo(formulario.fechaDevolucionPrevista)
    : null

  useEffect(() => {
    let vigente = true
    Promise.all([listarPrestamos(), listarInventario(), listarPatinadoresPrestamo(), listarResponsablesPrestamo()])
      .then(([lista, inventario, listaPatinadores, listaResponsables]) => {
        if (!vigente) return
        setPrestamos(lista)
        setImplementos(inventario
          .filter((item) => item.tipo === 'IMPLEMENTO' && item.activo && item.cantidadDisponible > 0)
          .map((item) => ({
            id: item.id,
            nombre: `${item.referencia} · ${item.talla}`,
            fotoUrl: item.fotoUrl,
            cantidadDisponible: item.cantidadDisponible,
            valorPrestamoPorUnidad: valorPrestamoPorUnidad(item.id),
          })))
        setPatinadores(listaPatinadores)
        setResponsables(listaResponsables)
        setError(null)
      })
      .catch((e: Error) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [version])

  const registrar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    setError(null)
    try {
      const implemento = implementos.find((item) => item.id === formulario.uniformeId)
      if (!implemento) throw new Error('Selecciona un implemento disponible.')
      if (!patinadores.some((item) => item.id === formulario.patinadorId)) {
        throw new Error('Selecciona un patinador registrado.')
      }
      if (!responsables.some((item) => item.id === formulario.responsableId)) {
        throw new Error('Selecciona un responsable registrado.')
      }
      if (formulario.cantidad > implemento.cantidadDisponible) {
        throw new Error(`Solo hay ${implemento.cantidadDisponible} unidades disponibles.`)
      }
      const prestamo = await crearPrestamo(formulario)
      setAviso(`Préstamo registrado. Se generó un cobro de ${formatoCop(prestamo.valorCobro)} para ${patinadores.find((item) => item.id === prestamo.patinadorId)?.nombre}.`)
      setVersion((valor) => valor + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el préstamo.')
    }
  }

  const recibir = async (id: number, estado: 'DEVUELTO' | 'PERDIDA_DANO') => {
    setError(null)
    try {
      await recibirPrestamo(id, {
        estado,
        estadoRecepcion: estado === 'DEVUELTO' ? 'BUEN_ESTADO' : 'DANADO',
        observacion: estado === 'PERDIDA_DANO' ? 'Pérdida o daño registrado desde la pantalla de préstamos' : undefined,
      })
      setAviso(estado === 'DEVUELTO' ? 'Devolución registrada.' : 'Pérdida o daño registrado.')
      setVersion((valor) => valor + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el préstamo.')
    }
  }

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb"><span>Uniformes</span><span>/</span><span>Préstamos</span></nav>
          <h1>Préstamos de implementos</h1>
          <p className="vl-text-body-sm">Solo se prestan implementos aptos. Las prendas no se incluyen.</p>
        </div>
      </header>
      <Alerta tono="info" titulo="Préstamos de demostración local">
        <p>
          Patinadores, responsables e implementos son ficticios.           Cada unidad tiene una tarifa diaria sugerida editable. El total se calcula por unidad y por día, y se carga
          al patinador con fecha límite en la devolución prevista. Se paga en «Registrar pago». Los datos se reinician al recargar
          y no modifican la base de datos.
        </p>
      </Alerta>
      <AvisoApiPendienteM5 peticiones={['POST /m5/cobros (generar el saldo por préstamo de implementos)']} />
      {aviso && <Alerta tono="success"><p>{aviso}</p></Alerta>}
      {error && <Alerta tono="error" titulo="No se pudo completar la operación"><p>{error}</p></Alerta>}

      <section className="vl-card vl-stack">
        <h2 className="vl-text-heading-h5">Nuevo préstamo</h2>
        {formulario.uniformeId > 0 && (
          <div className="app-producto app-producto--prestamo" aria-live="polite">
            {implementos.find((item) => item.id === formulario.uniformeId)?.fotoUrl ? (
              <img
                className="app-producto__foto app-producto__foto--prestamo"
                src={implementos.find((item) => item.id === formulario.uniformeId)?.fotoUrl ?? ''}
                alt={`Foto del implemento seleccionado`}
              />
            ) : (
              <span className="app-producto__sin-foto">Sin foto</span>
            )}
            <span>{implementos.find((item) => item.id === formulario.uniformeId)?.nombre}</span>
            <span className="vl-text-caption">
              Disponibles: {implementos.find((item) => item.id === formulario.uniformeId)?.cantidadDisponible}
            </span>
          </div>
        )}
        <form className="vl-filter-bar" onSubmit={registrar}>
          <Campo etiqueta="Implemento" id="prestamo-implemento">
            <select id="prestamo-implemento" className="vl-select" value={formulario.uniformeId} required
              onChange={(e) => {
                const uniformeId = Number(e.target.value)
                setFormulario({ ...formulario, uniformeId, valorPorUnidad: uniformeId ? valorPrestamoPorUnidad(uniformeId) : 0 })
              }}>
              <option value={0}>Selecciona un implemento</option>
              {implementos.map((item) => (
                <option key={item.id} value={item.id}>{item.nombre} · {item.cantidadDisponible} disponibles</option>
              ))}
            </select>
          </Campo>
          <Campo
            etiqueta="Valor por implemento por día (COP)"
            id="prestamo-valor-unidad"
            ayuda="Tarifa diaria sugerida editable; debe ser mayor que cero."
          >
            <input id="prestamo-valor-unidad" className="vl-input vl-input--numeric" type="number" min={1} step={1}
              value={formulario.valorPorUnidad}
              onChange={(e) => setFormulario({ ...formulario, valorPorUnidad: Number(e.target.value) })} />
          </Campo>
          {formulario.uniformeId > 0 && (
            <Alerta tono="info" titulo="Total que se cargará al patinador">
              <p>
                {duracionDias === null
                  ? 'Selecciona la fecha de devolución para calcular el total.'
                  : `${formatoCop(formulario.valorPorUnidad * formulario.cantidad * duracionDias)} · ${formulario.cantidad} × ` +
                    `${formatoCop(formulario.valorPorUnidad)}/día × ${duracionDias} días. Fecha límite: devolución prevista.`}
              </p>
            </Alerta>
          )}
          <Campo etiqueta="Patinador" id="prestamo-patinador">
            <select id="prestamo-patinador" className="vl-select" value={formulario.patinadorId} required
              onChange={(e) => setFormulario({ ...formulario, patinadorId: Number(e.target.value) })}>
              <option value={0}>Selecciona un patinador</option>
              {patinadores.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Responsable" id="prestamo-responsable">
            <select id="prestamo-responsable" className="vl-select" value={formulario.responsableId} required
              onChange={(e) => setFormulario({ ...formulario, responsableId: Number(e.target.value) })}>
              <option value={0}>Selecciona un responsable</option>
              {responsables.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Cantidad" id="prestamo-cantidad">
            <input id="prestamo-cantidad" className="vl-input" type="number" min={1} step={1}
              max={implementos.find((item) => item.id === formulario.uniformeId)?.cantidadDisponible}
              value={formulario.cantidad} onChange={(e) => setFormulario({ ...formulario, cantidad: Number(e.target.value) })} />
          </Campo>
          <Campo etiqueta="Devolución prevista" id="prestamo-fecha">
            <input id="prestamo-fecha" className="vl-input" type="date" min={hoyEnClub()} required
              value={formulario.fechaDevolucionPrevista}
              onChange={(e) => setFormulario({ ...formulario, fechaDevolucionPrevista: e.target.value })} />
          </Campo>
          <Campo etiqueta="Estado de entrega" id="prestamo-estado-entrega">
            <select id="prestamo-estado-entrega" className="vl-select" value={formulario.estadoEntrega}
              onChange={(e) => setFormulario({ ...formulario, estadoEntrega: e.target.value as DatosPrestamo['estadoEntrega'] })}>
              <option value="NUEVO">Nuevo</option>
              <option value="BUEN_ESTADO">Buen estado</option>
              <option value="CON_DESGASTE">Con desgaste</option>
            </select>
          </Campo>
          <button className="vl-button vl-button--primary" type="submit">Registrar préstamo</button>
        </form>
      </section>

      {prestamos && (
        <div className="vl-table-wrap">
          <table className="vl-table">
            <thead><tr><th>Patinador</th><th>Implemento</th><th>Cantidad</th><th>Detalle del cobro</th><th>Valor cobrado</th><th>Saldo</th><th>Prevista</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {prestamos.map((prestamo) => (
                <tr key={prestamo.id}>
                  <td data-label="Patinador">{patinadores.find((item) => item.id === prestamo.patinadorId)?.nombre ?? '—'}</td>
                  <td data-label="Implemento">{prestamo.uniforme}</td>
                  <td data-label="Cantidad">{prestamo.cantidad}</td>
                  <td data-label="Detalle del cobro">
                    {prestamo.cantidad} × {formatoCop(prestamo.valorPorUnidad)}/día × {prestamo.duracionDias} días
                  </td>
                  <td data-label="Valor cobrado">{formatoCop(prestamo.valorCobro)}</td>
                  <td data-label="Saldo">
                    <Insignia entidad="cobro" estado={prestamo.saldoPendiente > 0 ? 'pendiente' : 'pagado'} />
                    {' '}{formatoCop(prestamo.saldoPendiente)}
                    {prestamo.saldoPendiente > 0 && (
                      <p>
                        <a
                          className="vl-link"
                          href={enlace('registrar-pago', {
                            pestana: 'cobro',
                            patinador: prestamo.patinadorId,
                            cobro: prestamo.cobroId,
                          })}
                        >
                          Registrar pago
                        </a>
                      </p>
                    )}
                  </td>
                  <td data-label="Prevista">{prestamo.fechaDevolucionPrevista}</td>
                  <td data-label="Estado"><Insignia entidad="prestamo" estado={prestamo.estado.toLowerCase().replace('_', '-')} /></td>
                  <td data-label="Acciones">
                    {prestamo.estado === 'ACTIVO' && (
                      <div className="vl-stack">
                        <button className="vl-button vl-button--secondary" type="button" onClick={() => recibir(prestamo.id, 'DEVUELTO')}>Recibir devolución</button>
                        <button className="vl-button vl-button--danger" type="button" onClick={() => recibir(prestamo.id, 'PERDIDA_DANO')}>Registrar daño/pérdida</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
