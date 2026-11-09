import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  Alerta,
  Campo,
  Insignia,
  ListaDatos,
  Pestanas,
} from '../../../shared/ui/componentes.tsx'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'
import { formatoCop, formatoFecha, formatoMesAnio, hoyEnClub, leerPesos } from '../../../shared/utils/formato.ts'
import { enlace } from '../../../shared/utils/use-ruta.ts'
import {
  cobrosPendientes,
  pagarCobro,
  pagarMatricula,
  pagarSesiones,
  planesParaElegir,
} from '../services/m5.service.ts'
import {
  ESTADO_CARTERA_DS,
  MEDIOS_PAGO,
  PERMISOS_M5,
  type CobroPendiente,
  type EstadoCartera,
  type PatinadorM5,
  type ValoresTransaccion,
} from '../types/m5.types.ts'
import { aDatosTransaccion, erroresTransaccion } from '../utils/validar-transaccion.ts'
import { CamposTransaccion } from './campos-transaccion.tsx'
import { DatosPatinador, SelectorPatinador } from './selector-patinador.tsx'
import { usePatinadores } from './use-patinadores.ts'

export type PestanaPago = 'cobro' | 'sesion' | 'matricula'

const PESTANAS: { id: PestanaPago; texto: string }[] = [
  { id: 'cobro', texto: 'Pago de un cobro mensual' },
  { id: 'sesion', texto: 'Pago por sesión' },
  { id: 'matricula', texto: 'Matrícula y gastos administrativos' },
]

const FILTRO: Record<PestanaPago, (p: PatinadorM5) => boolean> = {
  cobro: () => true,
  sesion: (p) => p.planActual?.periodicidad === 'POR_SESION',
  matricula: (p) => !p.matriculaPagada,
}

const SIN_RESULTADOS: Record<PestanaPago, string> = {
  cobro: 'No se encontraron patinadores.',
  sesion: 'No hay patinadores con plan de día único activo.',
  matricula: 'No hay patinadores con la matrícula pendiente.',
}

function textoMedio(medio: string): string {
  return MEDIOS_PAGO.find((m) => m.valor === medio)?.texto ?? medio
}

const transaccionVacia = (hoy: string): ValoresTransaccion => ({ fechaPago: hoy, medioPago: '', referencia: '' })

/** RF-M5-09 y RF-M5-10: pantalla «Registrar pago» (wireframes/grupo-04/registrar-pago). */
export function RegistrarPago({
  pestanaInicial,
  patinadorInicial,
}: {
  pestanaInicial: PestanaPago
  patinadorInicial?: number
}) {
  const [pestana, setPestana] = useState<PestanaPago>(pestanaInicial)
  const [texto, setTexto] = useState('')
  const [fijo, setFijo] = useState<number | undefined>(patinadorInicial)
  const { patinadores, cargando, error, recargar } = usePatinadores(texto, fijo)
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(patinadorInicial ?? null)

  const candidatos = patinadores.filter(FILTRO[pestana])
  const patinador = candidatos.find((p) => p.id === seleccionadoId) ?? null

  const elegir = (p: PatinadorM5 | null) => {
    setSeleccionadoId(p?.id ?? null)
    if (!p) setFijo(undefined)
  }
  const reiniciar = () => {
    elegir(null)
    recargar()
  }

  return (
    <div className="app-page">
      <header className="vl-stack">
        <nav className="vl-breadcrumb" aria-label="Ruta">
          <span>Pagos</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Registrar pago</span>
        </nav>
        <h1>Registrar pago</h1>
        <p className="vl-text-body-sm">Registro manual de un pago recibido en la sede: efectivo, transferencia o consignación.</p>
      </header>

      <Pestanas
        etiqueta="Tipo de pago"
        opciones={PESTANAS}
        activa={pestana}
        alCambiar={(nueva) => {
          setPestana(nueva)
          elegir(null)
        }}
      />

      <section id={`panel-${pestana}`} role="tabpanel" aria-labelledby={`pestana-${pestana}`} className="app-cols app-cols--2">
        <section className="vl-card vl-stack" aria-labelledby="titulo-patinador">
          <h2 id="titulo-patinador" className="vl-text-heading-h4">1. Patinador</h2>
          <SelectorPatinador
            id="buscar-patinador"
            etiqueta={pestana === 'sesion' ? 'Buscar patinador con plan de día único' : 'Buscar patinador o acudiente'}
            puedeBuscar
            texto={texto}
            alEscribir={(valor) => {
              setFijo(undefined)
              setTexto(valor)
            }}
            candidatos={candidatos}
            cargando={cargando}
            error={error}
            seleccionado={patinador}
            alSeleccionar={elegir}
            sinResultados={SIN_RESULTADOS[pestana]}
          />
          {patinador && (
            <>
              <DatosPatinador patinador={patinador} />
              <p className="vl-text-body-sm">
                Estado de cartera: <Insignia entidad="cartera" estado={ESTADO_CARTERA_DS[patinador.estadoCartera]} />
              </p>
            </>
          )}
        </section>

        {!patinador && (
          <section className="vl-card vl-stack">
            <h2 className="vl-text-heading-h4">2. Datos del pago</h2>
            <p className="vl-text-body-sm">Elige primero al patinador.</p>
          </section>
        )}
        {patinador && pestana === 'cobro' && <PagoCobro key={patinador.id} patinador={patinador} alTerminar={reiniciar} />}
        {patinador && pestana === 'sesion' && <PagoSesion key={patinador.id} patinador={patinador} alTerminar={reiniciar} />}
        {patinador && pestana === 'matricula' && (
          <PagoMatricula key={patinador.id} patinador={patinador} alTerminar={reiniciar} />
        )}
      </section>
    </div>
  )
}

/** Resultado de cualquier pago: comprobante, datos y cartera recalculada. */
function PagoRegistrado({
  mensaje,
  comprobante,
  filas,
  estadoCartera,
  alTerminar,
  children,
}: {
  mensaje: string
  comprobante: string
  filas: [string, ReactNode][]
  estadoCartera: EstadoCartera
  alTerminar: () => void
  children?: ReactNode
}) {
  return (
    <section className="vl-card vl-stack" aria-labelledby="titulo-registrado">
      <h2 id="titulo-registrado" className="vl-text-heading-h4">Pago registrado</h2>
      <Alerta tono="success" titulo={mensaje}>
        <p>Se generó el comprobante N.º {comprobante}.</p>
      </Alerta>
      <ListaDatos
        filas={[
          ...filas,
          ['Estado de cartera (recalculado)', <Insignia key="cartera" entidad="cartera" estado={ESTADO_CARTERA_DS[estadoCartera]} />],
        ]}
      />
      {children}
      <div className="app-actions">
        <button className="vl-button vl-button--secondary" type="button" onClick={alTerminar}>
          Registrar otro pago
        </button>
      </div>
    </section>
  )
}

/** «noviembre de 2026» para mensualidades; la descripción para los demás cobros. */
function textoCobro(cobro: CobroPendiente): string {
  return cobro.periodo ? formatoMesAnio(cobro.periodo) : (cobro.descripcion ?? cobro.concepto)
}

/** RF-M5-09: pago total o parcial de un cobro con saldo. */
function PagoCobro({ patinador, alTerminar }: { patinador: PatinadorM5; alTerminar: () => void }) {
  const hoy = hoyEnClub()
  const [cobros, setCobros] = useState<CobroPendiente[] | null>(null)
  const [cobroId, setCobroId] = useState<number | null>(null)
  const [montoTexto, setMontoTexto] = useState('')
  const [transaccion, setTransaccion] = useState(transaccionVacia(hoy))
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof pagarCobro>> | null>(null)

  useEffect(() => {
    let vigente = true
    cobrosPendientes(patinador.id)
      .then((datos) => {
        if (!vigente) return
        setCobros(datos)
        setCobroId(datos[0]?.id ?? null)
      })
      .catch((e: Error) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [patinador.id])

  const cobro = cobros?.find((c) => c.id === cobroId) ?? null
  const monto = leerPesos(montoTexto)
  let errorMonto: string | null = null
  if (monto === null || monto <= 0) errorMonto = 'El monto debe ser mayor que 0.'
  else if (cobro && monto > cobro.saldo) errorMonto = `El monto no puede superar el saldo del cobro (${formatoCop(cobro.saldo)}).`
  const errores = erroresTransaccion(transaccion, hoy)
  const valido = cobro !== null && errorMonto === null && Object.keys(errores).length === 0

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    setIntentado(true)
    if (!valido || !cobro || monto === null) return
    setEnviando(true)
    setError(null)
    try {
      setResultado(await pagarCobro({ cobroId: cobro.id, monto, ...aDatosTransaccion(transaccion) }))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  if (resultado) {
    return (
      <PagoRegistrado
        mensaje={resultado.pagoParcial ? 'Se registró un pago parcial' : 'El cobro quedó pagado'}
        comprobante={resultado.comprobante.numero}
        estadoCartera={resultado.estadoCartera.estado}
        alTerminar={alTerminar}
        filas={[
          ['Patinador', patinador.nombre],
          ['Cobro', resultado.cobro.descripcion ?? '—'],
          ['Monto', `${formatoCop(resultado.monto)} · ${textoMedio(transaccion.medioPago)}`],
          ['Saldo restante', formatoCop(resultado.saldoRestante)],
        ]}
      />
    )
  }

  return (
    <form className="vl-card vl-stack" aria-labelledby="titulo-datos" onSubmit={enviar} noValidate>
      <h2 id="titulo-datos" className="vl-text-heading-h4">2. Cobro y datos del pago</h2>
      {cobros === null && !error && <p className="vl-text-caption" role="status">Cargando cobros…</p>}
      {cobros?.length === 0 && (
        <Alerta tono="success" titulo="Sin cobros pendientes">
          <p>{patinador.nombre} no tiene cobros con saldo.</p>
        </Alerta>
      )}
      {cobros && cobros.length > 0 && (
        <fieldset className="vl-stack">
          <legend className="vl-field__label">
            Cobro a pagar <span className="vl-field__req" aria-hidden="true">*</span>
            <span className="vl-text-caption"> obligatorio</span>
          </legend>
          <div className="vl-radio-group" role="radiogroup">
            {cobros.map((c) => (
              <label key={c.id} className="vl-check-row">
                <input className="vl-radio" type="radio" name="cobro" checked={c.id === cobroId} onChange={() => setCobroId(c.id)} />
                <span>
                  <span className="vl-text-label">
                    {textoCobro(c)} · saldo {formatoCop(c.saldo)}
                  </span>{' '}
                  {c.vencido && <Insignia entidad="cartera" estado="vencido" />}
                  <br />
                  <span className="vl-text-caption">
                    Valor {formatoCop(c.valor)}
                    {c.pagado > 0 && ` · abonado ${formatoCop(c.pagado)}`} · fecha límite {formatoFecha(c.fechaLimite)} · vencido
                    desde {formatoFecha(c.vencidoDesde)}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <p className="vl-text-caption">Solo aparecen los cobros con saldo pendiente.</p>
        </fieldset>
      )}

      {cobro && (
        <>
          <Campo etiqueta="Monto (COP)" id="monto" obligatorio error={intentado ? errorMonto : null}>
            <input
              id="monto"
              className="vl-input vl-input--numeric"
              inputMode="numeric"
              placeholder="$ 0"
              value={montoTexto}
              onChange={(evento) => setMontoTexto(evento.target.value)}
              onBlur={() => monto !== null && setMontoTexto(formatoCop(monto))}
              aria-invalid={intentado && errorMonto ? true : undefined}
            />
          </Campo>
          <CamposTransaccion valores={transaccion} alCambiar={setTransaccion} hoy={hoy} errores={intentado ? errores : {}} />
          <ListaDatos
            filas={[
              ['Saldo actual', formatoCop(cobro.saldo)],
              ['Este pago', `− ${formatoCop(monto ?? 0)}`],
              [
                'Saldo restante',
                `${formatoCop(Math.max(cobro.saldo - (monto ?? 0), 0))}${monto !== null && monto > 0 && monto < cobro.saldo ? ' (pago parcial)' : ''}`,
              ],
            ]}
          />
        </>
      )}

      {error && <Alerta tono="error" titulo="No se pudo registrar el pago">{error}</Alerta>}
      <div className="app-actions">
        <button className="vl-button vl-button--primary" type="submit" disabled={!cobro || enviando}>
          {enviando ? 'Registrando…' : 'Registrar pago'}
        </button>
      </div>
    </form>
  )
}

/** RF-M5-10: pago por sesión de un plan de día único (sesiones × tarifa vigente). */
function PagoSesion({ patinador, alTerminar }: { patinador: PatinadorM5; alTerminar: () => void }) {
  const hoy = hoyEnClub()
  const [tarifa, setTarifa] = useState<number | null>(null)
  const [sesiones, setSesiones] = useState(1)
  const [transaccion, setTransaccion] = useState(transaccionVacia(hoy))
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof pagarSesiones>> | null>(null)
  const plan = patinador.planActual

  useEffect(() => {
    planesParaElegir(false)
      .then((planes) => setTarifa(planes.find((p) => p.id === plan?.planId)?.tarifa?.valor ?? null))
      .catch((e: Error) => setError(e.message))
  }, [plan?.planId])

  const errorSesiones = Number.isInteger(sesiones) && sesiones >= 1 && sesiones <= 31 ? null : 'Indica entre 1 y 31 sesiones.'
  const errores = erroresTransaccion(transaccion, hoy)
  const valido = errorSesiones === null && Object.keys(errores).length === 0

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    setIntentado(true)
    if (!valido) return
    setEnviando(true)
    setError(null)
    try {
      setResultado(await pagarSesiones({ patinadorId: patinador.id, numeroSesiones: sesiones, ...aDatosTransaccion(transaccion) }))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  if (resultado) {
    return (
      <PagoRegistrado
        mensaje="Se registró el pago de las sesiones"
        comprobante={resultado.comprobante.numero}
        estadoCartera={resultado.estadoCartera.estado}
        alTerminar={alTerminar}
        filas={[
          ['Patinador', patinador.nombre],
          ['Sesiones', `${resultado.numeroSesiones} × ${formatoCop(resultado.valorSesion)}`],
          ['Monto', `${formatoCop(resultado.monto)} · ${textoMedio(transaccion.medioPago)}`],
        ]}
      />
    )
  }

  return (
    <form className="vl-card vl-stack" aria-labelledby="titulo-sesion" onSubmit={enviar} noValidate>
      <h2 id="titulo-sesion" className="vl-text-heading-h4">2. Datos del pago</h2>
      <ListaDatos
        filas={[
          ['Plan', `${plan?.nombre ?? '—'} (día único)`],
          ['Tarifa vigente', tarifa === null ? '—' : `${formatoCop(tarifa)} por sesión`],
        ]}
      />
      <Campo etiqueta="Número de sesiones" id="sesiones" obligatorio error={intentado ? errorSesiones : null}>
        <input
          id="sesiones"
          className="vl-input vl-input--numeric"
          type="number"
          min={1}
          max={31}
          value={sesiones}
          onChange={(evento) => setSesiones(Number(evento.target.value))}
        />
      </Campo>
      <CamposTransaccion valores={transaccion} alCambiar={setTransaccion} hoy={hoy} errores={intentado ? errores : {}} />
      {tarifa !== null && errorSesiones === null && (
        <p className="vl-text-body-sm">
          Se crea un cobro por <strong>{formatoCop(tarifa * sesiones)}</strong> que queda pagado de una vez, sin saldo, y se genera el
          comprobante.
        </p>
      )}
      {error && <Alerta tono="error" titulo="No se pudo registrar el pago">{error}</Alerta>}
      <div className="app-actions">
        <button className="vl-button vl-button--primary" type="submit" disabled={enviando}>
          {enviando ? 'Registrando…' : 'Registrar pago'}
        </button>
      </div>
    </form>
  )
}

/** Matrícula y gastos administrativos: requisito para activar el primer plan. */
function PagoMatricula({ patinador, alTerminar }: { patinador: PatinadorM5; alTerminar: () => void }) {
  const hoy = hoyEnClub()
  const { tienePermiso } = useSesion()
  const [matriculaTexto, setMatriculaTexto] = useState('')
  const [gastosTexto, setGastosTexto] = useState('')
  const [transaccion, setTransaccion] = useState(transaccionVacia(hoy))
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof pagarMatricula>> | null>(null)

  const matricula = leerPesos(matriculaTexto)
  const gastos = leerPesos(gastosTexto)
  const errorMatricula = matricula && matricula > 0 ? null : 'Ingresa un valor mayor que cero para la matrícula.'
  const errorGastos = gastos && gastos > 0 ? null : 'Ingresa un valor mayor que cero para los gastos administrativos.'
  const errores = erroresTransaccion(transaccion, hoy)
  const valido = !errorMatricula && !errorGastos && Object.keys(errores).length === 0

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    setIntentado(true)
    if (!valido || !matricula || !gastos) return
    setEnviando(true)
    setError(null)
    try {
      setResultado(
        await pagarMatricula({
          patinadorId: patinador.id,
          valorMatricula: matricula,
          valorGastosAdministrativos: gastos,
          ...aDatosTransaccion(transaccion),
        }),
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  if (resultado) {
    return (
      <PagoRegistrado
        mensaje="Se registró el pago de la matrícula y los gastos administrativos"
        comprobante={resultado.comprobante.numero}
        estadoCartera={resultado.estadoCartera.estado}
        alTerminar={alTerminar}
        filas={[
          ['Patinador', patinador.nombre],
          ['Total registrado', `${formatoCop(resultado.monto)} · ${textoMedio(transaccion.medioPago)}`],
        ]}
      >
        <p className="vl-text-body-sm">
          Ya se puede completar la activación del plan.{' '}
          {tienePermiso(PERMISOS_M5.planAsignar) && (
            <a className="vl-link" href={enlace('asignar-plan')}>Ir a asignar plan</a>
          )}
        </p>
      </PagoRegistrado>
    )
  }

  return (
    <form className="vl-card vl-stack" aria-labelledby="titulo-matricula" onSubmit={enviar} noValidate>
      <h2 id="titulo-matricula" className="vl-text-heading-h4">2. Conceptos y datos del pago</h2>
      <Alerta tono="info" titulo="Pago obligatorio para activar el plan">
        <p>La matrícula y los gastos administrativos se deben registrar y pagar antes de activar el primer plan de entrenamiento.</p>
      </Alerta>
      <Campo etiqueta="Valor de matrícula (COP)" id="valor-matricula" obligatorio error={intentado ? errorMatricula : null}>
        <input
          id="valor-matricula"
          className="vl-input vl-input--numeric"
          inputMode="numeric"
          placeholder="$ 0"
          value={matriculaTexto}
          onChange={(evento) => setMatriculaTexto(evento.target.value)}
          onBlur={() => matricula !== null && setMatriculaTexto(formatoCop(matricula))}
        />
      </Campo>
      <Campo etiqueta="Gastos administrativos (COP)" id="valor-gastos" obligatorio error={intentado ? errorGastos : null}>
        <input
          id="valor-gastos"
          className="vl-input vl-input--numeric"
          inputMode="numeric"
          placeholder="$ 0"
          value={gastosTexto}
          onChange={(evento) => setGastosTexto(evento.target.value)}
          onBlur={() => gastos !== null && setGastosTexto(formatoCop(gastos))}
        />
      </Campo>
      <ListaDatos filas={[['Total matrícula + gastos administrativos', formatoCop((matricula ?? 0) + (gastos ?? 0))]]} />
      <CamposTransaccion valores={transaccion} alCambiar={setTransaccion} hoy={hoy} errores={intentado ? errores : {}} />
      {error && <Alerta tono="error" titulo="No se pudo registrar el pago">{error}</Alerta>}
      <div className="app-actions">
        {tienePermiso(PERMISOS_M5.planAsignar) && (
          <a className="vl-button vl-button--secondary" href={enlace('asignar-plan')}>Volver a asignar plan</a>
        )}
        <button className="vl-button vl-button--primary" type="submit" disabled={enviando}>
          {enviando ? 'Registrando…' : 'Registrar matrícula y gastos'}
        </button>
      </div>
    </form>
  )
}
