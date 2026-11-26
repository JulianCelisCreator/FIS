import { useEffect, useState } from 'react'
import { Alerta } from '../../../shared/ui/componentes.tsx'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'
import { formatoCop, formatoFecha } from '../../../shared/utils/formato.ts'
import { enlace } from '../../../shared/utils/use-ruta.ts'
import { buscarPatinadores, ofertaDePlanes } from '../services/m5.service.ts'
import { PERMISOS_M5, TIPOS_PLAN, type PlanOfertado } from '../types/m5.types.ts'

type Oferta = { fecha: string; planes: Omit<PlanOfertado, 'asignable'>[] }

/**
 * RF-M5-05: «Planes de la escuela», de solo lectura, igual para el Contador, el
 * Acudiente y el Patinador. Solo muestra planes activos con tarifa vigente
 * (wireframes/grupo-04/oferta-planes).
 */
export function OfertaPlanes() {
  const { tienePermiso, tieneRol } = useSesion()
  const [oferta, setOferta] = useState<Oferta | null>(null)
  const [error, setError] = useState<string | null>(null)
  // El acceso a asignar plan solo se ofrece a quien tiene patinadores a su cargo (no al Contador ni al menor).
  const [puedeAsignar, setPuedeAsignar] = useState(false)

  useEffect(() => {
    let vigente = true
    ofertaDePlanes()
      .then((datos) => vigente && setOferta(datos))
      .catch((e: Error) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [])

  const conPermisoDeAsignar = tienePermiso(PERMISOS_M5.planAsignar) && !tieneRol('ADMINISTRADOR')
  useEffect(() => {
    if (!conPermisoDeAsignar) return
    let vigente = true
    buscarPatinadores('')
      .then((lista) => vigente && setPuedeAsignar(lista.length > 0))
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [conPermisoDeAsignar])

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb" aria-label="Ruta">
            <span>Planes</span>
          </nav>
          <h1>Planes de la escuela</h1>
          <p className="vl-text-body-sm">
            Planes disponibles y su valor vigente{oferta ? ` al ${formatoFecha(oferta.fecha)}` : ''}.
          </p>
        </div>
      </header>

      {error && <Alerta tono="error" titulo="No se pudieron consultar los planes">{error}</Alerta>}
      {!oferta && !error && <p className="vl-text-caption" role="status">Cargando planes…</p>}
      {oferta?.planes.length === 0 && (
        <div className="vl-card vl-stack">
          <p className="vl-text-heading-h5">Por ahora no hay planes disponibles</p>
          <p className="vl-text-body-sm">La escuela publicará aquí los planes cuando tengan una tarifa vigente.</p>
        </div>
      )}
      {oferta && oferta.planes.length > 0 && (
        <ul className="app-oferta" aria-label="Planes disponibles">
          {oferta.planes.map((plan) => (
            <li key={plan.id} className="vl-card app-oferta__plan">
              <h2 className="vl-text-heading-h4">{plan.nombre}</h2>
              <p className="vl-text-caption">
                {TIPOS_PLAN.find((tipo) => tipo.valor === plan.tipo)?.texto ?? plan.tipo} ·{' '}
                {plan.periodicidad === 'MENSUAL' ? 'mensual' : 'pago por sesión'}
              </p>
              <p className="app-oferta__precio">
                {plan.tarifa ? formatoCop(plan.tarifa.valor) : '—'}{' '}
                <span>{plan.periodicidad === 'MENSUAL' ? 'al mes' : 'por sesión'}</span>
              </p>
              {plan.descripcion && <p className="vl-text-body-sm">{plan.descripcion}</p>}
              {plan.periodicidad === 'MENSUAL' ? (
                <p className="vl-text-body-sm">
                  Pago del día 1 al {plan.diaLimitePago ?? 5} de cada mes; si queda saldo, pasa a «Vencido» después de los
                  días de gracia.
                </p>
              ) : (
                !plan.descripcion && <p className="vl-text-body-sm">Se paga en la sede el día de la clase.</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Alerta tono="info" titulo="Ingreso a mitad de mes">
        <p>
          El primer cobro mensual se prorratea por los días que quedan del mes (si ingresas el día 15, pagas 15/30 de la
          tarifa). Desde el mes siguiente se cobra la tarifa completa.
        </p>
      </Alerta>

      {puedeAsignar && (
        <section className="vl-card vl-stack" aria-labelledby="titulo-inscribir">
          <h2 id="titulo-inscribir" className="vl-text-heading-h5">
            {tieneRol('ACUDIENTE') ? '¿Quieres inscribir o cambiar el plan de un patinador?' : '¿Quieres inscribirte o cambiar tu plan?'}
          </h2>
          <p className="vl-text-body-sm">El cambio de plan empieza a regir en el siguiente periodo de facturación.</p>
          <div>
            <a className="vl-button vl-button--primary" href={enlace('asignar-plan')}>
              Asignar o cambiar plan
            </a>
          </div>
        </section>
      )}
    </div>
  )
}
