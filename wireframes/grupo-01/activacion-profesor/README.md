# W06 · Activación de profesor y cierre de sesión

| Campo | Valor |
|---|---|
| Página | `activacion-profesor.html` |
| Módulo | M1 · Usuarios y Acceso |
| RF | M1-12 Activación de cuenta de profesor + M1-03 Cierre de sesión + M1-07 transversal (origen PDF RF-M1-03) |
| Actor | Prof nuevo en primer ingreso (Andrés Torres) + Adm que creó la cuenta y ve el estado |
| Herramienta | HTML con `design-system/ps.css` y `ps.js` (vía `../assets/grupo-01.js`). Servir por HTTP: `python3 -m http.server 8000` desde la raíz |

## Plan de componentes respetado (spec §6 W06)

`AppShell` privada, `Stepper`, `StatusBadge` profesor, `DataTable` mínima de por activar, menú de usuario + `Button` cerrar, `Toast success`. Sin activar manualmente.

## Decisiones

- Vista del Prof: cuenta creada por admin@escuela.com el 20/09/2026 (`Por registrar`), primer `Ingresar` que dispara la activación automática, resultado `Cuenta activa` el 21/09/2026 con `Alert success`.
- Los Toast “Cuenta activada” y “Sesión cerrada” se disparan con las acciones reales (ingresar / confirmar cierre).
- Cierre con `Dialog/Confirm` simple, sin motivo.
- Tabla Adm con 2 profesores (Andrés `Por registrar`, Laura `Cuenta activa`): evidencia que el Adm ve el estado sin activación manual.
- Prof `Por registrar` sin gestión; tras activarse solo sus grupos y patinadores.

## Brechas

Ninguna.

## Verificación

- [x] Solo `ps-*` existente + tokens capa 2; sin `style=`.
- [x] Estados con ícono + texto (`profesor/por-registrar` neutral, `profesor/cuenta-activa` success).
- [x] Español, fechas DD/MM/AAAA, sin “Eliminar”.
- [x] `data-label` en todas las celdas; 375 / 768 / 1280 sin scroll horizontal de página.
- [x] Contenido realista §3; RF citados en la página.
