# W01 · Acceso (ingresar / crear cuenta)

| Campo | Valor |
|---|---|
| Página | `acceso.html` |
| Módulo | M1 · Usuarios y Acceso |
| RF | M1-01 Registro de usuario + M1-02 Inicio de sesión de usuario (origen PDF RF-M1-01) |
| Actor | Visitante / no autenticado (Patinador, Acudiente, Profesor, Visitante) |
| Herramienta | HTML con `design-system/ps.css` y `ps.js`, estructura de `docs/example/login.html`. Servir por HTTP: `python3 -m http.server 8000` desde la raíz |

## Plan de componentes respetado (spec §6 W01)

`AppShell` pública, `Tabs` Ingresar/Registrarse, `FormField` + `TextInput` + `Select` (rol solo con las 4 opciones), `Button primary lg` ancho completo, `Link` a W02. Sin `Breadcrumb`, sin `Alert` permanente, sin toasts demo.

## Decisiones

- Columna estrecha centrada (`.g1-auth` en `../assets/grupo-01.css`, solo disposición con tokens capa 2).
- Ayuda del campo rol: “Si registras a un menor de edad, necesitarás su autorización y su póliza vigente.”
- Datos reales: `Sofía Ramírez`, `sofia@example.com`. Fechas DD/MM/AAAA donde apliquen.
- Errores solo tras intento fallido con `ps-field error` (correo duplicado, credenciales inválidas). No hay badges permanentes en esta pantalla.
- Privacidad: AppShell pública sin navegación interna ni datos de patinadores. Administrador, Contador y Fisioterapeuta no aparecen en el `Select` (solo los crea el Adm en W03).

## Brechas

Ninguna. Todo se resolvió con componentes existentes del catálogo.

## Verificación

- [x] Solo `ps-*` existente + tokens capa 2; sin `style=`.
- [x] `StatusBadge` no aplica (sin estados permanentes); no se inventan tonos.
- [x] Español, fechas DD/MM/AAAA, sin “Eliminar”.
- [x] 375 / 768 / 1280 sin scroll horizontal (columna centrada, tabs con scroll interno, botón ancho completo).
- [x] Contenido realista §3; RF citados en la página.
