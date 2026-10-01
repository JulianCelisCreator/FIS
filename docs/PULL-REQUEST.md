# Propuesta de Pull Request a `main`

> Archivo de apoyo: copia este contenido como descripción del PR en GitHub.
> Rama: `designsystem/tokensandcomponents` → `main`.
> Alcance real de la rama: **111 archivos, +3517 / −2** vs `main`
> (100 en `design-system/`, 6 en `docs/`, 4 en `.agents/`, 1 `README.MD`).

---

## Título sugerido

```text
Agregar design system (tokens y componentes F0–F6), guía de uso y ejemplo M1-01
```

## Descripción sugerida

### Qué agrega

**1. `design-system/` — implementación de la spec `docs/specs/design-system.md` (F0–F6)**

- **F0 Fundación**: `tokens.css` (115 tokens + 3 derivados con `color-mix`), `base/`
  (reset, foco global, alias responsivos, tipografía `.ps-text-*`, layout),
  `js/` (`format.js`, `status-catalog.js`, `capacity.js`, `aria-disabled.js`),
  `icons/sprite.svg` provisional, `ps.css` / `ps.js` (puntos de entrada),
  `scripts/check-*` y `tests/` (15 pruebas con `node --test`).
- **F1–F6**: ~45 componentes según la matriz de la spec (átomos, formularios,
  retroalimentación, navegación, datos/dominio y calendario), con `SPEC.md` en
  `button`, `capacity-meter` y `dialog`, y páginas de catálogo en `catalog/`.
- Decisiones aplicadas: HTML nativo + clases, Custom Elements solo para
  comportamiento (light DOM, sin Shadow), estado en atributos nativos/ARIA
  (sin clases `.is-*`), `@layer`, breakpoints literales, sin compilación,
  valor canónico vs presentación (ADR-07).

**2. `docs/` — documentación y ejemplo**

- `docs/specs/design-system.md`: la spec implementada.
- `docs/REQUIREMENTS.md`: trazabilidad de los 77 RF (puente requisitos ↔ DS ↔ pruebas).
- `docs/EXPLANATION.md`: guía de uso del DS (qué es cada pieza, por qué,
  cómo elegir componentes por tipo de RF, cómo debe verse una pantalla).
- `docs/example/login.html`: pantalla Ingresar/Registrarse del **RF M1-01**
  solo con componentes del DS (minimalista, responsive 375/768/1280).
- `docs/CHANGELOG.md`: historial v0.1.0–v0.1.3 (incluye correcciones:
  idempotencia de Custom Elements, sprite relativo al módulo, tabs y AppShell).

**3. `.agents/skills/DesignSystem/`** — skill fuente de verdad
(`tokens.md`, `components.md`, `status-and-formats.md`).

### Cómo probarlo

```bash
# Catálogo y ejemplo (desde la raíz; no funciona con file://)
python3 -m http.server 8000
# http://localhost:8000/design-system/catalog/
# http://localhost:8000/docs/example/login.html

# Verificación automática (sin dependencias)
cd design-system
node scripts/check-raw-values.mjs   # 52 archivos, 0 infracciones
node scripts/check-tokens-sync.mjs  # 115 tokens + 3 derivados
node scripts/check-contrast.mjs     # todo ≥ 4.5:1 / 3:1
node --test tests/*.test.mjs        # 15 pass
```

### Capturas (adjuntar al PR según `README.MD`)

- `design-system/catalog/button.html` en 1280 y 375.
- `docs/example/login.html` en 1280 y 375 (pestañas Ingresar/Registrarse).

### Notas para revisores

- Es un cambio **transversal** (no de la carpeta de un grupo): requiere acuerdo
  entre grupos, ya que `design-system/` será consumido por M1–M6 vía `ps.css`/`ps.js`.
- Decisiones pendientes de la spec §14 (navegadores, librería de íconos, Inter
  local, `--z-*`, Playwright, prefijo `ps`): quedan documentadas, no bloquean.
- Tras el merge, borrar la rama.

### Checklist

- [ ] Un integrante de otro grupo revisó y aprobó.
- [ ] Capturas 1280 + 375 adjuntas.
- [ ] Checks y pruebas en verde (ver comandos arriba).
- [ ] Solo se agregan archivos de `design-system/`, `docs/` y `.agents/`.
