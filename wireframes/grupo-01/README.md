# Grupo 01 · M1 Usuarios y Acceso

Wireframes del módulo 1, construidos solo con el Design System (`design-system/ps.css` y `ps.js`).

```bash
# desde la raíz del repositorio
python3 -m http.server 8000
# http://localhost:8000/wireframes/grupo-01/
```

## Páginas (spec `docs/specs/m1-usuarios-acceso.md` §4)

| Página | Carpeta | RF | Estado |
|---|---|---|---|
| Acceso | `acceso/` | M1-01, M1-02 | Borrador |
| Verificación y recuperación | `verificacion-recuperacion/` | M1-04, M1-08 | Pendiente |
| Usuarios | `usuarios/` | M1-05, M1-01, M1-04 | Pendiente |
| Roles y acceso | `roles-acceso/` | M1-06, M1-07 | Pendiente |
| Familia del menor | `familia-menor/` | M1-11, M1-09, M1-10 | Pendiente |
| Activación de profesor | `activacion-profesor/` | M1-12, M1-03, M1-07 | Pendiente |

En `assets/grupo-01.css` hay estilos solo de disposición con tokens capa 2. No define color, tipografía, bordes ni sombras.

## Convenciones

- Todo se compone con `design-system/`; `assets/grupo-01.css` solo define disposición.
- Estados solo con `StatusBadge` (ícono + texto), nunca color a mano. Verbos `Desactivar/Anular`, nunca `Eliminar`.
- La tarjeta “Notas del wireframe” y las líneas `RF-M1-xx` son anotaciones para revisión, no parte de la interfaz.
- Revisar en 375, 768 y 1280 px.
