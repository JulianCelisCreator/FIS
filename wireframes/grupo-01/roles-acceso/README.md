# W04 · Roles y acceso

| Campo | Valor |
|---|---|
| Página | `roles-acceso.html` |
| Módulo | M1 · Usuarios y Acceso |
| RF | M1-06 Gestión de roles de usuario + M1-07 Control de acceso por rol (la UI solo muestra el resultado) |
| Actor | Adm gestiona (Daniela Martínez); ejemplo denegado para Profesor |
| Herramienta | HTML con `design-system/ps.css` y `ps.js` + `../assets/grupo-01.js`. Servir por HTTP: `python3 -m http.server 8000` desde la raíz |

## Plan de componentes respetado (spec §6 W04)

`AppShell` privada, `DataTable` roles, `Select` asignación + `Button secondary`, `DescriptionList` matriz solo lectura, `Alert error` denegado. Sin crear permisos nuevos en el wireframe.

## Decisiones

- Asignar a Andrés Torres el rol Profesor (principal `Button secondary`); secundaria “Quitar rol” (ghost) con `Dialog/Confirm`.
- Tabla de 7 roles con n.º de usuarios (Profesor 6); sin badges ni tonos en los roles.
- Matriz `DescriptionList` de solo lectura (p. ej. Contador: pagos sí, usuarios no).
- Ejemplo denegado: “No tienes acceso a Gestión de usuarios”, sin acción destructiva.
- Privacidad evidenciada: Profesor solo sus grupos; Patinador solo sus datos; Contador solo finanzas; Visitante nada interno.

## Brechas

Ninguna.

## Verificación

- [x] Solo `ps-*` existente + tokens capa 2; sin `style=`.
- [x] Sin badges de dominio; roles sin color de estado.
- [x] Español, sin “Eliminar”.
- [x] `data-label` en todas las celdas; 375 / 768 / 1280 sin scroll horizontal de página.
- [x] Contenido realista §3; RF citados en la página.
