import { Alerta, Insignia, ListaDatos } from '../../../shared/ui/componentes.tsx'
import { formatoFechaHoraDeMarca } from '../../../shared/utils/formato.ts'
import type { DetalleAutorizacion } from '../types/autorizaciones.types.ts'
import { parentescoDe, textoAcudientes } from '../utils/autorizacion.ts'

/**
 * Card «Autorización del acudiente» (HU-M1-09): muestra el StatusBadge del
 * requisito, los datos de quien la otorgó y la fecha, o el botón para
 * registrarla cuando está pendiente.
 */
export function TarjetaAutorizacion({
  detalle,
  alRegistrar,
}: {
  detalle: DetalleAutorizacion
  alRegistrar: () => void
}) {
  const autorizacion = detalle.autorizacion

  return (
    <article className="vl-card m1-familia__autorizacion" aria-labelledby="autorizacion-titulo">
      <header className="m1-familia__card-head">
        <div>
          <h2 id="autorizacion-titulo" className="vl-text-heading-h4">
            Autorización del acudiente
          </h2>
          <p className="vl-text-caption">Requisito para habilitar el perfil del patinador menor.</p>
        </div>
        <Insignia
          entidad="autorizacion"
          estado={autorizacion ? 'registrada' : detalle.esMenor ? 'pendiente' : 'no-aplica'}
        />
      </header>

      {autorizacion ? (
        <>
          <ListaDatos
            filas={[
              ['Acudiente', autorizacion.acudiente.nombre],
              ['Parentesco', parentescoDe(detalle, autorizacion.acudiente.id)],
              ['Fecha y hora', formatoFechaHoraDeMarca(autorizacion.registradaEn)],
            ]}
          />
          <p className="vl-audit-entry">Texto aceptado: versión {autorizacion.versionTexto}</p>
          <p className="vl-text-body-sm">
            La autorización queda guardada con la identidad del acudiente y no se edita. Si el
            texto cambia, se registra una autorización nueva.
          </p>
        </>
      ) : (
        <>
          <p className="vl-text-body-sm">
            {detalle.esMenor
              ? 'El perfil del menor permanece bloqueado hasta que su acudiente registre la autorización.'
              : 'El patinador es mayor de edad: no necesita autorización del acudiente.'}
          </p>
          <ListaDatos
            filas={[
              ['Acudiente vinculado', textoAcudientes(detalle.acudientes)],
              ['Estado del requisito', detalle.esMenor ? 'Pendiente de registro' : 'No aplica'],
            ]}
          />

          {detalle.puedeRegistrar ? (
            <div className="m1-familia__accion">
              <button
                className="vl-button vl-button--primary"
                type="button"
                onClick={alRegistrar}
              >
                Registrar autorización
              </button>
            </div>
          ) : detalle.esMenor ? (
            <Alerta tono="warning" titulo="No se puede registrar">
              <p>{detalle.motivoNoRegistra}</p>
            </Alerta>
          ) : null}
        </>
      )}
    </article>
  )
}
