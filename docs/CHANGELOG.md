# Changelog del Design System

Formato semántico. Cada entrada cita RF o decisión.

## [0.1.0] — 2026-09-30
- F0 Fundación: `tokens.css` (tokens.md §2–§8), `base/*` (alias responsivos, tipografía `.ps-text-*`, layout), `format.js` (§7.7), `status-catalog.js` (status-and-formats §3 + precedencia M5-12), `aria-disabled.js` (§7.5), `capacity.js` (regla M3-02), `sprite.svg` provisional (§7.8), esqueleto de catálogo, `check-*` y pruebas. RF transversales: formatos M4-13, M5-04; estados §5.1.
- F1 Átomos: Button/IconButton (§9.1), Link, Icon, Badge, StatusBadge (sin tono libre), Avatar (iniciales), Skeleton, TimeDisplay, CurrencyDisplay. RF transversal + M1-02, M3-02, M4-11/14/16, M5-12/13/16, M6-06/08.
- F2 Formularios: TextInput, Textarea, Select (+ps-combobox diferible), Checkbox, RadioGroup, Switch (`role=switch`), FormField (`ps-field`), CurrencyInput/TimeInput/DateInput (ADR-07 valor canónico), TransactionFields (orden fijo monto→fecha→medio→referencia). RF M1-01, M2-01/13/14, M3-05, M4-02/04/13/18, M5-01/04/06/09/10/13, M6-02/03/07/08.
- F3 Retroalimentación: Alert, Toast (`ps-toast-region` + `PS.toast`, popover), Dialog Confirm/ConfirmWithReason (§9.3, auditoría M5-11/M4-18)/Form (bottom sheet móvil), Menu (flechas), Tooltip, EmptyState (sin-datos/sin-resultados/reporte-vacío/error). RF M3-02/04, M4-12, M5-03/11, M6-03/04/06/08.
- F4 Navegación: Card, DescriptionList, Breadcrumb (←Volver móvil), Stepper (H→V), Timeline, Tabs (teclado), Pagination (compacta móvil), AppShell (drawer móvil, variante pública, nav por slot). RF M1-01/02/03, M2-02, M3-06, M4-06–11, M5-16, M4-14.
- F5 Datos y dominio: CapacityMeter (§9.2, 7 casos), AuditEntry, FilterBar (chips + dialog móvil), DataTable (orden/selección/tarjeta móvil con `data-label`, estados loading/empty/error), RankingTable, PlayerProfileCard (compact/full), KPICard (+KPIGrid 6 mín), RequestTracker, PlayerContextSwitcher (oculto si 1), ValidationChecklist (4 filas fijas), GroupCard (Lleno→`aria-disabled`), ExportMenu (pdf/xlsx/csv, loading≤10s/5s). RF M2-02/04/10, M3-02/05, M4-07–11/14–19, M5-06/12–18, M6-01/04/05.
- F6 Calendario: `ps-calendar` month/week/day → agenda móvil; clase=neutral, competencia=info (+ícono/etiqueta). RF M3-06, M4-04.
- Verificación: `check-raw-values` (52 archivos) · `check-tokens-sync` (115+3) · `check-contrast` · 15 pruebas `node --test` en verde. DSR-01–12 cubiertos salvo supuestos §14 pendientes (navegadores, íconos, Inter, z-index, Playwright, consumo, stack, prefijo `ps`).

## [0.1.1] — 2026-09-30
- `AppShell` conserva hijos con `data-slot` (brand/nav/content) en vez de descartarlos; `docs/example/login.html` (M1-01) lo usa. Sin RF nuevo: corrección de comportamiento del compuesto.

## [0.1.2] — 2026-09-30
- Corrige doble render al reubicar slots: `connectedCallback` idempotente (`data-ps-built`) en field, dialog, app-shell, tabs, menu, tooltip, filter-bar, data-table, group-card, player-switcher y export-menu. Causaba etiquetas/ayudas duplicadas.
- `ps-icon` y `ps-status-badge` resuelven `sprite.svg` relativo al módulo (`import.meta.url`), no al documento: los íconos ya cargan fuera de `catalog/` (p. ej. `docs/example/`).
- Ejemplo M1-01 minimalista: columna centrada, sin breadcrumb ni alertas permanentes ni toast demo; la nota de menor bajó a ayuda del campo.

## [0.1.3] — 2026-09-30
- `Tabs`: resetea la apariencia nativa de `<button>` (fondo transparente, sin borde, indicador inferior); antes se veía el gris por defecto del navegador.
- `AppShell`: oculta la hamburguesa cuando el slot `nav` está vacío (variante pública); la navegación aportada conserva la clase de layout.
- Ejemplo M1-01: tabs centradas con separación inferior (`justify-content + margin-bottom` con tokens, solo en la página).
