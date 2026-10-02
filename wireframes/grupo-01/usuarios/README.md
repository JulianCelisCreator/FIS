# W03 · Gestión de usuarios y cuentas

| Campo | Valor |
|---|---|
| Página | `usuarios.html` |
| Módulo | M1 · Usuarios y Acceso |
| RF | M1-05 Gestión de usuarios y cuentas (core) + M1-01 alta por Adm + M1-04 badge de correo |
| Actor | Adm (Daniela Martínez, admin@escuela.com) |
| Herramienta | HTML con `design-system/ps.css` y `ps.js` + `../assets/grupo-01.js` (diálogos y menús). Servir por HTTP: `python3 -m http.server 8000` desde la raíz |

## Plan de componentes respetado (spec §6 W03)

`AppShell` privada Adm, `Breadcrumb`, `DataTable` + `FilterBar` + `Pagination`, `StatusBadge` (cuenta + correo + profesor), `Dialog/Form` crear/editar, `Dialog/Confirm` Desactivar/Activar, `Avatar`. Móvil: tarjetas con `data-label`, sin scroll horizontal.

## Decisiones

- Tabla con 6 filas que cubren todos los estados: Activa/Verificado (Daniela, Sofía, Laura), Activa/Pendiente (Carolina), Por registrar/Pendiente (Andrés Torres), Desactivada/Verificado (Juan Pablo González, con acción Activar en vez de Desactivar).
- Filtros: buscar (nombre o correo), rol, estado. `FilterBar` trae “Limpiar filtros” y versión móvil con diálogo del propio DS.
- La fila propia no ofrece Desactivar. Verbo Desactivar/Activar, nunca Eliminar.
- Diálogo crear con los 7 roles (el Adm sí puede crear Administrador, Contador y Fisioterapeuta) y ayuda “El Profesor queda Por registrar hasta su primer ingreso.”
- Punto abierto 7.1: M1-01 es el alta inicial (W01), M1-05 es la administración posterior (esta pantalla).

## Brechas

Ninguna. Las entidades `cuenta`, `correo` y `profesor` ya resuelven etiqueta y tono desde `status-catalog.js`.

## Verificación

- [x] Solo `ps-*` existente + tokens capa 2; sin `style=`.
- [x] Estados con ícono + texto; Desactivada en neutral.
- [x] Español, fechas DD/MM/AAAA, sin “Eliminar”.
- [x] `data-label` en todas las celdas; 375 / 768 / 1280 sin scroll horizontal de página.
- [x] Contenido realista §3; RF citados en la página.
- [x] Solo el Adm ve la pantalla (Contador sin gestión de usuarios por M6-03).
