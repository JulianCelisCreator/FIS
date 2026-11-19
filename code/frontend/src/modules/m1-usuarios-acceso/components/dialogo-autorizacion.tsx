import { useState } from 'react'
import { ErrorApi } from '../../../shared/services/cliente-api.ts'
import {
  Alerta,
  Campo,
  DialogoConfirmacion,
  ListaDatos,
} from '../../../shared/ui/componentes.tsx'
import { registrarAutorizacion } from '../services/autorizaciones.service.ts'
import type {
  DatosRegistrarAutorizacion,
  DetalleAutorizacion,
} from '../types/autorizaciones.types.ts'

function acudientePredeterminado(
  detalle: DetalleAutorizacion,
  esAdministrador: boolean,
  usuarioId: number,
): number | null {
  if (!esAdministrador) {
    return (
      detalle.acudientes.find((acudiente) => acudiente.id === usuarioId)?.id ??
      detalle.acudientes[0]?.id ??
      null
    )
  }
  return (
    detalle.acudientes.find((acudiente) => acudiente.esPrincipal)?.id ??
    detalle.acudientes[0]?.id ??
    null
  )
}

/**
 * Dialog/Form de HU-M1-09: texto de la autorización, Checkbox de aceptación y
 * datos del acudiente en solo lectura. En móvil se abre como pantalla completa
 * (regla .vl-dialog--form en app.css). Se monta solo al abrir, así cada
 * apertura empieza sin aceptación ni errores anteriores.
 */
export function DialogoAutorizacion({
  detalle,
  esAdministrador,
  usuarioId,
  alCerrar,
  alRegistrar,
  alTextoDesactualizado,
}: {
  detalle: DetalleAutorizacion
  esAdministrador: boolean
  usuarioId: number
  alCerrar: () => void
  alRegistrar: (detalle: DetalleAutorizacion) => void
  alTextoDesactualizado: () => void
}) {
  const [acepta, setAcepta] = useState(false)
  const [acudienteId, setAcudienteId] = useState<number | null>(() =>
    acudientePredeterminado(detalle, esAdministrador, usuarioId),
  )
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const acudiente =
    detalle.acudientes.find((vinculado) => vinculado.id === acudienteId) ??
    detalle.acudientes[0]
  const elegirAcudiente = esAdministrador && detalle.acudientes.length > 1

  const guardar = async () => {
    setIntentado(true)
    if (!acepta || enviando || !acudiente) return

    setEnviando(true)
    setError(null)
    try {
      const datos: DatosRegistrarAutorizacion = {
        acepta: true,
        versionTexto: detalle.texto.version,
      }
      if (esAdministrador) datos.acudienteId = acudiente.id
      alRegistrar(await registrarAutorizacion(detalle.id, datos))
    } catch (e) {
      // El texto legal cambió entre abrir el diálogo y guardar: la pantalla
      // recarga la versión vigente en vez de dejar el formulario obsoleto.
      if (e instanceof ErrorApi && e.estado === 400) {
        alTextoDesactualizado()
        return
      }
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo registrar la autorización. Intenta de nuevo.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <DialogoConfirmacion
      abierto
      variante="form"
      titulo="Registrar autorización"
      textoConfirmar="Registrar autorización"
      ocupado={enviando}
      alConfirmar={() => void guardar()}
      alCancelar={alCerrar}
    >
      {error && (
        <Alerta tono="error" titulo="No se pudo registrar la autorización">
          <p>{error}</p>
        </Alerta>
      )}

      <ListaDatos
        filas={[
          ['Patinador', `${detalle.nombre} · ${detalle.edad} años`],
          ['Acudiente', acudiente?.nombre ?? '—'],
          ['Parentesco', acudiente?.parentesco ?? '—'],
        ]}
      />

      {elegirAcudiente && (
        <Campo
          etiqueta="Acudiente que autoriza"
          id="autorizacion-acudiente"
          obligatorio
          ayuda="El Administrador puede registrar la autorización en nombre de uno de los acudientes vinculados."
        >
          <select
            id="autorizacion-acudiente"
            className="vl-select"
            value={acudiente?.id ?? ''}
            onChange={(evento) => setAcudienteId(Number(evento.target.value))}
          >
            {detalle.acudientes.map((vinculado) => (
              <option key={vinculado.id} value={vinculado.id}>
                {vinculado.nombre} · {vinculado.parentesco}
              </option>
            ))}
          </select>
        </Campo>
      )}

      <div className="m1-familia__texto-legal">
        <p className="vl-text-label">Texto de la autorización</p>
        <p className="vl-text-body-sm">{detalle.texto.contenido}</p>
        <p className="vl-text-caption">Versión {detalle.texto.version}</p>
      </div>

      <div>
        <label className="vl-check-row">
          <input
            className="vl-radio"
            type="checkbox"
            checked={acepta}
            onChange={(evento) => setAcepta(evento.target.checked)}
            aria-invalid={intentado && !acepta ? true : undefined}
            aria-describedby={intentado && !acepta ? 'autorizacion-aceptacion-error' : undefined}
          />
          <span>
            He leído y acepto el texto de la autorización para {detalle.nombre}.
          </span>
        </label>
        {intentado && !acepta && (
          <p className="vl-field__error" id="autorizacion-aceptacion-error" role="alert">
            Marca la aceptación para registrar la autorización.
          </p>
        )}
      </div>
    </DialogoConfirmacion>
  )
}
