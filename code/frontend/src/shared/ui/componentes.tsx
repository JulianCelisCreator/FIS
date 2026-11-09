// Componentes base de la aplicación con la identidad de Velora (DESIGN.md):
// superficies planas, líneas de 1 px, radio de 2 px y amarillo de señal solo
// en la acción principal. Los estilos están en src/styles/app.css.
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icono, type NombreIcono } from './icono.tsx'

/** Campo de formulario con etiqueta, ayuda y error. */
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
    <div className="vl-field">
      <label className="vl-field__label" htmlFor={id}>
        {etiqueta}
        {obligatorio && (
          <>
            <span className="vl-field__req" aria-hidden="true">*</span>
            <span className="vl-text-caption"> obligatorio</span>
          </>
        )}
      </label>
      {children}
      {ayuda && <p className="vl-field__help" id={`${id}-ayuda`}>{ayuda}</p>}
      {error && <p className="vl-field__error" role="alert" id={`${id}-error`}>{error}</p>}
    </div>
  )
}

type Tono = 'info' | 'success' | 'warning' | 'error' | 'neutral'

const ICONO_TONO: Record<Tono, NombreIcono> = {
  info: 'info',
  success: 'correcto',
  warning: 'advertencia',
  error: 'error',
  neutral: 'neutro',
}

/** Aviso en línea. */
export function Alerta({ tono, titulo, children }: { tono: Exclude<Tono, 'neutral'>; titulo?: string; children?: ReactNode }) {
  return (
    <div className={`vl-alert vl-alert--${tono}`} role={tono === 'error' ? 'alert' : 'status'}>
      <Icono nombre={ICONO_TONO[tono]} />
      <div>
        {titulo && <p className="vl-alert__title">{titulo}</p>}
        {children}
      </div>
    </div>
  )
}

/** Estados de los catálogos de M5 y M6 (REQUIREMENTS §5.1): texto e ícono, nunca solo color. */
const ESTADOS: Record<string, Record<string, [string, Tono]>> = {
  plan: { activo: ['Activo', 'success'], inactivo: ['Inactivo', 'neutral'] },
  cobro: { pendiente: ['Pendiente', 'warning'], pagado: ['Pagado', 'success'], anulado: ['Anulado', 'neutral'] },
  pago: { registrado: ['Registrado', 'success'], anulado: ['Anulado', 'neutral'] },
  cartera: { 'al-dia': ['Al día', 'success'], pendiente: ['Pendiente', 'warning'], vencido: ['Vencido', 'error'] },
  prestamo: {
    activo: ['Activo', 'info'],
    devuelto: ['Devuelto', 'success'],
    vencido: ['Vencido', 'error'],
    'perdida-dano': ['Pérdida o daño', 'error'],
  },
  uniforme: {
    'stock-normal': ['Stock normal', 'success'],
    'alerta-minimo': ['Alerta por cantidad mínima', 'warning'],
    inactiva: ['Inactiva', 'neutral'],
  },
  proveedor: { activo: ['Activo', 'success'], inactivo: ['Inactivo', 'neutral'] },
}

export function Insignia({ entidad, estado }: { entidad: string; estado: string }) {
  const [texto, tono] = ESTADOS[entidad]?.[estado] ?? [estado, 'neutral']
  return (
    <span className={`vl-badge vl-badge--${tono}`}>
      <Icono nombre={ICONO_TONO[tono]} />
      {texto}
    </span>
  )
}

/** Iniciales de una persona. */
export function Avatar({ nombre, tamano = 'md' }: { nombre: string; tamano?: 'sm' | 'md' }) {
  const iniciales = nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <span className={`vl-avatar vl-avatar--${tamano}`} aria-hidden="true">
      {iniciales}
    </span>
  )
}

/** Pestañas con navegación por flechas. */
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
    <div className="vl-tabs" role="tablist" aria-label={etiqueta}>
      {opciones.map((opcion, indice) => (
        <button
          key={opcion.id}
          id={`pestana-${opcion.id}`}
          className="vl-tabs__tab"
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
  )
}

/**
 * Diálogo modal sobre <dialog> nativo. Se abre cuando `abierto` es true; Escape
 * o el botón secundario llaman a `alCancelar`. Sin `textoConfirmar` solo muestra
 * el botón secundario (p. ej. «Cerrar»).
 */
export function DialogoConfirmacion({
  abierto,
  titulo,
  textoConfirmar,
  textoCancelar = 'Cancelar',
  variante = 'confirm',
  ocupado = false,
  alConfirmar,
  alCancelar,
  children,
}: {
  abierto: boolean
  titulo: string
  textoConfirmar?: string
  textoCancelar?: string
  variante?: 'confirm' | 'form'
  ocupado?: boolean
  alConfirmar?: () => void
  alCancelar: () => void
  children: ReactNode
}) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()

  useEffect(() => {
    const nodo = dialogo.current
    if (!nodo) return
    if (abierto && !nodo.open) nodo.showModal()
    if (!abierto && nodo.open) nodo.close()
  }, [abierto])

  return (
    <dialog
      ref={dialogo}
      className={`vl-dialog vl-dialog--${variante}`}
      aria-labelledby={idTitulo}
      onCancel={(evento) => {
        evento.preventDefault()
        if (!ocupado) alCancelar()
      }}
    >
      <h2 id={idTitulo} className="vl-dialog__title">{titulo}</h2>
      <div className="vl-stack">{children}</div>
      <div className="vl-dialog__actions">
        <button className="vl-button vl-button--secondary" type="button" disabled={ocupado} onClick={alCancelar}>
          {textoCancelar}
        </button>
        {textoConfirmar && (
          <button
            className="vl-button vl-button--primary"
            type="button"
            aria-disabled={ocupado || undefined}
            onClick={() => !ocupado && alConfirmar?.()}
          >
            {ocupado ? 'Guardando…' : textoConfirmar}
          </button>
        )}
      </div>
    </dialog>
  )
}

/** Tarjeta de persona: iniciales, nombre y datos. */
export function TarjetaPersona({ nombre, detalle }: { nombre: string; detalle: string }) {
  return (
    <div className="vl-person">
      <Avatar nombre={nombre} />
      <div>
        <p className="vl-person__name">{nombre}</p>
        <p className="vl-person__meta">{detalle}</p>
      </div>
    </div>
  )
}

/** Lista de datos (término y valor). */
export function ListaDatos({ filas }: { filas: [string, ReactNode][] }) {
  return (
    <dl className="vl-dl">
      {filas.map(([titulo, valor]) => (
        <div key={titulo}>
          <dt>{titulo}</dt>
          <dd>{valor}</dd>
        </div>
      ))}
    </dl>
  )
}
