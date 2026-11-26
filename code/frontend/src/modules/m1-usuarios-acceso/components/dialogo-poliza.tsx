import { useState } from 'react'
import {
  Alerta,
  Campo,
  DialogoConfirmacion,
  ListaDatos,
} from '../../../shared/ui/componentes.tsx'
import { formatoFecha } from '../../../shared/utils/formato.ts'
import { registrarPoliza } from '../services/polizas.service.ts'
import type { DetallePoliza } from '../types/polizas.types.ts'
import {
  ACEPTAR_ARCHIVO_POLIZA,
  formatoTamanoArchivo,
  validarArchivoPoliza,
  validarDatosPoliza,
} from '../utils/validar-poliza.ts'

/**
 * Dialog/Form de HU-M1-10: datos de la póliza, dos DateInput (el fin con
 * min = inicio) y carga del documento. En móvil se abre como pantalla
 * completa (regla .vl-dialog--form de app.css).
 *
 * La carga de archivos es una brecha del design system (sección 6): se usa el
 * input nativo con los estilos de campo de la aplicación.
 */
export function DialogoPoliza({
  detalle,
  alCerrar,
  alRegistrar,
}: {
  detalle: DetallePoliza
  alCerrar: () => void
  alRegistrar: (detalle: DetallePoliza) => void
}) {
  const [aseguradora, setAseguradora] = useState('')
  const [numeroPoliza, setNumeroPoliza] = useState('')
  const [vigenteDesde, setVigenteDesde] = useState('')
  const [vigenteHasta, setVigenteHasta] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const errores = validarDatosPoliza({
    aseguradora,
    numeroPoliza,
    vigenteDesde,
    vigenteHasta,
  })
  const motivoArchivo = validarArchivoPoliza(archivo)
  // CA-05: un archivo inválido se rechaza al adjuntarlo, con su motivo.
  const errorArchivo = archivo ? motivoArchivo : intentado ? motivoArchivo : null
  const reemplaza = detalle.polizaActual !== null

  const guardar = async () => {
    setIntentado(true)
    if (enviando) return
    if (Object.keys(errores).length > 0 || motivoArchivo || !archivo) return

    setEnviando(true)
    setError(null)
    try {
      const actualizado = await registrarPoliza(detalle.id, {
        aseguradora,
        numeroPoliza,
        vigenteDesde,
        vigenteHasta,
        archivo,
      })
      alRegistrar(actualizado)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo registrar la póliza. Intenta de nuevo.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <DialogoConfirmacion
      abierto
      variante="form"
      titulo={reemplaza ? 'Reemplazar póliza' : 'Registrar póliza'}
      textoConfirmar="Guardar póliza"
      ocupado={enviando}
      alConfirmar={() => void guardar()}
      alCancelar={alCerrar}
    >
      {error && (
        <Alerta tono="error" titulo="No se pudo registrar la póliza">
          <p>{error}</p>
        </Alerta>
      )}

      <ListaDatos
        filas={[
          ['Patinador', `${detalle.nombre} · ${detalle.edad} años`],
          [
            'Póliza actual',
            detalle.polizaActual
              ? `${detalle.polizaActual.aseguradora} ${detalle.polizaActual.numeroPoliza} · hasta ${formatoFecha(detalle.polizaActual.vigenteHasta)}`
              : 'Sin póliza registrada',
          ],
        ]}
      />

      {reemplaza && (
        <Alerta tono="info" titulo="Se conserva el historial">
          <p>
            La póliza anterior no se borra: queda en el historial del patinador y la nueva
            pasa a ser la póliza actual.
          </p>
        </Alerta>
      )}

      <Campo
        etiqueta="Aseguradora"
        id="poliza-aseguradora"
        obligatorio
        error={intentado ? errores.aseguradora : undefined}
      >
        <input
          id="poliza-aseguradora"
          className="vl-input"
          type="text"
          value={aseguradora}
          onChange={(evento) => setAseguradora(evento.target.value)}
          autoComplete="organization"
          aria-invalid={intentado && errores.aseguradora ? true : undefined}
        />
      </Campo>

      <Campo
        etiqueta="Número de póliza"
        id="poliza-numero"
        obligatorio
        error={intentado ? errores.numeroPoliza : undefined}
      >
        <input
          id="poliza-numero"
          className="vl-input"
          type="text"
          value={numeroPoliza}
          onChange={(evento) => setNumeroPoliza(evento.target.value)}
          aria-invalid={intentado && errores.numeroPoliza ? true : undefined}
        />
      </Campo>

      <div className="m1-poliza__fechas">
        <Campo
          etiqueta="Vigente desde"
          id="poliza-desde"
          obligatorio
          error={intentado ? errores.vigenteDesde : undefined}
        >
          <input
            id="poliza-desde"
            className="vl-input"
            type="date"
            value={vigenteDesde}
            max={vigenteHasta || undefined}
            onChange={(evento) => setVigenteDesde(evento.target.value)}
            aria-invalid={intentado && errores.vigenteDesde ? true : undefined}
          />
        </Campo>

        <Campo
          etiqueta="Vigente hasta"
          id="poliza-hasta"
          obligatorio
          ayuda="No puede ser anterior a la fecha de inicio."
          error={intentado ? errores.vigenteHasta : undefined}
        >
          <input
            id="poliza-hasta"
            className="vl-input"
            type="date"
            value={vigenteHasta}
            min={vigenteDesde || undefined}
            onChange={(evento) => setVigenteHasta(evento.target.value)}
            aria-invalid={intentado && errores.vigenteHasta ? true : undefined}
          />
        </Campo>
      </div>

      <Campo
        etiqueta="Documento de la póliza"
        id="poliza-archivo"
        obligatorio
        ayuda="PDF, JPG o PNG. Máximo 5 MB."
        error={errorArchivo ?? undefined}
      >
        <input
          id="poliza-archivo"
          className="vl-input m1-poliza__archivo-input"
          type="file"
          accept={ACEPTAR_ARCHIVO_POLIZA}
          onChange={(evento) => {
            setArchivo(evento.target.files?.[0] ?? null)
            setError(null)
          }}
          aria-invalid={errorArchivo ? true : undefined}
        />
      </Campo>

      {archivo && !errorArchivo && (
        <p className="vl-text-caption">
          {archivo.name} · {formatoTamanoArchivo(archivo.size)}
        </p>
      )}
    </DialogoConfirmacion>
  )
}
