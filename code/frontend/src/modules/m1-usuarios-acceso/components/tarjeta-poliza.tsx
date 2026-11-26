import { Alerta, Insignia, ListaDatos } from '../../../shared/ui/componentes.tsx'
import { formatoFecha, formatoFechaHoraDeMarca } from '../../../shared/utils/formato.ts'
import { urlArchivoPoliza } from '../services/polizas.service.ts'
import type { DetallePoliza, PolizaRegistrada } from '../types/polizas.types.ts'
import { formatoTamanoArchivo } from '../utils/validar-poliza.ts'

function estadoParaBadge(detalle: DetallePoliza, actual: PolizaRegistrada | null): string {
  if (!detalle.esMenor && !actual) return 'no-aplica'
  return (actual?.estado ?? 'PENDIENTE').toLowerCase()
}

function textoBoton(actual: PolizaRegistrada | null): string {
  if (!actual) return 'Registrar póliza'
  if (actual.estado === 'VENCIDA') return 'Renovar póliza'
  return 'Reemplazar póliza'
}

/**
 * Card «Póliza médica» de HU-M1-10: StatusBadge de la vigencia, datos de la
 * póliza actual, enlace al adjunto privado, acción de registro y el historial
 * de pólizas anteriores (reemplazar no borra).
 */
export function TarjetaPoliza({
  detalle,
  alRegistrar,
}: {
  detalle: DetallePoliza
  alRegistrar: () => void
}) {
  const actual = detalle.polizaActual
  const anteriores = detalle.historial.filter((poliza) => poliza.id !== actual?.id)

  return (
    <article className="vl-card m1-poliza" aria-labelledby="poliza-titulo">
      <header className="m1-familia__card-head">
        <div>
          <h2 id="poliza-titulo" className="vl-text-heading-h4">
            Póliza médica
          </h2>
          <p className="vl-text-caption">Requisito para habilitar el perfil del patinador menor.</p>
        </div>
        <Insignia entidad="poliza" estado={estadoParaBadge(detalle, actual)} />
      </header>

      {actual ? (
        <>
          <ListaDatos
            filas={[
              ['Aseguradora', actual.aseguradora],
              ['Número de póliza', actual.numeroPoliza],
              [
                'Vigencia',
                `${formatoFecha(actual.vigenteDesde)} – ${formatoFecha(actual.vigenteHasta)}`,
              ],
              [
                'Registrada',
                `${formatoFechaHoraDeMarca(actual.registradaEn)}${
                  actual.registradaPor ? ` · ${actual.registradaPor.nombre}` : ''
                }`,
              ],
            ]}
          />

          {actual.archivo ? (
            <p className="m1-poliza__archivo">
              <a
                className="vl-link"
                href={urlArchivoPoliza(detalle.id, actual.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver póliza
              </a>
              <span className="vl-text-caption">
                {actual.archivo.nombre} · {formatoTamanoArchivo(actual.archivo.tamano)}
              </span>
            </p>
          ) : (
            <p className="vl-text-caption">La póliza no tiene un archivo adjunto.</p>
          )}

          {actual.estado === 'VENCIDA' && (
            <Alerta tono="error" titulo="Póliza vencida">
              <p>
                La vigencia terminó el {formatoFecha(actual.vigenteHasta)}. Renueva la póliza
                para que el patinador pueda participar.
              </p>
            </Alerta>
          )}

          {actual.estado === 'PENDIENTE' && (
            <Alerta tono="warning" titulo="Póliza aún no vigente">
              <p>La vigencia empieza el {formatoFecha(actual.vigenteDesde)}.</p>
            </Alerta>
          )}
        </>
      ) : (
        <>
          <p className="vl-text-body-sm">
            {detalle.esMenor
              ? 'No hay una póliza registrada. El perfil del menor permanece bloqueado hasta registrar una póliza vigente.'
              : 'El patinador es mayor de edad: la póliza médica no es un requisito para su perfil.'}
          </p>
          <ListaDatos
            filas={[
              [
                'Estado del requisito',
                detalle.esMenor ? 'Pendiente de registro' : 'No aplica',
              ],
            ]}
          />
        </>
      )}

      {detalle.puedeRegistrar ? (
        <div className="m1-familia__accion">
          <button className="vl-button vl-button--primary" type="button" onClick={alRegistrar}>
            {textoBoton(actual)}
          </button>
        </div>
      ) : detalle.esMenor ? (
        <Alerta tono="warning" titulo="No se puede registrar la póliza">
          <p>{detalle.motivoNoRegistra}</p>
        </Alerta>
      ) : null}

      {anteriores.length > 0 && (
        <details className="m1-poliza__historial">
          <summary className="vl-text-label">
            Pólizas anteriores ({anteriores.length})
          </summary>
          <ul className="m1-poliza__lista">
            {anteriores.map((poliza) => (
              <li key={poliza.id} className="m1-poliza__item">
                <div>
                  <p className="vl-text-label">
                    {poliza.aseguradora} · {poliza.numeroPoliza}
                  </p>
                  <p className="vl-text-caption">
                    {formatoFecha(poliza.vigenteDesde)} – {formatoFecha(poliza.vigenteHasta)}
                  </p>
                </div>
                <div className="m1-poliza__item-acciones">
                  <Insignia entidad="poliza" estado={poliza.estado.toLowerCase()} />
                  {poliza.archivo && (
                    <a
                      className="vl-link"
                      href={urlArchivoPoliza(detalle.id, poliza.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver póliza
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  )
}
