import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Design system del repositorio: todo el CSS y solo los web components «hoja».
import '@ds/ps.css'
import '@ds/components/status-badge/status-badge.js'
import '@ds/components/avatar/avatar.js'
import '@ds/components/icon/icon.js'
import '../shared/design-system/contenedores-inertes.ts'
import './aplicacion.css'
import { ProveedorSesion } from '../shared/sesion/proveedor-sesion.tsx'
import { Aplicacion } from './aplicacion.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorSesion>
      <Aplicacion />
    </ProveedorSesion>
  </StrictMode>,
)
