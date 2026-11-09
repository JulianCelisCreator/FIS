import { useEffect, useState } from 'react'
import {
  Alerta,
  Campo,
  DialogoConfirmacion,
  Insignia,
  ListaDatos,
  Pestanas,
} from '../../../shared/ui/componentes.tsx'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'
import { formatoCop, formatoFecha, formatoMesAnio, hoyEnClub, leerPesos } from '../../../shared/utils/formato.ts'
import { enlace } from '../../../shared/utils/use-ruta.ts'
import {
  asignarPlan,
  cambiarPlan,
  planDelPatinador,
  planesParaElegir,
} from '../services/m5.service.ts'
import {
  PERMISOS_M5,
  type PatinadorM5,
  type PlanDelPatinador,
  type PlanOfertado,
  type ResultadoAsignacion,
  type ResultadoCambio,
  type ValoresTransaccion,
} from '../types/m5.types.ts'
import {
  diaDelMes,
  diasCobradosPrimerMes,
  primerDiaDelMes,
  primerDiaMesSiguiente,
  valorPrimeraMensualidad,
} from '../utils/estimacion-cobros.ts'
import { aDatosTransaccion, erroresTransaccion } from '../utils/validar-transaccion.ts'
import { CamposTransaccion } from './campos-transaccion.tsx'
import { DatosPatinador, SelectorPatinador } from './selector-patinador.tsx'
import { usePatinadores } from './use-patinadores.ts'
import { AvisoApiPendienteM5 } from './aviso-api-m5.tsx'

type Pestana = 'asignar' | 'cambiar'

function precioPlan(plan: PlanOfertado): string {
  if (!plan.tarifa) return 'Sin tarifa vigente'
  return `${formatoCop(plan.tarifa.valor)} ${plan.periodicidad === 'MENSUAL' ? 'al mes' : 'por sesión'}`
}

function descripcionPlan(plan: PlanOfertado): string {
  if (plan.periodicidad === 'POR_SESION') return 'Día único. Se paga por sesión; no genera cobros mensuales.'
  const dias = `${plan.diasPorSemana} días/semana${plan.incluyeGimnasio ? ' + gimnasio' : ''}`
  return `${dias}. Pago hasta el día ${plan.diaLimitePago} de cada mes.`
}

/** RF-M5-06 y RF-M5-07: pantalla «Asignar o cambiar plan» (wireframes/grupo-04/asignar-plan). */
export function AsignarCambiarPlan({ pestanaInicial }: { pestanaInicial: Pestana }) {
  const { tieneRol, tienePermiso } = useSesion()
  const esAdministrador = tieneRol('ADMINISTRADOR')
  const puedeCobrar = tienePermiso(PERMISOS_M5.pagoRegistrar)

  const [pestana, setPestana] = useState<Pestana>(pestanaInicial)
  const [texto, setTexto] = useState('')
  const { patinadores, cargando, error: errorPatinadores, recargar } = usePatinadores(texto)
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null)

  const [planes, setPlanes] = useState<PlanOfertado[]>([])
  const [errorPlanes, setErrorPlanes] = useState<string | null>(null)
  useEffect(() => {
    planesParaElegir(esAdministrador)
      .then(setPlanes)
      .catch((e: Error) => setErrorPlanes(e.message))
  }, [esAdministrador])

  const candidatos = patinadores.filter((p) =>
    pestana === 'asignar' ? !p.planActual && !p.tieneCambioProgramado : p.planActual !== null,
  )
  const patinador = candidatos.find((p) => p.id === seleccionadoId) ?? null

  const cambiarPestana = (nueva: Pestana) => {
    setPestana(nueva)
    setSeleccionadoId(null)
  }

  return (
    <div className="app-page">
      <header className="vl-stack">
        <nav className="vl-breadcrumb" aria-label="Ruta">
          <span>Pagos</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Asignar o cambiar plan</span>
        </nav>
        <h1>Asignar o cambiar plan</h1>
        <p className="vl-text-body-sm">Vincula a un patinador con un plan activo o cambia el que tiene.</p>
      </header>

      <AvisoApiPendienteM5 peticiones={[
        'GET /m5/patinadores',
        'GET /m5/patinadores/:id/plan',
        'GET /m5/planes',
        'GET /m5/planes/oferta',
        'POST /m5/asignaciones',
        'POST /m5/asignaciones/cambios',
      ]} />
      <Alerta tono="info" titulo="Asignar plan y registrar un pago son pasos distintos">
        <p>
          Asignar crea el cobro del plan, pero no supone que ya se recibió dinero. En una asignación mensual puedes indicar
          abajo si recibiste un pago inicial o un abono; si no, el saldo queda pendiente y se paga después en «Registrar pago».
          Cambiar un plan programa la tarifa nueva para el próximo mes y no registra un pago.
        </p>
      </Alerta>

      <Pestanas
        etiqueta="Asignar o cambiar plan"
        opciones={[
          { id: 'asignar', texto: 'Asignar plan' },
          { id: 'cambiar', texto: 'Cambiar plan' },
        ]}
        activa={pestana}
        alCambiar={cambiarPestana}
      />

      {errorPlanes && <Alerta tono="error" titulo="No se pudieron cargar los planes">{errorPlanes}</Alerta>}

      <section id={`panel-${pestana}`} role="tabpanel" aria-labelledby={`pestana-${pestana}`} className="vl-stack">
        <div className="app-cols app-cols--2">
          <section className="vl-card vl-stack" aria-labelledby="titulo-patinador">
            <h2 id="titulo-patinador" className="vl-text-heading-h4">
              {pestana === 'asignar' ? 'Patinador' : '1. Patinador'}
            </h2>
            <SelectorPatinador
              id="buscar-patinador"
              etiqueta={pestana === 'asignar' ? 'Buscar patinador sin plan' : 'Buscar patinador'}
              ayuda={pestana === 'asignar' ? 'Solo aparecen patinadores que aún no tienen un plan activo.' : undefined}
              puedeBuscar={esAdministrador}
              texto={texto}
              alEscribir={setTexto}
              candidatos={candidatos}
              cargando={cargando}
              error={errorPatinadores}
              seleccionado={patinador}
              alSeleccionar={(p) => setSeleccionadoId(p?.id ?? null)}
              sinResultados={
                pestana === 'asignar'
                  ? 'No hay patinadores sin plan para mostrar.'
                  : 'No hay patinadores con plan activo para mostrar.'
              }
            />
            {patinador && <DatosPatinador patinador={patinador} />}
          </section>

          {pestana === 'asignar' ? (
            <FormularioAsignar
              key={patinador?.id ?? 'ninguno'}
              patinador={patinador}
              planes={planes}
              puedeCobrar={puedeCobrar}
              alTerminar={() => {
                setSeleccionadoId(null)
                recargar()
              }}
            />
          ) : (
            <HistorialPlanes patinador={patinador} />
          )}
        </div>

        {pestana === 'cambiar' && patinador && (
          <FormularioCambiar key={patinador.id} patinador={patinador} planes={planes} alTerminar={recargar} />
        )}
      </section>
    </div>
  )
}

/** Paso «Plan», resumen y confirmación de la asignación (RF-M5-06). */
function FormularioAsignar({
  patinador,
  planes,
  puedeCobrar,
  alTerminar,
}: {
  patinador: PatinadorM5 | null
  planes: PlanOfertado[]
  puedeCobrar: boolean
  alTerminar: () => void
}) {
  const hoy = hoyEnClub()
  const [planId, setPlanId] = useState<number | null>(null)
  const [fechaInicio, setFechaInicio] = useState(hoy)
  const [registrarPagoInicial, setRegistrarPagoInicial] = useState(false)
  const [montoInicialTexto, setMontoInicialTexto] = useState('')
  const [transaccionInicial, setTransaccionInicial] = useState<ValoresTransaccion>({
    fechaPago: hoy,
    medioPago: 'EFECTIVO',
    referencia: '',
  })
  const [dialogo, setDialogo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoAsignacion | null>(null)

  const plan = planes.find((p) => p.id === planId) ?? null
  const valorPrimerCobro = plan?.tarifa && plan.periodicidad === 'MENSUAL'
    ? valorPrimeraMensualidad(plan.tarifa.valor, fechaInicio)
    : null
  const montoInicial = leerPesos(montoInicialTexto)
  const errorMontoInicial = montoInicial === null || montoInicial <= 0
    ? 'El abono debe ser mayor que cero.'
    : valorPrimerCobro !== null && montoInicial > valorPrimerCobro
      ? `El abono no puede superar el primer cobro (${formatoCop(valorPrimerCobro)}).`
      : null
  const erroresIniciales = erroresTransaccion(transaccionInicial, hoy)
  const sinAcudiente = patinador !== null && patinador.esMenor && patinador.acudientes.length === 0
  const fechaValida = fechaInicio >= primerDiaDelMes(hoy)
  const pagoInicialValido = !registrarPagoInicial ||
    (valorPrimerCobro !== null && errorMontoInicial === null && Object.keys(erroresIniciales).length === 0)
  const listo = patinador !== null && plan !== null && plan.tarifa !== null && !sinAcudiente && fechaValida && pagoInicialValido

  const confirmar = async () => {
    if (!patinador || !plan) return
    setEnviando(true)
    setError(null)
    try {
      setResultado(await asignarPlan({
        patinadorId: patinador.id,
        planId: plan.id,
        fechaInicio,
        ...(registrarPagoInicial && montoInicial !== null
          ? { pagoInicial: { ...aDatosTransaccion(transaccionInicial), monto: montoInicial } }
          : {}),
      }))
      setDialogo(false)
    } catch (e) {
      setDialogo(false)
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  if (resultado && patinador) {
    return (
      <ResultadoAsignado
        resultado={resultado}
        nombre={patinador.nombre}
        patinadorId={patinador.id}
        alContinuar={alTerminar}
      />
    )
  }

  return (
    <section className="vl-card vl-stack" aria-labelledby="titulo-plan">
      <h2 id="titulo-plan" className="vl-text-heading-h4">Plan</h2>
      {sinAcudiente && (
        <Alerta tono="error" titulo="Asocia un acudiente antes de asignar un plan">
          <p>El patinador es menor de edad y no tiene acudiente asociado (RF-M2-04).</p>
        </Alerta>
      )}
      <div className="vl-radio-group" role="radiogroup" aria-labelledby="titulo-plan">
        {planes.map((opcion) => {
          const deshabilitado = !opcion.asignable || opcion.tarifa === null
          return (
            <label key={opcion.id} className="vl-check-row">
              <input
                className="vl-radio"
                type="radio"
                name="plan"
                disabled={deshabilitado || !patinador || sinAcudiente}
                checked={opcion.id === planId}
                onChange={() => {
                  setPlanId(opcion.id)
                  const valor = opcion.tarifa && opcion.periodicidad === 'MENSUAL'
                    ? valorPrimeraMensualidad(opcion.tarifa.valor, fechaInicio)
                    : null
                  setMontoInicialTexto(valor === null ? '' : String(valor))
                }}
              />
              <span>
                <span className="vl-text-label">{opcion.nombre} · {precioPlan(opcion)}</span>{' '}
                {!opcion.asignable && <Insignia entidad="plan" estado="inactivo" />}
                <br />
                <span className="vl-text-caption">
                  {deshabilitado ? 'Un plan inactivo o sin tarifa vigente no se puede asignar.' : descripcionPlan(opcion)}
                </span>
              </span>
            </label>
          )
        })}
      </div>
      <Campo
        etiqueta="Fecha de inicio"
        id="fecha-inicio"
        obligatorio
        error={fechaValida ? null : 'La fecha de inicio no puede ser anterior al mes actual.'}
      >
        <input
          id="fecha-inicio"
          className="vl-input"
          type="date"
          min={primerDiaDelMes(hoy)}
          value={fechaInicio}
          onChange={(evento) => setFechaInicio(evento.target.value)}
        />
      </Campo>

      {patinador && plan && plan.tarifa && (
        <>
          <h3 className="vl-text-heading-h5">Resumen</h3>
          <ListaDatos
            filas={[
              ['Patinador', patinador.nombre],
              ['Plan', `${plan.nombre} · ${precioPlan(plan)}`],
              ['Inicio', formatoFecha(fechaInicio)],
              ...resumenCobros(plan, plan.tarifa.valor, fechaInicio),
            ]}
          />
          {plan.periodicidad === 'MENSUAL' && (
            <section className="vl-stack" aria-labelledby="titulo-pago-inicial">
              <label className="vl-check-row">
                <input
                  className="vl-radio"
                  type="checkbox"
                  checked={registrarPagoInicial}
                  onChange={(evento) => {
                    setRegistrarPagoInicial(evento.target.checked)
                    if (evento.target.checked && valorPrimerCobro !== null) {
                      setMontoInicialTexto(String(valorPrimerCobro))
                    }
                  }}
                />
                <span>
                  <span className="vl-text-label">Registrar pago inicial ahora</span>
                  <br />
                  <span className="vl-text-caption">Actívalo solo si ya recibiste el dinero. Puedes ingresar el total o un abono.</span>
                </span>
              </label>
              {registrarPagoInicial && valorPrimerCobro !== null && (
                <>
                  <h3 id="titulo-pago-inicial" className="vl-text-heading-h5">Pago inicial del primer cobro</h3>
                  <Alerta tono="info">
                    <p>Primer cobro: {formatoCop(valorPrimerCobro)}. Lo no abonado queda pendiente para «Registrar pago».</p>
                  </Alerta>
                  <Campo etiqueta="Monto recibido (COP)" id="monto-inicial" obligatorio error={errorMontoInicial}>
                    <input
                      id="monto-inicial"
                      className="vl-input vl-input--numeric"
                      inputMode="numeric"
                      value={montoInicialTexto}
                      onChange={(evento) => setMontoInicialTexto(evento.target.value)}
                      aria-invalid={errorMontoInicial ? true : undefined}
                    />
                  </Campo>
                  <CamposTransaccion
                    valores={transaccionInicial}
                    alCambiar={setTransaccionInicial}
                    hoy={hoy}
                    errores={erroresIniciales}
                  />
                </>
              )}
            </section>
          )}
          {!patinador.matriculaPagada && (
            <Alerta tono="warning" titulo="Matrícula y gastos administrativos pendientes">
              <p>Ambos conceptos son obligatorios y deben registrarse y pagarse antes de activar el primer plan.</p>
              {puedeCobrar ? (
                <p>
                  <a className="vl-link" href={enlace('registrar-pago', { pestana: 'matricula', patinador: patinador.id })}>
                    Registrar matrícula y gastos
                  </a>
                </p>
              ) : (
                <p>Se pagan en la sede, con el Administrador o el Contador.</p>
              )}
            </Alerta>
          )}
        </>
      )}

      {error && <Alerta tono="error" titulo="No se pudo asignar el plan">{error}</Alerta>}
      <div className="app-actions">
        <button className="vl-button vl-button--primary" type="button" disabled={!listo} onClick={() => setDialogo(true)}>
          Asignar plan
        </button>
      </div>

      <DialogoConfirmacion
        abierto={dialogo}
        titulo={plan ? `¿Asignar ${plan.nombre}?` : 'Asignar plan'}
        textoConfirmar="Asignar plan"
        ocupado={enviando}
        alConfirmar={confirmar}
        alCancelar={() => setDialogo(false)}
      >
        <p>
          {patinador?.nombre} inicia el {formatoFecha(fechaInicio)}
          {plan?.periodicidad === 'MENSUAL'
            ? `. El primer cobro será de ${formatoCop(valorPrimerCobro ?? 0)}.` +
              (registrarPagoInicial
                ? ` Se registrará un pago de ${formatoCop(montoInicial ?? 0)} y quedará pendiente el saldo restante.`
                : ' Si no registras un pago inicial, el cobro queda pendiente.')
            : ' con un plan por sesión; no se generan cobros mensuales.'}
        </p>
      </DialogoConfirmacion>
    </section>
  )
}

/** Filas del resumen de cobros antes de confirmar (estimación; la API da el valor final). */
function resumenCobros(plan: PlanOfertado, tarifa: number, fechaInicio: string): [string, string][] {
  if (plan.periodicidad === 'POR_SESION') {
    return [['Cobros', 'No genera cobro mensual; se paga cada sesión en la sede.']]
  }
  const dias = diasCobradosPrimerMes(fechaInicio)
  const siguiente = primerDiaMesSiguiente(fechaInicio)
  return [
    [
      dias < 30 ? 'Primer cobro mensual (prorrateado)' : 'Primer cobro mensual',
      `${formatoMesAnio(fechaInicio)} · ${formatoCop(valorPrimeraMensualidad(tarifa, fechaInicio))}` +
        (dias < 30 ? ` (${dias}/30 días). El pago puede registrarse ahora o después.` : ''),
    ],
    [
      'Mes siguiente',
      `${formatoMesAnio(siguiente)} · ${formatoCop(tarifa)} · pagar hasta el ${formatoFecha(diaDelMes(siguiente, plan.diaLimitePago ?? 5))}`,
    ],
  ]
}

function ResultadoAsignado({
  resultado,
  nombre,
  patinadorId,
  alContinuar,
}: {
  resultado: ResultadoAsignacion
  nombre: string
  patinadorId: number
  alContinuar: () => void
}) {
  const { primerCobro, siguienteCobro } = resultado
  return (
    <section className="vl-card vl-stack" aria-labelledby="titulo-asignado">
      <h2 id="titulo-asignado" className="vl-text-heading-h4">Plan asignado</h2>
      <Alerta tono="success" titulo={`${nombre} tiene el plan ${resultado.plan.nombre}`}>
        <p>Desde el {formatoFecha(resultado.fechaInicio)}.</p>
      </Alerta>
      <ListaDatos
        filas={[
          ['Tarifa', formatoCop(resultado.tarifa)],
          ...(primerCobro
            ? ([
                [
                  'Primer cobro',
                  `${formatoMesAnio(primerCobro.periodo)} · ${formatoCop(primerCobro.valor)} (${primerCobro.diasCobrados}/30 días) · ` +
                    `pagar hasta el ${formatoFecha(primerCobro.fechaLimite)}`,
                ],
              ] as [string, string][])
            : [['Cobros', 'Se paga por sesión en la sede.'] as [string, string]]),
          ...(primerCobro
            ? ([[
                'Pago inicial',
                resultado.pagoInicial
                  ? `${formatoCop(resultado.pagoInicial.monto)} · comprobante ${resultado.pagoInicial.comprobante}`
                  : 'No se registró pago; el cobro queda pendiente.',
              ], [
                'Saldo pendiente del primer cobro',
                formatoCop(resultado.pagoInicial?.saldoRestante ?? primerCobro.valor),
              ]] as [string, string][])
            : []),
          ...(siguienteCobro
            ? ([
                [
                  'Mes siguiente',
                  `${formatoMesAnio(siguienteCobro.periodo)} · ${formatoCop(siguienteCobro.valor)} · pagar hasta el ` +
                    `${formatoFecha(siguienteCobro.fechaLimite)}` +
                    (siguienteCobro.vencidoDesde ? `; pasa a «Vencido» desde el ${formatoFecha(siguienteCobro.vencidoDesde)}` : ''),
                ],
              ] as [string, string][])
            : []),
        ]}
      />
      {primerCobro && (
        <Alerta tono={!resultado.pagoInicial || resultado.pagoInicial.saldoRestante > 0 ? 'warning' : 'success'}>
          <p>
            {resultado.pagoInicial?.saldoRestante
              ? `Queda un saldo de ${formatoCop(resultado.pagoInicial.saldoRestante)}. Regístralo cuando recibas el pago.`
              : resultado.pagoInicial
                ? 'El primer cobro quedó pagado.'
                : 'No se recibió dinero en la asignación; el cobro queda pendiente hasta registrar un pago.'}
          </p>
        </Alerta>
      )}
      <div className="app-actions">
        <a
          className="vl-button vl-button--secondary"
          href={enlace('registrar-pago', {
            pestana: resultado.plan.periodicidad === 'POR_SESION' ? 'sesion' : 'cobro',
            patinador: patinadorId,
          })}
        >
          Ir a Registrar pago
        </a>
        <a className="vl-button vl-button--secondary" href={enlace('historial-pagos', { patinador: patinadorId })}>
          Ver historial de pagos
        </a>
        <button className="vl-button vl-button--secondary" type="button" onClick={alContinuar}>
          Asignar a otro patinador
        </button>
      </div>
    </section>
  )
}

/** Historial de planes del patinador elegido (pestaña «Cambiar plan»). */
function HistorialPlanes({ patinador }: { patinador: PatinadorM5 | null }) {
  const [datos, setDatos] = useState<PlanDelPatinador | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!patinador) return
    let vigente = true
    planDelPatinador(patinador.id)
      .then((d) => vigente && setDatos(d))
      .catch((e: Error) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [patinador])

  return (
    <section className="vl-card vl-stack" aria-labelledby="titulo-historial">
      <h2 id="titulo-historial" className="vl-text-heading-h4">Historial de planes</h2>
      {!patinador && <p className="vl-text-body-sm">Elige un patinador para ver su historial.</p>}
      {error && <Alerta tono="error">{error}</Alerta>}
      {patinador && datos && (
        <div className="vl-table-wrap">
          <table className="vl-table">
            <thead>
              <tr><th>Plan</th><th>Desde</th><th>Hasta</th></tr>
            </thead>
            <tbody>
              {datos.historial.map((fila) => (
                <tr key={fila.id}>
                  <td data-label="Plan">{fila.planNombre}</td>
                  <td data-label="Desde">{formatoFecha(fila.fechaInicio)}</td>
                  <td data-label="Hasta">{fila.fechaFin ? formatoFecha(fila.fechaFin) : 'Actual'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/** Pasos «Nuevo plan» y «Resumen del cambio» (RF-M5-07). */
function FormularioCambiar({
  patinador,
  planes,
  alTerminar,
}: {
  patinador: PatinadorM5
  planes: PlanOfertado[]
  alTerminar: () => void
}) {
  const hoy = hoyEnClub()
  const rigeDesde = primerDiaMesSiguiente(hoy)
  const actual = patinador.planActual
  const [planId, setPlanId] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')
  const [dialogo, setDialogo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoCambio | null>(null)

  const opciones = planes.filter((p) => p.asignable && p.tarifa !== null)
  const plan = opciones.find((p) => p.id === planId) ?? null
  const ajustarGrupo = plan !== null && actual !== null && plan.diasPorSemana !== actual.diasPorSemana

  const confirmar = async () => {
    if (!plan) return
    setEnviando(true)
    setError(null)
    try {
      setResultado(await cambiarPlan({ patinadorId: patinador.id, planId: plan.id, motivo: motivo.trim() || undefined }))
      setDialogo(false)
      alTerminar()
    } catch (e) {
      setDialogo(false)
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  if (resultado) {
    return (
      <section className="vl-card vl-stack" aria-labelledby="titulo-cambio">
        <h2 id="titulo-cambio" className="vl-text-heading-h4">Cambio programado</h2>
        <Alerta tono="success" titulo={`${patinador.nombre} pasará a ${resultado.planNuevo.nombre}`}>
          <p>Desde el {formatoFecha(resultado.rigeDesde)}. El cobro de {formatoMesAnio(hoy)} no cambia.</p>
        </Alerta>
        {resultado.proximoCobro && (
          <ListaDatos
            filas={[
              [
                'Próximo cobro',
                `${formatoMesAnio(resultado.proximoCobro.periodo)} · ${formatoCop(resultado.proximoCobro.valor)} · pagar hasta el ` +
                  `${formatoFecha(resultado.proximoCobro.fechaLimite)}` +
                  (resultado.proximoCobro.vencidoDesde
                    ? `; pasa a «Vencido» desde el ${formatoFecha(resultado.proximoCobro.vencidoDesde)}`
                    : ''),
              ],
            ]}
          />
        )}
        {resultado.aviso && <Alerta tono="warning" titulo="Hay que ajustar el grupo"><p>{resultado.aviso}</p></Alerta>}
      </section>
    )
  }

  if (patinador.tieneCambioProgramado) {
    return (
      <Alerta tono="info" titulo="Ya hay un cambio de plan programado">
        <p>Solo puede haber un cambio programado a la vez. Revisa el historial de planes.</p>
      </Alerta>
    )
  }

  return (
    <>
      <section className="vl-card vl-stack" aria-labelledby="titulo-nuevo">
        <h2 id="titulo-nuevo" className="vl-text-heading-h4">2. Nuevo plan</h2>
        <div className="app-cols app-cols--4" role="radiogroup" aria-labelledby="titulo-nuevo">
          {opciones.map((opcion) =>
            opcion.id === actual?.planId ? (
              <div key={opcion.id} className="vl-card vl-stack">
                <p className="vl-text-heading-h5">{opcion.nombre}</p>
                <p className="vl-text-caption">Plan actual</p>
                <p className="vl-text-label">{precioPlan(opcion)}</p>
              </div>
            ) : (
              <label key={opcion.id} className="vl-card vl-card--selectable vl-stack" aria-selected={opcion.id === planId}>
                <span className="vl-check-row">
                  <input
                    className="vl-radio"
                    type="radio"
                    name="nuevo-plan"
                    checked={opcion.id === planId}
                    onChange={() => setPlanId(opcion.id)}
                  />
                  <span className="vl-text-heading-h5">{opcion.nombre}</span>
                </span>
                <span className="vl-text-caption app-bloque">{descripcionPlan(opcion)}</span>
                <span className="vl-text-label app-bloque">{precioPlan(opcion)}</span>
              </label>
            ),
          )}
        </div>
      </section>

      <section className="vl-card vl-stack" aria-labelledby="titulo-resumen-cambio">
        <h2 id="titulo-resumen-cambio" className="vl-text-heading-h4">3. Resumen del cambio</h2>
        {plan && plan.tarifa ? (
          <ListaDatos
            filas={[
              ['Plan nuevo', `${plan.nombre} · ${precioPlan(plan)}`],
              ['Rige desde', `${formatoFecha(rigeDesde)} (siguiente periodo de facturación)`],
              [`Cobro de ${formatoMesAnio(hoy)}`, `No cambia (${actual?.nombre})`],
              [
                'Próximo cobro',
                plan.periodicidad === 'MENSUAL'
                  ? `${formatoMesAnio(rigeDesde)} · ${formatoCop(plan.tarifa.valor)} · pagar hasta el ${formatoFecha(diaDelMes(rigeDesde, plan.diaLimitePago ?? 5))}`
                  : 'Se paga cada sesión en la sede.',
              ],
            ]}
          />
        ) : (
          <p className="vl-text-body-sm">Elige el nuevo plan.</p>
        )}
        {ajustarGrupo && (
          <Alerta tono="warning" titulo="Hay que ajustar el grupo">
            <p>
              La frecuencia semanal pasa de {actual?.diasPorSemana ?? '—'} a {plan?.diasPorSemana ?? '—'} días. Después de
              confirmar podrás cambiar el grupo de {patinador.nombre} en Grupos y horarios.
            </p>
          </Alerta>
        )}
        <Campo etiqueta="Motivo del cambio" id="motivo-cambio" ayuda="Opcional. Queda en la auditoría.">
          <textarea
            id="motivo-cambio"
            className="vl-textarea"
            rows={2}
            maxLength={500}
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
          />
        </Campo>
        {error && <Alerta tono="error" titulo="No se pudo cambiar el plan">{error}</Alerta>}
        <div className="app-actions">
          <button className="vl-button vl-button--primary" type="button" disabled={!plan} onClick={() => setDialogo(true)}>
            Confirmar cambio
          </button>
        </div>
      </section>

      <DialogoConfirmacion
        abierto={dialogo}
        titulo={plan ? `¿Cambiar a ${plan.nombre}?` : 'Cambiar plan'}
        textoConfirmar="Confirmar cambio"
        ocupado={enviando}
        alConfirmar={confirmar}
        alCancelar={() => setDialogo(false)}
      >
        <p>
          {patinador.nombre} pasará a {plan ? precioPlan(plan) : ''} desde el {formatoFecha(rigeDesde)}. El cobro de{' '}
          {formatoMesAnio(hoy)} no cambia.
        </p>
      </DialogoConfirmacion>
    </>
  )
}
