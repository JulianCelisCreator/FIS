// Íconos de la aplicación: un solo trazo (1.75) sobre retícula de 24 px.
import type { ReactNode } from 'react'

export type NombreIcono =
  | 'info'
  | 'correcto'
  | 'advertencia'
  | 'error'
  | 'neutro'
  | 'mas'
  | 'menu'
  | 'cerrar'
  | 'salir'

const TRAZOS: Record<NombreIcono, ReactNode> = {
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5v.5" />
    </>
  ),
  correcto: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.6 2.6L16 9.5" />
    </>
  ),
  advertencia: (
    <>
      <path d="M12 3.5 21.5 20h-19z" />
      <path d="M12 10v4.5M12 17v.5" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
  neutro: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </>
  ),
  mas: (
    <>
      <circle cx="12" cy="5.5" r=".9" />
      <circle cx="12" cy="12" r=".9" />
      <circle cx="12" cy="18.5" r=".9" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  cerrar: <path d="m6 6 12 12M18 6 6 18" />,
  salir: (
    <>
      <path d="M10 4.5H6.5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1H10" />
      <path d="M15 8.5 18.5 12 15 15.5M18.5 12H9.5" />
    </>
  ),
}

/** Ícono decorativo: el significado siempre va también en texto. */
export function Icono({ nombre }: { nombre: NombreIcono }) {
  return (
    <svg
      className="vl-icono"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {TRAZOS[nombre]}
    </svg>
  )
}