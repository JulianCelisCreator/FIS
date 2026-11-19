/** Marca de Velora: la pista con la línea de meta en amarillo de señal. La usan la landing y la aplicación. */
export function MarcaVelora() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect x="5" y="9" width="30" height="22" rx="11" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <rect
        x="10"
        y="14"
        width="20"
        height="12"
        rx="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity=".45"
      />
      <path d="M20 9v22" stroke="var(--signal)" strokeWidth="2.2" />
      <path d="M5 20h30" stroke="currentColor" strokeWidth="1" opacity=".35" />
    </svg>
  )
}
