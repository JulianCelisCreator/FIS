import { useEffect, useState, type FormEvent } from 'react'
import { usandoDemoLocal } from '../../../shared/services/cliente-api.ts'
import { Alerta, Campo, DialogoConfirmacion, Insignia } from '../../../shared/ui/componentes.tsx'
import { formatoCop, formatoFecha, hoyEnClub } from '../../../shared/utils/formato.ts'
import { enlace } from '../../../shared/utils/use-ruta.ts'
import {
  crearPrestamo,
  diasPrestamo,
  listarInventario,
  listarPatinadoresPrestamo,
  listarPrestamos,
  recibirPrestamo,
  type DatosPrestamo,
  type DatosRecepcion,
  type PatinadorPrestamo,
  type PrestamoUniformeApi,
} from '../services/inventario.service.ts'

interface Implemento {
  id: number
  nombre: string
  fotoUrl: string | null
  cantidadDisponible: number
  tarifaPrestamoDia: number
}

const FORMULARIO_VACIO: DatosPrestamo = {
  uniformeId: 0,
  patinadorId: 0,
  responsableId: 0,
  cantidad: 1,
  valorPorUnidad: 0,
  fechaDevolucionPrevista: '',
  estadoEntrega: 'BUEN_ESTADO',
}

const ESTADO_INSIGNIA: Record<PrestamoUniformeApi['estadoActual'], string> = {
  ACTIVO: 'activo',
  VENCIDO: 'vencido',
  DEVUELTO: 'devuelto',
  PERDIDA_DANO: 'perdida-dano',
}

/** Préstamo y devolución de implementos (HU-6.8). Solo Administrador. */
export function PrestamosUniformes() {
  const [prestamos, setPrestamos] = useState<PrestamoUniformeApi[] | null>(null)
  const [implementos, setImplementos] = useState<Implemento[]>([])
  const [patinadores, setPatinadores] = useState<PatinadorPrestamo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [formulario, setFormulario] = useState<DatosPrestamo>(FORMULARIO_VACIO)
  const [enviando, setEnviando] = useState(false)

  const [recepcion, setRecepcion] = useState<{ prestamo: PrestamoUniformeApi; datos: DatosRecepcion } | null>(null)
  const [errorRecepcion, setErrorRecepcion] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    Promise.all([listarPrestamos(), listarInventario(), listarPatinadoresPrestamo()])
      .then(([lista, inventario, listaPatinadores]) => {
        if (!vigente) return
        setPrestamos(lista)
        setImplementos(inventario
          .filter((item) => item.tipo === 'IMPLEMENTO' && item.activo && item.cantidadDisponible > 0)
          .map((item) => ({
            id: item.id,
            nombre: `${item.referencia} · ${item.talla}`,
            fotoUrl: item.fotoUrl,
            cantidadDisponible: item.cantidadDisponible,
            tarifaPrestamoDia: item.tarifaPrestamoDia ?? 0,
          })))
        setPatinadores(listaPatinadores)
        setError(null)
      })
      .catch((e: Error) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [version])

  const implemento = implementos.find((item) => item.id === formulario.uniformeId)
  const patinador = patinadores.find((item) => item.id === formulario.patinadorId)
  const duracionDias = formulario.fechaDevolucionPrevista ? diasPrestamo(formulario.fechaDevolucionPrevista) : null
  const totalCobro = duracionDias === null ? null : formulario.valorPorUnidad * formulario.cantidad * duracionDias
  const vencidos = prestamos?.filter((item) => item.estadoActual === 'VENCIDO').length ?? 0

  const registrar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    setError(null)
    setAviso(null)
    if (!implemento) return setError('Selecciona un implemento disponible.')
    if (!patinador) return setError('Selecciona un patinador activo.')
    if (!patinador.responsables.some((item) => item.id === formulario.responsableId)) {
      return setError('Selecciona quién responde por el préstamo.')
    }
    if (formulario.cantidad > implemento.cantidadDisponible) {
      return setError(`Solo hay ${implemento.cantidadDisponible} unidades disponibles.`)
    }
    setEnviando(true)
    try {
      const prestamo = await crearPrestamo(formulario)
      setAviso(prestamo.valorCobro > 0
        ? `Préstamo registrado. Se generó un cobro de ${formatoCop(prestamo.valorCobro)} a ${prestamo.patinador}, con fecha límite en la devolución prevista.`
        : `Préstamo registrado a ${prestamo.patinador}, sin cobro.`)
      setFormulario(FORMULARIO_VACIO)
      setVersion((valor) => valor + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el préstamo.')
    } finally {
      setEnviando(false)
    }
  }

  const confirmarRecepcion = async () => {
    if (!recepcion) return
    setEnviando(true)
    setErrorRecepcion(null)
    try {
      await recibirPrestamo(recepcion.prestamo.id, recepcion.datos)
      setAviso(recepcion.datos.estado === 'DEVUELTO'
        ? 'Devolución registrada; las unidades volvieron al inventario.'
        : 'Pérdida o daño registrado; las unidades no regresan al inventario.')
      setRecepcion(null)
      setVersion((valor) => valor + 1)
    } catch (e) {
      setErrorRecepcion(e instanceof Error ? e.message : 'No se pudo actualizar el préstamo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb"><span>Uniformes</span><span>/</span><span>Préstamos</span></nav>
          <h1>Préstamos de implementos</h1>
          <p className="vl-text-body-sm">
            Solo se prestan implementos; las prendas se venden. Cada préstamo genera un cobro: tarifa por unidad y día × cantidad × días.
          </p>
        </div>
      </header>
      {usandoDemoLocal() && (
        <Alerta tono="info" titulo="Préstamos de demostración local">
          <p>Con el usuario «Demo local» patinadores e implementos son ficticios y se reinician al recargar. Elige un usuario real para usar la API.</p>
        </Alerta>
      )}
      {vencidos > 0 && (
        <Alerta tono="warning" titulo={`${vencidos} préstamo${vencidos === 1 ? '' : 's'} vencido${vencidos === 1 ? '' : 's'}`}>
          <p>Tienen la fecha de devolución vencida y aún no se registra su devolución.</p>
        </Alerta>
      )}
      {aviso && <Alerta tono="success"><p>{aviso}</p></Alerta>}
      {error && <Alerta tono="error" titulo="No se pudo completar la operación"><p>{error}</p></Alerta>}

      <section className="vl-card vl-stack">
        <h2 className="vl-text-heading-h5">Nuevo préstamo</h2>
        {implemento && (
          <div className="app-producto app-producto--prestamo" aria-live="polite">
            {implemento.fotoUrl ? (
              <img className="app-producto__foto app-producto__foto--prestamo" src={implemento.fotoUrl} alt="Foto del implemento seleccionado" />
            ) : (
              <span className="app-producto__sin-foto">Sin foto</span>
            )}
            <span>{implemento.nombre}</span>
            <span className="vl-text-caption">Disponibles: {implemento.cantidadDisponible}</span>
          </div>
        )}
        <form className="vl-filter-bar" onSubmit={registrar}>
          <Campo etiqueta="Implemento" id="prestamo-implemento" obligatorio>
            <select id="prestamo-implemento" className="vl-select" value={formulario.uniformeId}
              onChange={(e) => {
                const elegido = implementos.find((item) => item.id === Number(e.target.value))
                setFormulario({ ...formulario, uniformeId: elegido?.id ?? 0, valorPorUnidad: elegido?.tarifaPrestamoDia ?? 0 })
              }}>
              <option value={0}>Selecciona un implemento</option>
              {implementos.map((item) => (
                <option key={item.id} value={item.id}>{item.nombre} · {item.cantidadDisponible} disponibles</option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Patinador" id="prestamo-patinador" obligatorio ayuda="Solo patinadores activos.">
            <select id="prestamo-patinador" className="vl-select" value={formulario.patinadorId}
              onChange={(e) => {
                const elegido = patinadores.find((item) => item.id === Number(e.target.value))
                setFormulario({
                  ...formulario,
                  patinadorId: elegido?.id ?? 0,
                  responsableId: elegido?.responsables.length === 1 ? elegido.responsables[0].id : 0,
                })
              }}>
              <option value={0}>Selecciona un patinador</option>
              {patinadores.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Responsable" id="prestamo-responsable" obligatorio
            ayuda={patinador && patinador.responsables.length === 0 ? 'Este patinador no tiene cuenta propia ni acudientes activos.' : 'El patinador o un acudiente vinculado.'}>
            <select id="prestamo-responsable" className="vl-select" value={formulario.responsableId} disabled={!patinador}
              onChange={(e) => setFormulario({ ...formulario, responsableId: Number(e.target.value) })}>
              <option value={0}>Selecciona un responsable</option>
              {patinador?.responsables.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Cantidad" id="prestamo-cantidad" obligatorio>
            <input id="prestamo-cantidad" className="vl-input" type="number" min={1} step={1}
              max={implemento?.cantidadDisponible}
              value={formulario.cantidad} onChange={(e) => setFormulario({ ...formulario, cantidad: Number(e.target.value) })} />
          </Campo>
          <Campo etiqueta="Devolución prevista" id="prestamo-fecha" obligatorio>
            <input id="prestamo-fecha" className="vl-input" type="date" min={hoyEnClub()} required
              value={formulario.fechaDevolucionPrevista}
              onChange={(e) => setFormulario({ ...formulario, fechaDevolucionPrevista: e.target.value })} />
          </Campo>
          <Campo etiqueta="Tarifa por unidad y día (COP)" id="prestamo-tarifa"
            ayuda="Sugerida por el inventario; puedes ajustarla. Cero = sin cobro.">
            <input id="prestamo-tarifa" className="vl-input vl-input--numeric" type="number" min={0} step={100}
              value={formulario.valorPorUnidad}
              onChange={(e) => setFormulario({ ...formulario, valorPorUnidad: Number(e.target.value) })} />
          </Campo>
          <Campo etiqueta="Estado de entrega" id="prestamo-estado-entrega">
            <select id="prestamo-estado-entrega" className="vl-select" value={formulario.estadoEntrega}
              onChange={(e) => setFormulario({ ...formulario, estadoEntrega: e.target.value as DatosPrestamo['estadoEntrega'] })}>
              <option value="NUEVO">Nuevo</option>
              <option value="BUEN_ESTADO">Buen estado</option>
              <option value="CON_DESGASTE">Con desgaste</option>
            </select>
          </Campo>
          {implemento && totalCobro !== null && (
            <Alerta tono="info" titulo="Cobro que se cargará al patinador">
              <p>
                {totalCobro > 0
                  ? `${formatoCop(totalCobro)} · ${formulario.cantidad} × ${formatoCop(formulario.valorPorUnidad)}/día × ${duracionDias} día${duracionDias === 1 ? '' : 's'}. Fecha límite: devolución prevista.`
                  : 'Sin cobro (tarifa en cero).'}
              </p>
            </Alerta>
          )}
          <button className="vl-button vl-button--primary" type="submit" disabled={enviando}>Registrar préstamo</button>
        </form>
      </section>

      {prestamos && prestamos.length === 0 && (
        <Alerta tono="info" titulo="Sin préstamos"><p>Todavía no hay préstamos registrados.</p></Alerta>
      )}
      {prestamos && prestamos.length > 0 && (
        <div className="vl-table-wrap">
          <table className="vl-table">
            <thead>
              <tr><th>Patinador</th><th>Implemento</th><th>Cantidad</th><th>Prevista</th><th>Cobro</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {prestamos.map((prestamo) => (
                <tr key={prestamo.id}>
                  <td data-label="Patinador">
                    {prestamo.patinador}
                    <p className="vl-text-caption">Responde: {prestamo.responsable}</p>
                  </td>
                  <td data-label="Implemento">{prestamo.uniforme}</td>
                  <td data-label="Cantidad">{prestamo.cantidad}</td>
                  <td data-label="Prevista">
                    {formatoFecha(prestamo.fechaDevolucionPrevista)}
                    <p className="vl-text-caption">Prestado: {formatoFecha(prestamo.fechaPrestamo)}</p>
                  </td>
                  <td data-label="Cobro">
                    {prestamo.cobroId === null ? (
                      <span className="vl-text-caption">Sin cobro</span>
                    ) : (
                      <>
                        {formatoCop(prestamo.valorCobro)}
                        <p className="vl-text-caption">
                          {prestamo.cantidad} × {formatoCop(prestamo.valorPorUnidad)}/día × {prestamo.duracionDias} días
                        </p>
                        <Insignia entidad="cobro" estado={prestamo.saldoPendiente > 0 ? 'pendiente' : 'pagado'} />
                        {prestamo.saldoPendiente > 0 && (
                          <p>
                            Saldo {formatoCop(prestamo.saldoPendiente)} ·{' '}
                            <a className="vl-link" href={enlace('registrar-pago', { pestana: 'cobro', patinador: prestamo.patinadorId, cobro: prestamo.cobroId })}>
                              Registrar pago
                            </a>
                          </p>
                        )}
                      </>
                    )}
                  </td>
                  <td data-label="Estado">
                    <Insignia entidad="prestamo" estado={ESTADO_INSIGNIA[prestamo.estadoActual]} />
                    {prestamo.observacion && <p className="vl-text-caption">{prestamo.observacion}</p>}
                  </td>
                  <td data-label="Acciones">
                    {prestamo.estado === 'ACTIVO' && (
                      <div className="vl-stack">
                        <button className="vl-button vl-button--secondary" type="button"
                          onClick={() => { setErrorRecepcion(null); setRecepcion({ prestamo, datos: { estado: 'DEVUELTO', estadoRecepcion: 'BUEN_ESTADO' } }) }}>
                          Recibir devolución
                        </button>
                        <button className="vl-button vl-button--danger" type="button"
                          onClick={() => { setErrorRecepcion(null); setRecepcion({ prestamo, datos: { estado: 'PERDIDA_DANO', estadoRecepcion: 'DANADO', observacion: '' } }) }}>
                          Registrar pérdida o daño
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DialogoConfirmacion
        abierto={recepcion !== null}
        titulo={recepcion?.datos.estado === 'DEVUELTO' ? 'Recibir devolución' : 'Registrar pérdida o daño'}
        textoConfirmar={recepcion?.datos.estado === 'DEVUELTO' ? 'Registrar devolución' : 'Registrar pérdida o daño'}
        variante="form"
        ocupado={enviando}
        alConfirmar={confirmarRecepcion}
        alCancelar={() => setRecepcion(null)}
      >
        {recepcion && (
          <>
            <p>
              {recepcion.prestamo.uniforme} · {recepcion.prestamo.cantidad} unidad{recepcion.prestamo.cantidad === 1 ? '' : 'es'} prestada
              {recepcion.prestamo.cantidad === 1 ? '' : 's'} a {recepcion.prestamo.patinador}.
            </p>
            {errorRecepcion && <Alerta tono="error"><p>{errorRecepcion}</p></Alerta>}
            {recepcion.datos.estado === 'DEVUELTO' ? (
              <Campo etiqueta="Estado de recepción" id="recepcion-estado">
                <select id="recepcion-estado" className="vl-select" value={recepcion.datos.estadoRecepcion}
                  onChange={(e) => setRecepcion({ ...recepcion, datos: { ...recepcion.datos, estadoRecepcion: e.target.value as DatosRecepcion['estadoRecepcion'] } })}>
                  <option value="BUEN_ESTADO">Buen estado</option>
                  <option value="CON_DESGASTE">Con desgaste</option>
                  <option value="DANADO">Dañado</option>
                </select>
              </Campo>
            ) : (
              <p className="vl-text-body-sm">Las unidades no regresan al inventario.</p>
            )}
            <Campo
              etiqueta={recepcion.datos.estado === 'DEVUELTO' ? 'Observación (opcional)' : 'Observación que justifica la pérdida o el daño'}
              id="recepcion-observacion"
              obligatorio={recepcion.datos.estado === 'PERDIDA_DANO'}
            >
              <textarea id="recepcion-observacion" className="vl-input" rows={3} maxLength={500}
                value={recepcion.datos.observacion ?? ''}
                onChange={(e) => setRecepcion({ ...recepcion, datos: { ...recepcion.datos, observacion: e.target.value } })} />
            </Campo>
          </>
        )}
      </DialogoConfirmacion>
    </div>
  )
}
