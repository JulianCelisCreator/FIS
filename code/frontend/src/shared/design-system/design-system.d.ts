// Tipos del design system del repositorio (design-system/), que está en JavaScript.
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

type ElementoDS<Atributos = object> = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> &
  Atributos

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      // Web components «hoja» que se cargan (no reciben hijos de React).
      'ps-status-badge': ElementoDS<{ entity: string; status: string }>
      'ps-avatar': ElementoDS<{ name: string; size?: 'sm' | 'md' | 'lg' }>
      'ps-icon': ElementoDS<{ name: string; size?: 'sm' | 'md' | 'lg' }>
      // Contenedores: no se cargan sus scripts (moverían los nodos de React);
      // React genera su marcado y el CSS del design system los estiliza por etiqueta.
      'ps-app-shell': ElementoDS
      'ps-tabs': ElementoDS
      'ps-dialog': ElementoDS<{ variant?: 'confirm' | 'form' | 'reason' }>
      'ps-data-table': ElementoDS
    }
  }
}
