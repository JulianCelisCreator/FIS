import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Alerta, Campo, DialogoConfirmacion, Insignia, ListaDatos } from '../../../shared/ui/componentes.tsx'
import { formatoCop, formatoFecha, hoyEnClub } from '../../../shared/utils/formato.ts'
import { enlace } from '../../../shared/utils/use-ruta.ts'
import { MEDIOS_PAGO, type MedioPago } from '../../m5-planes-tarifas-pagos/types/m5.types.ts'
import {
  consolidarItemsVenta,
  listarCompradoresVenta,
  listarInventario,
  listarVentas,
  registrarVenta,
} from '../services/inventario.service.ts'
import { textoTipoUniforme, type UniformeInventario } from '../types/inventario.types.ts'
import {
  TIPOS_VENDIBLES,
  type CompradorVenta,
  type DatosVenta,
  type TipoComprador,
  type VentaRegistrada,
} from '../types/venta.types.ts'

interface LineaFormulario {
  clave: number
  uniformeId: number
  cantidad: number
}

interface Formulario {
  patinadorId: number
  compradorTipo: TipoComprador
  acudienteId: number
  medioPago: MedioPago | ''
  referenciaPago: string
  lineas: LineaFormulario[]
}

let siguienteClave = 1
const lineaVacia = (): LineaFormulario => ({ clave: siguienteClave++, uniformeId: 0, cantidad: 1 })
const formularioVacio = (): Formulario => ({
  patinadorId: 0,
  compradorTipo: 'PATINADOR',
  acudienteId: 0,
  medioPago: '',
  referenciaPago: '',
  lineas: [lineaVacia()],
})

const TEXTO_MEDIO = Object.fromEntries(MEDIOS_PAGO.map((medio) => [medio.valor, medio.texto])) as Record<MedioPago, string>

/** HU-6.7 · Registro de venta de uniformes a un patinador o a su acudiente. */
export function VentasUniformes() {
  const [vendibles, setVendibles] = useState<UniformeInventario[]>([])
  const [compradores, setCompradores] = useState<CompradorVenta[]>([])
  const [ventas, setVentas] = useState<VentaRegistrada[] | null>(null)
  const [formulario, setFormulario] = useState<Formulario>(formularioVacio)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errorVenta, setErrorVenta] = useState<string | null>(null)
  const [intentoEnviar, setIntentoEnviar] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [comprobante, setComprobante] = useState<VentaRegistrada | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    Promise.all([listarInventario(), listarCompradoresVenta(), listarVentas()])
      .then(([inventario, listaCompradores, listaVentas]) => {
        if (!vigente) return
        setVendibles(inventario.filter((item) =>
          item.activo && item.precioVenta > 0 && (TIPOS_VENDIBLES as readonly string[]).includes(item.tipo)))
        setCompradores(listaCompradores)
        setVentas(listaVentas)
        setErrorCarga(null)
      })
      .catch((e: Error) => vigente && setErrorCarga(e.message))
    return () => {
      vigente = false
    }
  }, [version])

  const porId = useMemo(() => new Map(vendibles.map((item) => [item.id, item])), [vendibles])
  const comprador = compradores.find((item) => item.patinadorId === formulario.patinadorId)
  const acudiente = comprador?.acudientes.find((item) => item.id === formulario.acudienteId)

  // Cantidad pedida por referencia sumando líneas repetidas, para validar contra el stock.
  const pedidoPorUniforme = useMemo(() => new Map(
    consolidarItemsVenta(formulario.lineas.filter((linea) => linea.uniformeId > 0))
      .map((item) => [item.uniformeId, item.cantidad]),
  ), [formulario.lineas])

  const lineasValoradas = formulario.lineas.map((linea) => {
    const uniforme = porId.get(linea.uniformeId)
    const pedido = pedidoPorUniforme.get(linea.uniformeId) ?? 0
    return {
      ...linea,
      uniforme,
      subtotal: uniforme && linea.cantidad > 0 ? uniforme.precioVenta * linea.cantidad : 0,
      excede: uniforme ? pedido > uniforme.cantidadDisponible : false,
    }
  })
  const total = lineasValoradas.reduce((suma, linea) => suma + linea.subtotal, 0)
  const unidades = lineasValoradas.reduce((suma, linea) => suma + (linea.uniforme ? linea.cantidad : 0), 0)

  const errores = {
    patinador: formulario.patinadorId ? null : 'Selecciona el patinador.',
    acudiente: formulario.compradorTipo === 'ACUDIENTE' && !acudiente ? 'Selecciona el acudiente que compra.' : null,
    lineas: lineasValoradas.some((linea) => !linea.uniforme)
      ? 'Elige la referencia y talla de cada línea.'
      : lineasValoradas.some((linea) => !Number.isInteger(linea.cantidad) || linea.cantidad < 1)
        ? 'Cada cantidad debe ser un entero mayor que cero.'
        : null,
    stock: lineasValoradas.some((linea) => linea.excede) ? 'Hay líneas que superan las existencias.' : null,
    medioPago: formulario.medioPago ? null : 'Elige el medio de pago.',
    referenciaPago: formulario.medioPago && formulario.medioPago !== 'EFECTIVO' && !formulario.referenciaPago.trim()
      ? 'La referencia es obligatoria para transferencias y consignaciones.'
      : null,
  }
  const hayErrores = Object.values(errores).some(Boolean)
  const mostrar = (mensaje: string | null) => (intentoEnviar ? mensaje : null)

  const cambiarLinea = (clave: number, cambios: Partial<LineaFormulario>) => setFormulario((actual) => ({
    ...actual,
    lineas: actual.lineas.map((linea) => (linea.clave === clave ? { ...linea, ...cambios } : linea)),
  }))

  const revisar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    setIntentoEnviar(true)
    setErrorVenta(null)
    if (!hayErrores) setConfirmando(true)
  }

  const confirmar = async () => {
    if (!formulario.medioPago) return
    const datos: DatosVenta = {
      patinadorId: formulario.patinadorId,
      compradorTipo: formulario.compradorTipo,
      acudienteId: formulario.compradorTipo === 'ACUDIENTE' ? formulario.acudienteId : undefined,
      medioPago: formulario.medioPago,
      referenciaPago: formulario.referenciaPago.trim() || undefined,
      items: formulario.lineas.map(({ uniformeId, cantidad }) => ({ uniformeId, cantidad })),
    }
    setOcupado(true)
    try {
      const venta = await registrarVenta(datos)
      setComprobante(venta)
      setFormulario(formularioVacio())
      setIntentoEnviar(false)
      setVersion((valor) => valor + 1)
    } catch (e) {
      setErrorVenta(e instanceof Error ? e.message : 'No se pudo registrar la venta.')
    } finally {
      setOcupado(false)
      setConfirmando(false)
    }
  }

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb"><span>Uniformes</span><span>/</span><span>Ventas</span></nav>
          <h1>Venta de uniformes</h1>
          <p className="vl-text-body-sm">
            Registra la venta de uno o más uniformes a un patinador o a su acudiente. Al confirmar se descuenta el
            inventario, el pago queda en el historial de pagos y se genera el comprobante.
          </p>
        </div>
      </header>

      <Alerta tono="info" titulo="Ventas de demostración local">
        <p>
          Patinadores, acudientes y existencias son ficticios y se reinician al recargar. La API real ya está disponible en
          {' '}<code>/m6/ventas</code>; la pantalla cambiará a ella cuando M1 entregue el inicio de sesión.
        </p>
      </Alerta>
      {errorCarga && <Alerta tono="error" titulo="No se pudo cargar la información"><p>{errorCarga}</p></Alerta>}
      {errorVenta && <Alerta tono="error" titulo="La venta no se registró"><p>{errorVenta}</p></Alerta>}

      <form className="vl-card vl-stack" onSubmit={revisar} noValidate aria-labelledby="titulo-nueva-venta">
        <h2 id="titulo-nueva-venta" className="vl-text-heading-h5">Nueva venta</h2>
        <p className="vl-text-caption">Fecha de venta: {formatoFecha(hoyEnClub())} · se asigna al confirmar.</p>

        <div className="app-form-grid">
          <Campo etiqueta="Patinador" id="venta-patinador" obligatorio error={mostrar(errores.patinador)}>
            <select
              id="venta-patinador"
              className="vl-select"
              value={formulario.patinadorId}
              onChange={(e) => setFormulario({
                ...formulario,
                patinadorId: Number(e.target.value),
                compradorTipo: 'PATINADOR',
                acudienteId: 0,
              })}
            >
              <option value={0}>Selecciona un patinador</option>
              {compradores.map((item) => (
                <option key={item.patinadorId} value={item.patinadorId}>{item.patinador} · {item.documento}</option>
              ))}
            </select>
          </Campo>

          <fieldset className="vl-field">
            <legend className="vl-field__label">Comprador</legend>
            <div className="vl-radio-group" role="radiogroup">
              <label className="vl-check-row">
                <input
                  className="vl-radio"
                  type="radio"
                  name="venta-comprador"
                  checked={formulario.compradorTipo === 'PATINADOR'}
                  disabled={!comprador}
                  onChange={() => setFormulario({ ...formulario, compradorTipo: 'PATINADOR', acudienteId: 0 })}
                />
                <span>{comprador ? `El patinador (${comprador.patinador})` : 'El patinador'}</span>
              </label>
              {comprador?.acudientes.map((item) => (
                <label key={item.id} className="vl-check-row">
                  <input
                    className="vl-radio"
                    type="radio"
                    name="venta-comprador"
                    checked={formulario.compradorTipo === 'ACUDIENTE' && formulario.acudienteId === item.id}
                    onChange={() => setFormulario({ ...formulario, compradorTipo: 'ACUDIENTE', acudienteId: item.id })}
                  />
                  <span>{item.nombre} · acudiente ({item.parentesco.toLowerCase()})</span>
                </label>
              ))}
            </div>
            {comprador && comprador.acudientes.length === 0 && (
              <p className="vl-field__help">Este patinador no tiene acudientes vinculados.</p>
            )}
            {mostrar(errores.acudiente) && <p className="vl-field__error" role="alert">{errores.acudiente}</p>}
          </fieldset>
        </div>

        <h3 className="vl-text-label">Uniformes</h3>
        {lineasValoradas.map((linea, indice) => (
          <fieldset key={linea.clave} className="vl-stack">
            <legend className="vl-text-caption">Línea {indice + 1}</legend>
            <div className="vl-filter-bar">
              <Campo etiqueta="Referencia y talla" id={`venta-uniforme-${linea.clave}`} obligatorio>
                <select
                  id={`venta-uniforme-${linea.clave}`}
                  className="vl-select"
                  value={linea.uniformeId}
                  onChange={(e) => cambiarLinea(linea.clave, { uniformeId: Number(e.target.value) })}
                >
                  <option value={0}>Selecciona un uniforme</option>
                  {vendibles.map((item) => (
                    <option key={item.id} value={item.id} disabled={item.cantidadDisponible === 0}>
                      {item.referencia} · {textoTipoUniforme(item.tipo)} · talla {item.talla}
                      {item.cantidadDisponible === 0 ? ' · agotado' : ''}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo
                etiqueta="Cantidad"
                id={`venta-cantidad-${linea.clave}`}
                obligatorio
                ayuda={linea.uniforme ? `Disponibles: ${linea.uniforme.cantidadDisponible}` : undefined}
              >
                <input
                  id={`venta-cantidad-${linea.clave}`}
                  className="vl-input vl-input--numeric"
                  type="number"
                  min={1}
                  step={1}
                  value={linea.cantidad}
                  aria-invalid={linea.excede || undefined}
                  onChange={(e) => cambiarLinea(linea.clave, { cantidad: Number(e.target.value) })}
                />
              </Campo>
              <div className="vl-field">
                <span className="vl-field__label">Valor unitario</span>
                <span>{linea.uniforme ? formatoCop(linea.uniforme.precioVenta) : '—'}</span>
              </div>
              <div className="vl-field">
                <span className="vl-field__label">Subtotal</span>
                <strong>{formatoCop(linea.subtotal)}</strong>
              </div>
              {formulario.lineas.length > 1 && (
                <button
                  className="vl-button vl-button--ghost vl-button--sm"
                  type="button"
                  onClick={() => setFormulario({
                    ...formulario,
                    lineas: formulario.lineas.filter((item) => item.clave !== linea.clave),
                  })}
                >
                  Quitar línea
                </button>
              )}
            </div>
            {linea.excede && linea.uniforme && (
              <Alerta tono="warning" titulo="Existencias insuficientes">
                <p>
                  Se solicitan {pedidoPorUniforme.get(linea.uniformeId)} unidades de {linea.uniforme.referencia} talla{' '}
                  {linea.uniforme.talla} y solo hay {linea.uniforme.cantidadDisponible} disponibles. La venta queda bloqueada
                  hasta corregir la cantidad.
                </p>
              </Alerta>
            )}
          </fieldset>
        ))}
        {mostrar(errores.lineas) && <p className="vl-field__error" role="alert">{errores.lineas}</p>}
        <div>
          <button
            className="vl-button vl-button--secondary vl-button--sm"
            type="button"
            onClick={() => setFormulario({ ...formulario, lineas: [...formulario.lineas, lineaVacia()] })}
          >
            Agregar otro uniforme
          </button>
        </div>

        <div className="app-form-grid">
          <Campo etiqueta="Medio de pago" id="venta-medio" obligatorio error={mostrar(errores.medioPago)}>
            <select
              id="venta-medio"
              className="vl-select"
              value={formulario.medioPago}
              onChange={(e) => setFormulario({ ...formulario, medioPago: e.target.value as MedioPago | '' })}
            >
              <option value="">Selecciona…</option>
              {MEDIOS_PAGO.map((medio) => <option key={medio.valor} value={medio.valor}>{medio.texto}</option>)}
            </select>
          </Campo>
          <Campo
            etiqueta="Referencia de la transacción"
            id="venta-referencia"
            obligatorio={!!formulario.medioPago && formulario.medioPago !== 'EFECTIVO'}
            ayuda={formulario.medioPago && formulario.medioPago !== 'EFECTIVO'
              ? 'Número de la transferencia o de la consignación.'
              : 'Opcional en efectivo.'}
            error={mostrar(errores.referenciaPago)}
          >
            <input
              id="venta-referencia"
              className="vl-input"
              maxLength={100}
              value={formulario.referenciaPago}
              onChange={(e) => setFormulario({ ...formulario, referenciaPago: e.target.value })}
            />
          </Campo>
        </div>

        <dl className="app-stats">
          <div className="app-stat"><dt>Unidades</dt><dd><span className="app-stat__valor">{unidades}</span></dd></div>
          <div className="app-stat"><dt>Total de la venta</dt><dd><span className="app-stat__valor">{formatoCop(total)}</span></dd></div>
        </dl>

        <div className="app-actions">
          <button className="vl-button vl-button--secondary" type="button" onClick={() => {
            setFormulario(formularioVacio())
            setIntentoEnviar(false)
          }}>
            Limpiar
          </button>
          <button className="vl-button vl-button--primary" type="submit" aria-disabled={!!errores.stock || undefined}>
            Revisar y confirmar venta
          </button>
        </div>
      </form>

      <section className="vl-stack" aria-labelledby="titulo-ventas">
        <div className="app-panel-head">
          <h2 id="titulo-ventas" className="vl-text-heading-h5">Ventas registradas</h2>
          <a className="vl-link" href={enlace('historial-pagos')}>Ver historial de pagos</a>
        </div>
        {ventas && ventas.length === 0 && <p className="vl-text-body-sm">Todavía no hay ventas registradas.</p>}
        {ventas && ventas.length > 0 && (
          <div className="vl-table-wrap">
            <table className="vl-table">
              <thead>
                <tr><th>Fecha</th><th>Comprador</th><th>Uniformes</th><th>Medio</th><th>Total</th><th>Comprobante</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {ventas.map((venta) => (
                  <tr key={venta.id}>
                    <td data-label="Fecha">{formatoFecha(venta.fecha)}</td>
                    <td data-label="Comprador">
                      {venta.comprador}
                      {venta.compradorTipo === 'ACUDIENTE' && <p className="vl-text-caption">Acudiente de {venta.patinador}</p>}
                    </td>
                    <td data-label="Uniformes">
                      {venta.items.map((item) => (
                        <p key={item.uniformeId}>{item.referencia} · talla {item.talla} × {item.cantidad}</p>
                      ))}
                    </td>
                    <td data-label="Medio">{TEXTO_MEDIO[venta.medioPago]}</td>
                    <td data-label="Total">{formatoCop(venta.total)}</td>
                    <td data-label="Comprobante">
                      <button className="vl-link" type="button" onClick={() => setComprobante(venta)}>{venta.comprobante}</button>
                    </td>
                    <td data-label="Estado"><Insignia entidad="venta" estado="confirmada" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <DialogoConfirmacion
        abierto={confirmando}
        titulo="Confirmar venta"
        textoConfirmar="Confirmar venta"
        ocupado={ocupado}
        alConfirmar={confirmar}
        alCancelar={() => setConfirmando(false)}
      >
        <ListaDatos
          filas={[
            ['Comprador', acudiente ? `${acudiente.nombre} (acudiente de ${comprador?.patinador})` : comprador?.patinador ?? '—'],
            ['Uniformes', lineasValoradas.map((linea) =>
              `${linea.uniforme?.referencia} talla ${linea.uniforme?.talla} × ${linea.cantidad}`).join(' · ')],
            ['Medio de pago', formulario.medioPago ? TEXTO_MEDIO[formulario.medioPago] : '—'],
            ['Total', formatoCop(total)],
          ]}
        />
        <Alerta tono="warning">
          <p>
            Una venta confirmada no se puede modificar. Cualquier corrección se registra como devolución o ajuste
            autorizado de inventario.
          </p>
        </Alerta>
      </DialogoConfirmacion>

      <DialogoConfirmacion
        abierto={comprobante !== null}
        titulo={comprobante ? `Comprobante ${comprobante.comprobante}` : 'Comprobante'}
        textoCancelar="Cerrar"
        alCancelar={() => setComprobante(null)}
      >
        {comprobante && (
          <>
            <Alerta tono="success" titulo="Venta registrada">
              <p>Se descontó el inventario y el pago quedó en el historial de pagos.</p>
            </Alerta>
            <ListaDatos
              filas={[
                ['Venta', `#${comprobante.id}`],
                ['Fecha', formatoFecha(comprobante.fecha)],
                ['Comprador', comprobante.compradorTipo === 'ACUDIENTE'
                  ? `${comprobante.comprador} (acudiente de ${comprobante.patinador})`
                  : comprobante.comprador],
                ['Medio de pago', `${TEXTO_MEDIO[comprobante.medioPago]}${comprobante.referenciaPago ? ` · ${comprobante.referenciaPago}` : ''}`],
                ['Registrada por', comprobante.registradoPor],
              ]}
            />
            <div className="vl-table-wrap">
              <table className="vl-table">
                <thead><tr><th>Referencia</th><th>Talla</th><th>Cantidad</th><th>Valor unitario</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {comprobante.items.map((item) => (
                    <tr key={item.uniformeId}>
                      <td data-label="Referencia">{item.referencia}</td>
                      <td data-label="Talla">{item.talla}</td>
                      <td data-label="Cantidad">{item.cantidad}</td>
                      <td data-label="Valor unitario">{formatoCop(item.valorUnitario)}</td>
                      <td data-label="Subtotal">{formatoCop(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="vl-text-heading-h5">Total: {formatoCop(comprobante.total)}</p>
            <div>
              <button className="vl-button vl-button--secondary vl-button--sm" type="button" onClick={() => window.print()}>
                Imprimir comprobante
              </button>
            </div>
          </>
        )}
      </DialogoConfirmacion>
    </div>
  )
}
