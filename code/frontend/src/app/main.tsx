import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Identidad de Velora (DESIGN.md): mismas fuentes y tokens que la landing.
import '@fontsource/archivo/latin-400.css'
import '@fontsource/archivo/latin-600.css'
import '@fontsource/archivo/latin-700.css'
import '@fontsource/archivo/latin-800.css'
import '@fontsource/archivo/latin-900.css'
import '@fontsource/spline-sans-mono/latin-400.css'
import '@fontsource/spline-sans-mono/latin-500.css'
import '@fontsource/spline-sans-mono/latin-600.css'
import '../styles/tokens.css'
import '../styles/app.css'
import { ProveedorSesion } from '../shared/sesion/proveedor-sesion.tsx'
import { Aplicacion } from './aplicacion.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorSesion>
      <Aplicacion />
    </ProveedorSesion>
  </StrictMode>,
)
