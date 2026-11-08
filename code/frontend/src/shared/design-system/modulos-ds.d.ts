// Módulos JavaScript del design system, resueltos por el alias @ds de vite.config.ts.

declare module '@ds/js/format.js' {
  /** $ 180.000 (pesos sin decimales). */
  export function formatCOP(valor: number): string
  /** 'AAAA-MM-DD' → 'DD/MM/AAAA'. */
  export function formatDate(iso: string): string
}

declare module '@ds/components/status-badge/status-badge.js' {}
declare module '@ds/components/avatar/avatar.js' {}
declare module '@ds/components/icon/icon.js' {}
