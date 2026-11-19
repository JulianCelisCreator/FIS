import { Alerta, Campo, ListaDatos, TarjetaPersona } from '../../../shared/ui/componentes.tsx'
import type { PatinadorM5 } from '../types/m5.types.ts'
import { acudientesDe, detallePatinador } from '../utils/patinador.ts'

/**
 * Elegir patinador. El Administrador y el Contador buscan entre todos; el
 * Acudiente y el Patinador ven directamente su lista, sin buscador (wireframe).
 */
export function SelectorPatinador({
  id,
  etiqueta,
  ayuda,
  puedeBuscar,
  texto,
  alEscribir,
  candidatos,
  cargando,
  error,
  seleccionado,
  alSeleccionar,
  sinResultados,
}: {
  id: string
  etiqueta: string
  ayuda?: string
  puedeBuscar: boolean
  texto: string
  alEscribir: (texto: string) => void
  candidatos: PatinadorM5[]
  cargando: boolean
  error: string | null
  seleccionado: PatinadorM5 | null
  alSeleccionar: (patinador: PatinadorM5 | null) => void
  sinResultados: string
}) {
  if (seleccionado) {
    return (
      <div className="vl-stack">
        <TarjetaPersona nombre={seleccionado.nombre} detalle={detallePatinador(seleccionado)} />
        <button className="vl-button vl-button--ghost vl-button--sm app-boton-inicio" type="button" onClick={() => alSeleccionar(null)}>
          Elegir otro patinador
        </button>
      </div>
    )
  }

  return (
    <div className="vl-stack">
      {puedeBuscar && (
        <Campo etiqueta={etiqueta} id={id} ayuda={ayuda}>
          <input
            id={id}
            className="vl-input"
            type="search"
            placeholder="Nombre o número de documento"
            value={texto}
            onChange={(evento) => alEscribir(evento.target.value)}
            aria-describedby={ayuda ? `${id}-ayuda` : undefined}
          />
        </Campo>
      )}
      {error && <Alerta tono="error">{error}</Alerta>}
      {cargando && <p className="vl-text-caption" role="status">Buscando patinadores…</p>}
      {!cargando && !error && candidatos.length === 0 && <p className="vl-text-body-sm">{sinResultados}</p>}
      {!cargando && candidatos.length > 0 && (
        <ul className="vl-stack app-lista-opciones" aria-label="Patinadores">
          {candidatos.map((patinador) => (
            <li key={patinador.id}>
              <button className="vl-card vl-card--selectable app-opcion" type="button" onClick={() => alSeleccionar(patinador)}>
                <TarjetaPersona nombre={patinador.nombre} detalle={detallePatinador(patinador)} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Datos del patinador elegido que muestran ambas pantallas. */
export function DatosPatinador({ patinador }: { patinador: PatinadorM5 }) {
  return (
    <ListaDatos
      filas={[
        ['Acudiente', acudientesDe(patinador)],
        ['Plan actual', patinador.planActual ? patinador.planActual.nombre : 'Sin plan'],
      ]}
    />
  )
}
