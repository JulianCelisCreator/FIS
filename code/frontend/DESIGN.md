---
name: Velora
description: Landing pública de Velora, plataforma de gestión para escuelas y clubes de patinaje de velocidad. Torre de cronometraje sobre pista azul.
colors:
  rink: "#0a2f8f"
  rink-deep: "#061b52"
  rink-black: "#030d28"
  rink-bright: "#1f5cff"
  ice: "#edf3ff"
  ice-deep: "#dbe6ff"
  chalk: "#f8faff"
  ink: "#071433"
  ink-soft: "#33456e"
  muted: "#526489"
  muted-on-dark: "#bac9ee"
  line: "#b8c7e8"
  signal: "#ffd21e"
  signal-deep: "#d9a900"
  alert: "#ff6a5c"
  alert-ink: "#b3261e"
  ok: "#6ff2b2"
  ok-ink: "#0a6b4d"
  white: "#f7f9ff"
typography:
  display:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "clamp(3.2rem, 7vw, 6rem)"
    fontWeight: 800
    lineHeight: 1
  headline:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "clamp(2.25rem, 4.25vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1.05
  title:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "0.98rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Spline Sans Mono, ui-monospace, Consolas, monospace"
    fontSize: "0.72rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.1em"
rounded:
  sm: "2px"
spacing:
  page-pad: "clamp(1.25rem, 4vw, 4.5rem)"
  section-pad: "clamp(4.5rem, 9vw, 8.5rem)"
  header-h: "72px"
  page-max: "1320px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.rink-black}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0.72rem 1.25rem"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.white}"
    textColor: "{colors.rink-black}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0.72rem 1.25rem"
    height: "44px"
  button-ghost-hover:
    textColor: "{colors.signal}"
---

# Design System: Velora

## Overview

**Creative North Star: "The Timing Tower"**

La landing es una torre de cronometraje sobre una pista azul. La pista y los parciales son la estructura y la prueba: el visitante entiende la operación de la escuela como una medición, no como una planilla ni como un hero genérico de SaaS. El sistema es preciso, denso en datos reales y sobrio en decoración; la energía viene del contraste entre el azul de pista y el amarillo de señal, nunca de gradientes, brillos o efectos de neón.

La profundidad es plana. Las superficies se separan con bordes de 1–2 px, cambios de fondo entre rink, ice y chalk, y paneles de control en lugar de tarjetas. Una sola sombra (`--shadow-panel`) se reserva para el tablero de cronometraje principal. Los datos de muestra siempre van rotulados.

**Key Characteristics:**
- Fondo azul de pista (rink) con líneas de carril finas y marcas de medición.
- Tipografía industrial ancha y pesada en titulares; números y etiquetas en mono tabular.
- Amarillo de señal (`signal`) como único acento de acción.
- Paneles, parrillas y líneas en lugar de tarjetas con sombra.
- Movimiento sobrio con curva `cubic-bezier(0.16, 1, 0.3, 1)`; se suspende con `prefers-reduced-motion`.

## Colors

La paleta es un azul de pista profundo con cal blanca, tinta de cronómetro y un único amarillo de señal.

### Primary
- **Rink Blue** (#0a2f8f): superficie principal de las secciones de pista y del hero.
- **Rink Deep** (#061b52): fondos de paneles y scrollbar.
- **Rink Black** (#030d28): fondo base del `body`, texto sobre amarillo.
- **Rink Bright** (#1f5cff): acento de línea y detalles sobre fondos claros.
- **Signal Yellow** (#ffd21e): CTA primario, barras de regla, foco visible. Usado en pocas superficies por pantalla.

### Secondary
- **Signal Deep** (#d9a900): variante del amarillo para bordes y estados sobre claro.
- **Alert Coral** (#ff6a5c) / **Alert Ink** (#b3261e): estados de bloqueo o error; el estado nunca se comunica solo por color.
- **Ok Mint** (#6ff2b2) / **Ok Ink** (#0a6b4d): estados de validación cumplida.

### Neutral
- **Chalk** (#f8faff): superficie clara principal.
- **Ice** (#edf3ff) y **Ice Deep** (#dbe6ff): superficies claras alternas y fondo de filas.
- **Ink** (#071433): texto principal sobre fondos claros.
- **Ink Soft** (#33456e) y **Muted** (#526489): texto secundario sobre claro.
- **Muted on Dark** (#bac9ee): texto secundario sobre rink.
- **Line** (#b8c7e8): bordes sobre claro.
- **White** (#f7f9ff): texto sobre rink y hover del CTA.

### Named Rules
**The One Signal Rule.** El amarillo de señal se usa en el CTA y en un número muy limitado de marcas por pantalla. Su rareza es el punto.

**The Measured Line Rule.** Las separaciones son líneas de 1–2 px con transparencias de blanco sobre rink (`line-dark`, `line-strong`), no sombras.

## Typography

**Display Font:** Archivo (con Arial Narrow, sans-serif)
**Body Font:** Archivo (con system-ui, sans-serif)
**Label/Mono Font:** Spline Sans Mono (con ui-monospace, Consolas)

**Character:** Archivo ancho y pesado da una voz industrial y directa para titulares; la mono tabular sostiene tiempos, etiquetas y datos, de modo que los números se leen como cronometraje.

### Hierarchy
- **Display** (800, `clamp(3.2rem, 7vw, 6rem)`, line-height 1): titular del hero, "La pista no miente."
- **Headline** (800, `clamp(2.25rem, 4.25vw, 4.5rem)`, line-height 1.05): títulos de sección.
- **Title** (600, 0.98rem, line-height 1.3): títulos de filas, preguntas y paneles.
- **Body** (400, 17px, line-height 1.6): texto corrido; `text-wrap: pretty`.
- **Label** (500, 0.72rem, letter-spacing 0.1em, mayúsculas, mono): botones, etiquetas de carril, tiempos MM:SS.mmm y cifras.

### Named Rules
**The Tabular Time Rule.** Los tiempos y cifras de cartera se muestran en mono tabular para que las columnas se alineen. Los montos van en COP.

## Layout

Contenedor centrado de `page-max` 1320 px con padding lateral `page-pad`. Las secciones usan `section-pad` vertical y alternan fondos (rink, ice, chalk, deep). Los paneles usan retículas de carriles y parrillas de roles con filas separadas por líneas; las tarjetas no se anidan.

Breakpoints usados: 1200 px (ajuste de padding), 980 px (navegación móvil), 860 px, 720 px y 520 px (escalas tipográficas). El contenido se valida en 375, 768, 1280 y 1440 px sin desplazamiento horizontal. En las parrillas de roles, las filas pares se desplazan verticalmente `1.25rem` en escritorio.

## Elevation & Depth

Sistema plano. Las superficies no tienen sombra en reposo; la profundidad se expresa con cambios de fondo entre rink, ice y chalk y con bordes de 1–2 px. La única sombra es `--shadow-panel` (`0 30px 70px rgba(3, 13, 40, 0.35)`) en el tablero de cronometraje y en el diálogo modal.

### Shadow Vocabulary
- **Panel** (`box-shadow: 0 30px 70px rgba(3, 13, 40, 0.35)`): tablero principal y diálogos. No se usa en tarjetas ni botones.

### Named Rules
**The Flat-By-Default Rule.** Las superficies son planas en reposo. Solo el tablero principal y los diálogos elevan.

## Shapes

Radio casi nulo: `2px` para botones y controles. Los bordes son líneas de 1–2 px. Las formas son rectangulares y se leen como paneles de control, no como píldoras ni tarjetas redondeadas.

## Components

### Buttons
- **Shape:** rectangular con radio de 2 px.
- **Primary:** fondo `signal` (#ffd21e), texto `rink-black`, mayúsculas mono de 0.72rem, altura mínima 44 px.
- **Hover / Focus:** el primario pasa a fondo `white`; el foco visible es un contorno de 3 px `signal` con un anillo `rink-black` de 5 px.
- **Ghost:** fondo transparente, texto `white`, borde `line-strong`; en hover el texto y borde pasan a `signal`.

### Lanes and Role Grid
- **Style:** filas con fondo `chalk` o `ice` alternado, separadas por líneas de 1 px.
- **State:** hover y focus cambian el fondo de la fila con transición de 0.2 s.

### Rules
- **Style:** lista con borde superior de 2 px `line-strong`; cada regla lleva una barra de `signal` de 3 px como marca.

### Navigation
- **Style:** cabecera de 72 px, marca en Archivo 800 provisional. En móvil, el menú es un panel lateral que se desliza en 0.22 s.

## Do's and Don'ts

### Do:
- **Do** usar `signal` solo en el CTA principal y en las marcas de regla y foco.
- **Do** rotular todos los datos de ejemplo como "Datos de muestra".
- **Do** usar mono tabular para tiempos MM:SS.mmm y montos en COP.
- **Do** mantener el estado comunicado con texto o icono, no solo con color.
- **Do** respetar `prefers-reduced-motion` y dejar el foco visible.

### Don't:
- **Don't** usar gradientes morados, glassmorphism, neón ni brillos.
- **Don't** usar naranja de atletismo como acento.
- **Don't** usar tarjetas redondeadas con sombra como contenedor principal.
- **Don't** inventar logo, fotografías, testimonios ni métricas; la marca es un wordmark provisional.
- **Don't** usar sombras en reposo fuera del tablero principal y los diálogos.
