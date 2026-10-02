# W02 · Verificación y recuperación

| Campo | Valor |
|---|---|
| Página | `verificacion-recuperacion.html` |
| Módulo | M1 · Usuarios y Acceso |
| RF | M1-04 Verificación de correo electrónico + M1-08 Recuperación y cambio de contraseña |
| Actor | Usuario registrado no autenticado (p. ej. Carolina Ramírez, carolina.ramirez@example.com) |
| Herramienta | HTML con `design-system/ps.css` y `ps.js`. Servir por HTTP: `python3 -m http.server 8000` desde la raíz |

## Plan de componentes respetado (spec §6 W02)

`AppShell` pública, `Card` (dos bloques), `FormField` + `TextInput`, `StatusBadge` correo, `Button primary` + `Button ghost` (Reenviar), `Alert info/success` contextual, `Link` volver al acceso. 375 y 1280.

## Decisiones

- Columna estrecha centrada como W01 (`.g1-auth`, solo disposición).
- Bloque verificar: aviso “Te enviamos un enlace a carolina.ramirez@example.com el 21/09/2026”, campo código de 6 dígitos, principal “Verificar correo”, secundaria “Reenviar enlace” (ghost).
- El `Alert success` + badge Verificado bajo el formulario representan el estado tras verificar (la página estática cubre ambos estados exigidos).
- Bloque recuperar: correo + nueva + confirmación con ayuda “Mínimo 8 caracteres”; principal “Guardar nueva contraseña”; `Link` “Volver al acceso”.
- Datos reales §3; cuenta no verificada limita el acceso (nota contextual, sin inventar estados).

## BRECHA DEL DS → RESUELTA

```text
BRECHA DEL DS
RF: M1-04 (badge de correo)
Pantalla: W02 verificacion-recuperacion (también afecta W03)
Necesidad: StatusBadge con entidad "correo" y estados "Pendiente de verificación" (warning) y "Verificado" (success), según REQUIREMENTS.md §5.1 y spec M1 §5.
¿Existe con otro nombre? (qué revisé en components.md y en el catálogo): no. Revisé design-system/js/status-catalog.js (TABLE sin entidad "correo") y references/status-and-formats.md §3 (sin fila de correo). StatusBadge resuelve por catálogo y cae al neutro por defecto.
Componente o token más cercano: <ps-status-badge entity="correo" status="..."> tal como pide la spec; hoy renderiza tono neutral con la etiqueta cruda.
Propuesta (boceto en texto, sin estilos nuevos): agregar a status-catalog.js correo: {"pendiente-verificacion": ["Pendiente de verificación", "warning"], "verificado": ["Verificado", "success"]} y su fila en status-and-formats.md §3.
Urgencia (bloquea / puede esperar): puede esperar (el wireframe usa el marcado oficial y deja nota visible "Temporal"); debe resolverse antes del PR de W03.
```

**Resolución:** agregadas las entidades `correo` y `cuenta` a la skill (`references/status-and-formats.md` §3) y a `design-system/js/status-catalog.js`, con pruebas en `design-system/tests/status-catalog.test.mjs` (17/17 en verde). El wireframe ya usaba el marcado oficial, así que no cambió nada más que retirar la nota “Temporal”.

## Verificación

- [x] Solo `ps-*` existente + tokens capa 2; sin `style=`.
- [x] Español, fechas DD/MM/AAAA, sin “Eliminar”.
- [x] 375 / 768 / 1280 sin scroll horizontal.
- [x] Contenido realista §3; RF citados en la página.
- [x] `StatusBadge` correo resuelve etiqueta y tono desde el catálogo (brecha resuelta).
