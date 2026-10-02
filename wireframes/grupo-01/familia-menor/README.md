# W05 · Familia del menor (vinculación, autorización y póliza)

| Campo | Valor |
|---|---|
| Página | `familia-menor.html` |
| Módulo | M1 · Usuarios y Acceso |
| RF | M1-11 Vinculación + M1-09 Autorización del acudiente + M1-10 Gestión de póliza (origen PDF RF-M1-02) |
| Actor | Adm gestiona todo (vista mostrada); Acu solo sus patinadores |
| Herramienta | HTML con `design-system/ps.css` y `ps.js` + `../assets/grupo-01.js`. Servir por HTTP: `python3 -m http.server 8000` desde la raíz |

## Plan de componentes respetado (spec §6 W05)

`AppShell` privada, `PlayerProfileCard compact` + `DescriptionList`, `Select` vincular (M1-11), `Checkbox` autorización + fecha (M1-09), `FormField` + `TextInput`/`DateInput` póliza (M1-10), `Button primary` Guardar, `StatusBadge` Bloqueado/Habilitado, `Stepper` Vinculado → Autorizado → Póliza → Habilitado.

## Decisiones

- Estado mostrado: Vinculado completado, Autorizado en curso, Póliza pendiente → `Bloqueado` (error). Con autorización + póliza pasa a `Habilitado` (success).
- Vínculo Sofía Ramírez (9 años) ↔ Carolina Ramírez (madre, carolina.ramirez@example.com); principal “Vincular”, secundaria “Desvincular” (Confirm).
- Autorización con `Checkbox` + `DateInput` (21/09/2026); póliza Sura POL-882341 01/01/2026 a 31/12/2026 con adjunto póliza.pdf y “Reemplazar póliza”. Sin Eliminar.
- Variante Acu (no dibujada aparte): solo sus patinadores, solo lectura salvo autorización y póliza; el menor no confirma por sí mismo.

## Brechas (spec §9, protocolo skill §5)

| Brecha | Solución temporal |
|---|---|
| `Select searchable` de usuarios no existe como tal (`ps-combobox` es un stub sin búsqueda) | `Select` simple nativo + nota visible “Temporal” en la página |
| `RequestTracker` para el menor | `Stepper` + `StatusBadge`, como prevé la spec |

## Verificación

- [x] Solo `ps-*` existente + tokens capa 2; sin `style=`.
- [x] Estado con ícono + texto (`patinador/bloqueado` resuelve error desde el catálogo).
- [x] Español, fechas DD/MM/AAAA, sin “Eliminar”.
- [x] 375 / 768 / 1280 sin scroll horizontal de página (`Stepper` vertical en móvil por el DS).
- [x] Contenido realista §3; RF citados en la página.
