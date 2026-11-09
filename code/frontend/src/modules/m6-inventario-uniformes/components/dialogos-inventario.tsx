import { useEffect, useState } from 'react'
import {
  Alerta,
  Campo,
  DialogoConfirmacion,
  Insignia,
  ListaDatos,
} from '../../../shared/ui/componentes.tsx'
import { formatoCop, formatoFechaDeMarca, leerPesos } from '../../../shared/utils/formato.ts'
import {
  ajustarStock,
  cambiarEstadoProveedor,
  cambiarEstadoUniforme,
  crearProveedor,
  crearUniforme,
  editarUniforme,
  listarMovimientos,
  type MovimientoInventario,
} from '../services/inventario.service.ts'
import {
  TALLAS,
  TIPOS_UNIFORME,
  contactoProveedor,
  estadoInsigniaUniforme,
  textoTipoUniforme,
  type DatosProveedor,
  type DatosUniforme,
  type Proveedor,
  type TipoUniforme,
  type UniformeInventario,
} from '../types/inventario.types.ts'

interface PropsDialogo {
  alCerrar: () => void
}

/** Ejecuta una llamada al servicio con estado de «guardando» y mensaje de error. */
function useEnvio() {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enviar = async <T,>(llamada: () => Promise<T>, alTerminar: (resultado: T) => void) => {
    setEnviando(true)
    setError(null)
    try {
      alTerminar(await llamada())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }
  return { enviando, error, enviar }
}

/** Cantidad entera no negativa escrita en un campo de texto. */
function leerEntero(texto: string): number | null {
  const limpio = texto.trim()
  return /^-?\d+$/.test(limpio) ? Number(limpio) : null
}

/**
 * RF-M6-06: registrar o actualizar una referencia. La referencia, el tipo y la
 * talla identifican la prenda y no se cambian; las cantidades y los precios sí.
 */
export function DialogoUniforme({
  uniforme,
  uniformes,
  proveedores,
  alCerrar,
  alGuardar,
}: PropsDialogo & {
  uniforme: UniformeInventario | null
  uniformes: UniformeInventario[]
  proveedores: Proveedor[]
  alGuardar: (uniforme: UniformeInventario) => void
}) {
  const editando = uniforme !== null
  const [referencia, setReferencia] = useState(uniforme?.referencia ?? '')
  const [tipo, setTipo] = useState<TipoUniforme | ''>(uniforme?.tipo ?? '')
  const [talla, setTalla] = useState(uniforme?.talla ?? '')
  const [proveedorId, setProveedorId] = useState<number | ''>(uniforme?.proveedorId ?? '')
  const [costoTexto, setCostoTexto] = useState(uniforme ? formatoCop(uniforme.costo) : '')
  const [precioTexto, setPrecioTexto] = useState(uniforme ? formatoCop(uniforme.precioVenta) : '')
  const [disponibleTexto, setDisponibleTexto] = useState(
    uniforme ? String(uniforme.cantidadDisponible) : '',
  )
  const [minimoTexto, setMinimoTexto] = useState(uniforme ? String(uniforme.cantidadMinima) : '')
  const [fotoUrl, setFotoUrl] = useState(uniforme?.fotoUrl ?? '')
  const [intentado, setIntentado] = useState(false)
  const { enviando, error, enviar } = useEnvio()

  const referenciaNormalizada = referencia.trim().toUpperCase()
  const tallaNormalizada = talla.trim().toUpperCase()
  const proveedorSeleccionado = proveedores.find((proveedor) => proveedor.id === proveedorId) ?? null
  const costo = leerPesos(costoTexto)
  const precio = leerPesos(precioTexto)
  const disponible = leerEntero(disponibleTexto)
  const minimo = leerEntero(minimoTexto)

  const errorReferencia = !referenciaNormalizada
    ? 'La referencia es obligatoria.'
    : !editando && uniformes.some((candidato) => candidato.referencia.toUpperCase() === referenciaNormalizada)
      ? 'Ya existe una referencia con ese código.'
      : null
  const errorTipo = tipo ? null : 'Elige el tipo de uniforme.'
  const errorTalla = tallaNormalizada ? null : 'Elige la talla.'
  const errorCombinacion =
    tipo !== 'IMPLEMENTO' &&
    !errorReferencia &&
    tipo &&
    tallaNormalizada &&
    proveedorId !== '' &&
    uniformes.some(
      (candidato) =>
        candidato.id !== uniforme?.id &&
        candidato.tipo === tipo &&
        candidato.talla.toUpperCase() === tallaNormalizada &&
        candidato.proveedorId === proveedorId,
    )
      ? 'Ya existe una referencia de ese tipo y talla con este proveedor.'
      : null
  const errorProveedor = !proveedorSeleccionado
    ? 'Elige el proveedor de la referencia.'
    : !proveedorSeleccionado.activo && proveedorSeleccionado.id !== uniforme?.proveedorId
      ? 'El proveedor está inactivo. Elige uno activo.'
      : errorCombinacion
  const errorCosto = costoTexto.includes('-')
    ? 'El costo no puede ser negativo.'
    : costo === null
      ? 'Ingresa el costo (cero o más).'
      : null
  const errorPrecio = precioTexto.includes('-')
    ? 'El precio no puede ser negativo.'
    : precio === null
      ? 'Ingresa el precio de venta (cero o más).'
      : null
  const errorDisponible =
    disponible === null ? 'Ingresa una cantidad entera de cero o más.' : null
  const errorMinimo = minimo === null ? 'Ingresa una cantidad entera de cero o más.' : null
  const sinProveedoresActivos = proveedores.every((proveedor) => !proveedor.activo)
  const bloqueado = !editando && sinProveedoresActivos

  const guardar = () => {
    setIntentado(true)
    if (
      bloqueado ||
      errorReferencia ||
      errorTipo ||
      errorTalla ||
      errorProveedor ||
      errorCosto ||
      errorPrecio ||
      errorDisponible ||
      errorMinimo ||
      !tipo ||
      !proveedorSeleccionado ||
      costo === null ||
      precio === null ||
      disponible === null ||
      minimo === null
    ) {
      return
    }

    const datos: DatosUniforme = {
      referencia: referenciaNormalizada,
      tipo,
      talla: tallaNormalizada,
      proveedorId: proveedorSeleccionado.id,
      costo,
      precioVenta: precio,
      cantidadDisponible: disponible,
      cantidadMinima: minimo,
      fotoUrl: fotoUrl.trim() || null,
    }

    if (uniforme) {
      void enviar(() => editarUniforme(uniforme.id, datos), alGuardar)
    } else {
      void enviar(() => crearUniforme(datos), alGuardar)
    }
  }

  return (
    <DialogoConfirmacion
      abierto
      variante="form"
      titulo={uniforme ? `Editar referencia ${uniforme.referencia}` : 'Registrar referencia de uniforme'}
      textoConfirmar={bloqueado ? undefined : editando ? 'Guardar cambios' : 'Guardar referencia'}
      ocupado={enviando}
      alConfirmar={guardar}
      alCancelar={alCerrar}
    >
      <div className="app-form-grid">
        <Campo
          etiqueta="Referencia"
          id="uniforme-referencia"
          obligatorio
          ayuda={editando ? 'La referencia no se cambia.' : 'Incluye la talla. Debe ser única.'}
          error={intentado ? errorReferencia : null}
        >
          <input
            id="uniforme-referencia"
            className="vl-input"
            maxLength={40}
            placeholder="UNI-CAM-08"
            value={referencia}
            readOnly={editando}
            onChange={(evento) => setReferencia(evento.target.value.toUpperCase())}
            aria-invalid={intentado && errorReferencia ? true : undefined}
          />
        </Campo>

        {uniforme ? (
          <Campo etiqueta="Tipo" id="uniforme-tipo">
            <input id="uniforme-tipo" className="vl-input" value={textoTipoUniforme(uniforme.tipo)} readOnly />
          </Campo>
        ) : (
          <Campo etiqueta="Tipo" id="uniforme-tipo" obligatorio error={intentado ? errorTipo : null}>
            <select
              id="uniforme-tipo"
              className="vl-select"
              value={tipo}
              onChange={(evento) => setTipo(evento.target.value as TipoUniforme | '')}
              aria-invalid={intentado && errorTipo ? true : undefined}
            >
              <option value="">Selecciona…</option>
              {TIPOS_UNIFORME.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>{opcion.texto}</option>
              ))}
            </select>
          </Campo>
        )}

        {uniforme ? (
          <Campo etiqueta="Talla" id="uniforme-talla">
            <input id="uniforme-talla" className="vl-input" value={uniforme.talla} readOnly />
          </Campo>
        ) : (
          <Campo etiqueta="Talla" id="uniforme-talla" obligatorio error={intentado ? errorTalla : null}>
            <select
              id="uniforme-talla"
              className="vl-select"
              value={talla}
              onChange={(evento) => setTalla(evento.target.value)}
              aria-invalid={intentado && errorTalla ? true : undefined}
            >
              <option value="">Selecciona…</option>
              {TALLAS.map((opcion) => (
                <option key={opcion} value={opcion}>{opcion}</option>
              ))}
            </select>
          </Campo>
        )}

        <Campo
          etiqueta="Proveedor"
          id="uniforme-proveedor"
          obligatorio
          ayuda="Solo proveedores activos. Una referencia existente conserva su vínculo."
          error={intentado ? errorProveedor : null}
        >
          <select
            id="uniforme-proveedor"
            className="vl-select"
            value={proveedorId}
            onChange={(evento) => setProveedorId(evento.target.value ? Number(evento.target.value) : '')}
            aria-invalid={intentado && errorProveedor ? true : undefined}
          >
            <option value="">Selecciona…</option>
            {proveedores.map((proveedor) => (
              <option
                key={proveedor.id}
                value={proveedor.id}
                disabled={!proveedor.activo && proveedor.id !== uniforme?.proveedorId}
              >
                {proveedor.razonSocial}
                {!proveedor.activo ? ' (inactivo)' : ''}
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Costo (COP)" id="uniforme-costo" obligatorio error={intentado ? errorCosto : null}>
          <input
            id="uniforme-costo"
            className="vl-input vl-input--numeric"
            inputMode="numeric"
            placeholder="$ 0"
            value={costoTexto}
            onChange={(evento) => setCostoTexto(evento.target.value)}
            onBlur={() => costo !== null && !costoTexto.includes('-') && setCostoTexto(formatoCop(costo))}
            aria-invalid={intentado && errorCosto ? true : undefined}
          />
        </Campo>

        <Campo etiqueta="Precio de venta (COP)" id="uniforme-precio" obligatorio error={intentado ? errorPrecio : null}>
          <input
            id="uniforme-precio"
            className="vl-input vl-input--numeric"
            inputMode="numeric"
            placeholder="$ 0"
            value={precioTexto}
            onChange={(evento) => setPrecioTexto(evento.target.value)}
            onBlur={() => precio !== null && !precioTexto.includes('-') && setPrecioTexto(formatoCop(precio))}
            aria-invalid={intentado && errorPrecio ? true : undefined}
          />
        </Campo>

        <Campo
          etiqueta="Cantidad disponible"
          id="uniforme-disponible"
          obligatorio
          ayuda="No puede ser negativa."
          error={intentado ? errorDisponible : null}
        >
          <input
            id="uniforme-disponible"
            className="vl-input vl-input--numeric"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="0"
            value={disponibleTexto}
            onChange={(evento) => setDisponibleTexto(evento.target.value)}
            aria-invalid={intentado && errorDisponible ? true : undefined}
          />
        </Campo>

        <Campo
          etiqueta="Cantidad mínima"
          id="uniforme-minimo"
          obligatorio
          ayuda="La alerta se activa cuando disponible es menor o igual al mínimo."
          error={intentado ? errorMinimo : null}
        >
          <input
            id="uniforme-minimo"
            className="vl-input vl-input--numeric"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="0"
            value={minimoTexto}
            onChange={(evento) => setMinimoTexto(evento.target.value)}
            aria-invalid={intentado && errorMinimo ? true : undefined}
          />
        </Campo>
        <Campo
          etiqueta="Foto del producto"
          id="uniforme-foto"
          ayuda="Enlace público a una imagen. Ejemplo: https://..."
        >
          <input
            id="uniforme-foto"
            className="vl-input"
            type="url"
            placeholder="https://..."
            value={fotoUrl}
            onChange={(evento) => setFotoUrl(evento.target.value)}
          />
          {fotoUrl && (
            <img
              className="app-producto__foto app-producto__foto--formulario"
              src={fotoUrl}
              alt={`Vista previa de ${referencia || 'la referencia'}`}
            />
          )}
        </Campo>
      </div>

      {uniforme ? (
        <p className="vl-audit-entry">
          Última actualización: {formatoFechaDeMarca(uniforme.actualizadoEn)}
        </p>
      ) : (
        <p className="vl-text-body-sm">
          La referencia queda activa. La combinación de tipo, talla y proveedor también debe ser única.
        </p>
      )}

      {bloqueado && (
        <Alerta tono="warning" titulo="No hay proveedores activos">
          <p>Registra un proveedor activo antes de crear una referencia.</p>
        </Alerta>
      )}
      {error && <Alerta tono="error" titulo="No se pudo guardar la referencia">{error}</Alerta>}
    </DialogoConfirmacion>
  )
}

/** Historial real de entradas, ajustes, préstamos, devoluciones y bajas. */
export function DialogoMovimientos({
  uniforme,
  alCerrar,
}: PropsDialogo & { uniforme: UniformeInventario }) {
  const [movimientos, setMovimientos] = useState<MovimientoInventario[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    listarMovimientos(uniforme.id)
      .then((filas) => {
        if (vigente) setMovimientos(filas)
      })
      .catch((e) => {
        if (vigente) setError((e as Error).message)
      })
    return () => { vigente = false }
  }, [uniforme.id])

  const etiquetas: Record<MovimientoInventario['tipo'], string> = {
    ENTRADA: 'Entrada',
    VENTA: 'Venta',
    PRESTAMO: 'Préstamo',
    DEVOLUCION: 'Devolución',
    BAJA: 'Baja',
    AJUSTE: 'Ajuste de stock',
  }

  return (
    <DialogoConfirmacion
      abierto
      titulo={`Movimientos de ${uniforme.referencia}`}
      textoCancelar="Cerrar"
      alCancelar={alCerrar}
    >
      <ListaDatos
        filas={[
          ['Referencia', uniforme.referencia],
          ['Stock actual', String(uniforme.cantidadDisponible)],
          ['Talla', uniforme.talla],
        ]}
      />
      {error && <Alerta tono="error" titulo="No se pudo consultar el historial">{error}</Alerta>}
      {movimientos === null && !error && <p className="vl-text-body-sm">Consultando movimientos…</p>}
      {movimientos?.length === 0 && (
        <Alerta tono="info" titulo="Sin movimientos registrados">
          Esta referencia todavía no tiene ajustes ni movimientos de inventario.
        </Alerta>
      )}
      {movimientos && movimientos.length > 0 && (
        <div className="vl-table-wrap">
          <table className="vl-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Responsable</th>
                <th>Observación</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((movimiento) => (
                <tr key={movimiento.id}>
                  <td>{formatoFechaDeMarca(movimiento.registradoEn)}</td>
                  <td>{etiquetas[movimiento.tipo]}</td>
                  <td>{movimiento.cantidad > 0 ? '+' : ''}{movimiento.cantidad}</td>
                  <td>{movimiento.registradoPor}</td>
                  <td>{movimiento.observacion || 'Sin observación'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DialogoConfirmacion>
  )
}

/** RF-M6-06: registrar un proveedor con razón social, NIT y al menos un contacto. */
export function DialogoProveedor({
  proveedores,
  alCerrar,
  alGuardar,
}: PropsDialogo & {
  proveedores: Proveedor[]
  alGuardar: (proveedor: Proveedor) => void
}) {
  const [razonSocial, setRazonSocial] = useState('')
  const [nitDocumento, setNitDocumento] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [intentado, setIntentado] = useState(false)
  const { enviando, error, enviar } = useEnvio()

  const nitNormalizado = nitDocumento.trim().toUpperCase()
  const errorRazonSocial = razonSocial.trim() ? null : 'La razón social es obligatoria.'
  const errorNit = !nitNormalizado
    ? 'El NIT o documento es obligatorio.'
    : proveedores.some((proveedor) => proveedor.nitDocumento.toUpperCase() === nitNormalizado)
      ? 'Ya existe un proveedor con ese NIT o documento.'
      : null
  const errorCorreo =
    correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
      ? 'El correo no tiene un formato válido.'
      : null
  const errorTelefono =
    telefono.trim() && telefono.replace(/\D/g, '').length < 7
      ? 'El teléfono debe tener al menos 7 dígitos.'
      : null
  const errorContacto =
    correo.trim() || telefono.trim()
      ? null
      : 'Registra al menos un dato de contacto: correo o teléfono.'

  const guardar = () => {
    setIntentado(true)
    if (errorRazonSocial || errorNit || errorCorreo || errorTelefono || errorContacto) return

    const datos: DatosProveedor = {
      razonSocial: razonSocial.trim(),
      nitDocumento: nitDocumento.trim(),
      correo: correo.trim() || undefined,
      telefono: telefono.trim() || undefined,
    }
    void enviar(() => crearProveedor(datos), alGuardar)
  }

  return (
    <DialogoConfirmacion
      abierto
      variante="form"
      titulo="Registrar proveedor"
      textoConfirmar="Guardar proveedor"
      ocupado={enviando}
      alConfirmar={guardar}
      alCancelar={alCerrar}
    >
      <div className="app-form-grid">
        <div className="app-form-grid__ancho">
          <Campo
            etiqueta="Razón social"
            id="proveedor-razon-social"
            obligatorio
            error={intentado ? errorRazonSocial : null}
          >
            <input
              id="proveedor-razon-social"
              className="vl-input"
              maxLength={120}
              value={razonSocial}
              onChange={(evento) => setRazonSocial(evento.target.value)}
              aria-invalid={intentado && errorRazonSocial ? true : undefined}
            />
          </Campo>
        </div>

        <div className="app-form-grid__ancho">
          <Campo
            etiqueta="NIT / documento"
            id="proveedor-nit"
            obligatorio
            ayuda="Debe ser único."
            error={intentado ? errorNit : null}
          >
            <input
              id="proveedor-nit"
              className="vl-input"
              maxLength={30}
              value={nitDocumento}
              onChange={(evento) => setNitDocumento(evento.target.value)}
              aria-invalid={intentado && errorNit ? true : undefined}
            />
          </Campo>
        </div>

        <Campo
          etiqueta="Correo de contacto"
          id="proveedor-correo"
          ayuda="Correo o teléfono: al menos uno."
          error={intentado ? errorCorreo : null}
        >
          <input
            id="proveedor-correo"
            className="vl-input"
            type="email"
            maxLength={120}
            value={correo}
            onChange={(evento) => setCorreo(evento.target.value)}
            aria-invalid={intentado && errorCorreo ? true : undefined}
          />
        </Campo>

        <Campo etiqueta="Teléfono" id="proveedor-telefono" error={intentado ? errorTelefono : null}>
          <input
            id="proveedor-telefono"
            className="vl-input"
            type="tel"
            maxLength={30}
            value={telefono}
            onChange={(evento) => setTelefono(evento.target.value)}
            aria-invalid={intentado && errorTelefono ? true : undefined}
          />
        </Campo>
      </div>

      {intentado && errorContacto && (
        <Alerta tono="error">
          <p>{errorContacto}</p>
        </Alerta>
      )}
      <Alerta tono="info">
        <p>El proveedor queda activo y disponible para nuevas referencias.</p>
      </Alerta>
      {error && <Alerta tono="error" titulo="No se pudo registrar el proveedor">{error}</Alerta>}
    </DialogoConfirmacion>
  )
}

export function DialogoAjustarStock({
  uniforme,
  alCerrar,
  alGuardar,
}: PropsDialogo & {
  uniforme: UniformeInventario
  alGuardar: (uniforme: UniformeInventario) => void
}) {
  const [cantidad, setCantidad] = useState('')
  const [observacion, setObservacion] = useState('')
  const [intentado, setIntentado] = useState(false)
  const { enviando, error, enviar } = useEnvio()
  const ajuste = leerEntero(cantidad)
  const errorCantidad = ajuste !== null && ajuste !== 0 && ajuste >= -uniforme.cantidadDisponible
    ? null
    : 'Ingresa un entero distinto de cero que no deje el stock negativo.'
  const errorObservacion = observacion.trim() ? null : 'Describe el motivo del ajuste.'

  const guardar = () => {
    setIntentado(true)
    if (ajuste === null || errorCantidad || errorObservacion) return
    void enviar(
      () => ajustarStock(uniforme.id, ajuste, observacion.trim()),
      alGuardar,
    )
  }

  return (
    <DialogoConfirmacion
      abierto
      variante="form"
      titulo={`Ajustar stock de ${uniforme.referencia}`}
      textoConfirmar="Guardar ajuste"
      ocupado={enviando}
      alConfirmar={guardar}
      alCancelar={alCerrar}
    >
      <ListaDatos filas={[
        ['Disponible actual', String(uniforme.cantidadDisponible)],
        ['Talla', uniforme.talla],
        ['Resultado esperado', ajuste === null || ajuste === 0 ? '—' : String(uniforme.cantidadDisponible + ajuste)],
      ]} />
      <div className="app-form-grid">
        <Campo etiqueta="Cantidad del ajuste" id="ajuste-cantidad" obligatorio
          error={intentado ? errorCantidad : null}
          ayuda="Positivo suma unidades; negativo las resta.">
          <input id="ajuste-cantidad" className="vl-input" type="number" step="1"
            value={cantidad} onChange={(evento) => setCantidad(evento.target.value)}
            aria-invalid={intentado && errorCantidad ? true : undefined} />
        </Campo>
        <Campo etiqueta="Observación" id="ajuste-observacion" obligatorio
          error={intentado ? errorObservacion : null}>
          <input id="ajuste-observacion" className="vl-input" maxLength={500}
            value={observacion} onChange={(evento) => setObservacion(evento.target.value)}
            aria-invalid={intentado && errorObservacion ? true : undefined} />
        </Campo>
      </div>
      {error && <Alerta tono="error" titulo="No se pudo ajustar el stock">{error}</Alerta>}
    </DialogoConfirmacion>
  )
}

/** Desactivar o reactivar una referencia: nunca se elimina. */
export function DialogoEstadoUniforme({
  uniforme,
  activar,
  alCerrar,
  alGuardar,
}: PropsDialogo & {
  uniforme: UniformeInventario
  activar: boolean
  alGuardar: (uniforme: UniformeInventario) => void
}) {
  const { enviando, error, enviar } = useEnvio()
  const estadoActual = <Insignia entidad="uniforme" estado={estadoInsigniaUniforme(uniforme)} />

  return (
    <DialogoConfirmacion
      abierto
      titulo={
        activar
          ? `¿Reactivar la referencia ${uniforme.referencia}?`
          : `¿Desactivar la referencia ${uniforme.referencia}?`
      }
      textoConfirmar={activar ? 'Reactivar referencia' : 'Desactivar referencia'}
      ocupado={enviando}
      alConfirmar={() => void enviar(() => cambiarEstadoUniforme(uniforme.id, activar), alGuardar)}
      alCancelar={alCerrar}
    >
      <ListaDatos
        filas={[
          ['Referencia', uniforme.referencia],
          ['Prenda', `${textoTipoUniforme(uniforme.tipo)} · Talla ${uniforme.talla}`],
          ['Disponible / mínimo', `${uniforme.cantidadDisponible} / ${uniforme.cantidadMinima}`],
          ['Estado actual', estadoActual],
        ]}
      />
      <div className="vl-text-body-sm">
        <ul>
          {activar ? (
            <>
              <li>Volverá a estar disponible para nuevas ventas o préstamos.</li>
              <li>Su historial se conserva.</li>
              {!uniforme.proveedor.activo && (
                <li>Su proveedor está inactivo; revisa el vínculo antes de vender.</li>
              )}
            </>
          ) : (
            <>
              <li>No estará disponible para nuevas ventas o préstamos.</li>
              <li>Los movimientos existentes se conservan.</li>
              <li>Puedes reactivarla más adelante; no se elimina.</li>
            </>
          )}
        </ul>
      </div>
      {error && (
        <Alerta tono="error" titulo="No se pudo cambiar el estado de la referencia">{error}</Alerta>
      )}
    </DialogoConfirmacion>
  )
}

/** Desactivar o reactivar un proveedor conservando el vínculo con sus referencias. */
export function DialogoEstadoProveedor({
  proveedor,
  referencias,
  activar,
  alCerrar,
  alGuardar,
}: PropsDialogo & {
  proveedor: Proveedor
  referencias: number
  activar: boolean
  alGuardar: (proveedor: Proveedor) => void
}) {
  const { enviando, error, enviar } = useEnvio()
  const estadoActual = <Insignia entidad="proveedor" estado={proveedor.activo ? 'activo' : 'inactivo'} />

  return (
    <DialogoConfirmacion
      abierto
      titulo={
        activar
          ? `¿Reactivar el proveedor ${proveedor.razonSocial}?`
          : `¿Desactivar el proveedor ${proveedor.razonSocial}?`
      }
      textoConfirmar={activar ? 'Reactivar proveedor' : 'Desactivar proveedor'}
      ocupado={enviando}
      alConfirmar={() => void enviar(() => cambiarEstadoProveedor(proveedor.id, activar), alGuardar)}
      alCancelar={alCerrar}
    >
      <ListaDatos
        filas={[
          ['Razón social', proveedor.razonSocial],
          ['NIT / documento', proveedor.nitDocumento],
          ['Contacto', contactoProveedor(proveedor)],
          ['Estado actual', estadoActual],
        ]}
      />
      <div className="vl-text-body-sm">
        <ul>
          {activar ? (
            <>
              <li>Volverá a aparecer al registrar nuevas referencias.</li>
              <li>Sus datos y vínculos se conservan.</li>
            </>
          ) : (
            <>
              <li>No aparecerá al registrar nuevas referencias.</li>
              <li>
                {referencias === 0
                  ? 'No tiene referencias asociadas.'
                  : referencias === 1
                    ? 'La referencia existente mantiene su vínculo y trazabilidad.'
                    : `Las ${referencias} referencias existentes mantienen su vínculo y trazabilidad.`}
              </li>
              <li>Puedes reactivarlo más adelante; no se elimina.</li>
            </>
          )}
        </ul>
      </div>
      {error && (
        <Alerta tono="error" titulo="No se pudo cambiar el estado del proveedor">{error}</Alerta>
      )}
    </DialogoConfirmacion>
  )
}
