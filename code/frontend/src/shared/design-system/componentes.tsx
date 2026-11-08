// Componentes React con el marcado y las clases del design system (design-system/).
// Los contenedores (shell, campo, pestañas, diálogo) se generan aquí porque sus
// web components moverían los nodos que maneja React; el aspecto es el mismo.
import { useEffect, useRef, type ReactNode } from 'react'

/** Campo de formulario con etiqueta, ayuda y error (FormField). */
export function Campo({
  etiqueta,
  id,
  ayuda,
  error,
  obligatorio = false,
  children,
}: {
  etiqueta: string
  id: string
  ayuda?: string
  error?: string | null
  obligatorio?: boolean
  children: ReactNode
}) {
  return (
    <div className="ps-field">
      <label className="ps-field__label" htmlFor={id}>
        {etiqueta}
        {obligatorio && (
          <>
            <span className="ps-field__req" aria-hidden="true">*</span>
            <span className="ps-text-caption"> obligatorio</span>
          </>
        )}
      </label>
      {children}
      {ayuda && <p className="ps-field__help" id={`${id}-ayuda`}>{ayuda}</p>}
      {error && <p className="ps-field__error" role="alert" id={`${id}-error`}>{error}</p>}
    </div>
  )
}

type TonoAlerta = 'info' | 'success' | 'warning' | 'error'
const ICONO_ALERTA: Record<TonoAlerta, string> = {
  info: 'info',
  success: 'check-circle',
  warning: 'alert-triangle',
  error: 'x-circle',
}

/** Aviso en línea (Alert). */
export function Alerta({ tono, titulo, children }: { tono: TonoAlerta; titulo?: string; children?: ReactNode }) {
  return (
    <div className={`ps-alert ps-alert--${tono}`} role={tono === 'error' ? 'alert' : 'status'}>
      <ps-icon name={ICONO_ALERTA[tono]} />
      <div>
        {titulo && <p className="ps-alert__title">{titulo}</p>}
        {children}
      </div>
    </div>
  )
}

/** Estado con ícono y texto del catálogo del design system (StatusBadge). */
export function Insignia({ entidad, estado }: { entidad: string; estado: string }) {
  return <ps-status-badge entity={entidad} status={estado} />
}

/** Pestañas controladas por React con el marcado de ps-tabs. */
export function Pestanas<T extends string>({
  etiqueta,
  opciones,
  activa,
  alCambiar,
}: {
  etiqueta: string
  opciones: { id: T; texto: string }[]
  activa: T
  alCambiar: (id: T) => void
}) {
  const moverCon = (indice: number, tecla: string) => {
    if (tecla !== 'ArrowRight' && tecla !== 'ArrowLeft') return
    const paso = tecla === 'ArrowRight' ? 1 : -1
    alCambiar(opciones[(indice + paso + opciones.length) % opciones.length].id)
  }
  return (
    <ps-tabs role="tablist" aria-label={etiqueta}>
      <div className="ps-tabs__list">
        {opciones.map((opcion, indice) => (
          <button
            key={opcion.id}
            id={`pestana-${opcion.id}`}
            className="ps-tabs__tab"
            role="tab"
            type="button"
            aria-selected={opcion.id === activa}
            aria-controls={`panel-${opcion.id}`}
            tabIndex={opcion.id === activa ? 0 : -1}
            onClick={() => alCambiar(opcion.id)}
            onKeyDown={(evento) => moverCon(indice, evento.key)}
          >
            {opcion.texto}
          </button>
        ))}
      </div>
    </ps-tabs>
  )
}

/**
 * Diálogo de confirmación (Dialog/Confirm) sobre <dialog> nativo. Se abre
 * cuando `abierto` es true; Escape o «Cancelar» llaman a `alCancelar`.
 */
export function DialogoConfirmacion({
  abierto,
  titulo,
  textoConfirmar,
  ocupado = false,
  alConfirmar,
  alCancelar,
  children,
}: {
  abierto: boolean
  titulo: string
  textoConfirmar: string
  ocupado?: boolean
  alConfirmar: () => void
  alCancelar: () => void
  children: ReactNode
}) {
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const nodo = dialogo.current
    if (!nodo) return
    if (abierto && !nodo.open) nodo.showModal()
    if (!abierto && nodo.open) nodo.close()
  }, [abierto])

  return (
    <ps-dialog variant="confirm">
      <dialog
        ref={dialogo}
        aria-labelledby="dialogo-titulo"
        onCancel={(evento) => {
          evento.preventDefault()
          if (!ocupado) alCancelar()
        }}
      >
        <h3 id="dialogo-titulo" className="ps-text-heading-h4">{titulo}</h3>
        <div className="ps-stack">{children}</div>
        <div className="ps-dialog__actions">
          <button className="ps-button ps-button--secondary" type="button" disabled={ocupado} onClick={alCancelar}>
            Cancelar
          </button>
          <button
            className="ps-button ps-button--primary"
            type="button"
            aria-disabled={ocupado || undefined}
            onClick={() => !ocupado && alConfirmar()}
          >
            {ocupado ? 'Guardando…' : textoConfirmar}
          </button>
        </div>
      </dialog>
    </ps-dialog>
  )
}

/** Tarjeta de patinador (PlayerProfileCard compacta). */
export function TarjetaPersona({ nombre, detalle }: { nombre: string; detalle: string }) {
  return (
    <div className="ps-player-card">
      <ps-avatar name={nombre} />
      <div>
        <p className="ps-player-card__name">{nombre}</p>
        <p className="ps-player-card__meta">{detalle}</p>
      </div>
    </div>
  )
}

/** Lista de descripción (DescriptionList). */
export function ListaDatos({ filas }: { filas: [string, ReactNode][] }) {
  return (
    <dl className="ps-dl">
      {filas.map(([titulo, valor]) => (
        <div key={titulo}>
          <dt>{titulo}</dt>
          <dd>{valor}</dd>
        </div>
      ))}
    </dl>
  )
}
