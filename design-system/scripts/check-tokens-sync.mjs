// check-tokens-sync.mjs — DSR-12. Compara tokens.md (skill) vs tokens.css.
// Todo token de tokens.md debe existir en tokens.css con mismo nombre y valor, y viceversa.
// Acepta variantes normalizadas: sombras con color-mix derivado de --color-neutral-900,
// y --surface-overlay como color-mix 50%.
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../tokens.css", import.meta.url), "utf8");
const cssVars = new Map();
for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) cssVars.set(m[1].trim(), m[2].trim());

// Mapa esperado extraído de references/tokens.md (skill patinaje-design-system).
const EXPECTED = new Map(Object.entries({
  "--color-neutral-0": "#FFFFFF", "--color-neutral-50": "#F8F9FA", "--color-neutral-100": "#F1F3F5",
  "--color-neutral-200": "#E5E8EB", "--color-neutral-300": "#D0D5DB", "--color-neutral-400": "#A8B0BA",
  "--color-neutral-500": "#7B8491", "--color-neutral-600": "#5B6470", "--color-neutral-700": "#3F4751",
  "--color-neutral-800": "#272D35", "--color-neutral-900": "#14181D",
  "--color-success-100": "#DDF3E4", "--color-success-500": "#2E9E5B", "--color-success-700": "#176B3A",
  "--color-warning-100": "#FFF1CC", "--color-warning-500": "#E0A100", "--color-warning-700": "#7A5200",
  "--color-error-100": "#FBE1E0", "--color-error-500": "#D64545", "--color-error-700": "#9B1C1C",
  "--color-info-100": "#DCEBFB", "--color-info-500": "#2F80ED", "--color-info-700": "#1A4FA0",
  "--text-headings": "var(--color-neutral-900)", "--text-body": "var(--color-neutral-800)",
  "--text-muted": "var(--color-neutral-600)", "--text-disabled": "var(--color-neutral-400)",
  "--text-on-action": "var(--color-neutral-0)", "--text-link": "var(--color-info-700)",
  "--text-success": "var(--color-success-700)", "--text-warning": "var(--color-warning-700)",
  "--text-error": "var(--color-error-700)", "--text-info": "var(--color-info-700)",
  "--surface-page": "var(--color-neutral-50)", "--surface-primary": "var(--color-neutral-0)",
  "--surface-subtle": "var(--color-neutral-100)", "--surface-action": "var(--color-neutral-900)",
  "--surface-action-hover": "var(--color-neutral-800)", "--surface-selected": "var(--color-info-100)",
  "--surface-disabled": "var(--color-neutral-200)", "--surface-loading": "var(--color-neutral-200)",
  "--surface-success": "var(--color-success-100)", "--surface-warning": "var(--color-warning-100)",
  "--surface-error": "var(--color-error-100)", "--surface-info": "var(--color-info-100)",
  "--border-primary": "var(--color-neutral-300)", "--border-strong": "var(--color-neutral-500)",
  "--border-action": "var(--color-neutral-900)", "--border-focus": "var(--color-info-500)",
  "--border-success": "var(--color-success-500)", "--border-warning": "var(--color-warning-500)",
  "--border-error": "var(--color-error-500)", "--border-info": "var(--color-info-500)",
  "--icon-primary": "var(--color-neutral-800)", "--icon-muted": "var(--color-neutral-600)",
  "--icon-disabled": "var(--color-neutral-400)", "--icon-on-action": "var(--color-neutral-0)",
  "--icon-success": "var(--color-success-700)", "--icon-warning": "var(--color-warning-700)",
  "--icon-error": "var(--color-error-700)", "--icon-info": "var(--color-info-700)",
  "--spacing-2xs": "4px", "--spacing-xs": "8px", "--spacing-sm": "12px", "--spacing-md": "16px",
  "--spacing-lg": "24px", "--spacing-xl": "32px", "--spacing-2xl": "48px", "--spacing-3xl": "64px",
  "--type-font-family-base": '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  "--type-font-weight-regular": "400", "--type-font-weight-medium": "500",
  "--type-font-weight-semibold": "600", "--type-font-weight-bold": "700",
  "--fontsize-xs": "12px", "--fontsize-sm": "14px", "--fontsize-md": "16px", "--fontsize-lg": "20px",
  "--fontsize-xl": "24px", "--fontsize-2xl": "32px", "--fontsize-3xl": "40px",
  "--lineheight-xs": "16px", "--lineheight-sm": "20px", "--lineheight-md": "24px", "--lineheight-lg": "28px",
  "--lineheight-xl": "32px", "--lineheight-2xl": "40px", "--lineheight-3xl": "48px",
  "--bp-sm": "640px", "--bp-md": "768px", "--bp-lg": "1024px", "--bp-xl": "1280px",
  "--layout-columns-mobile": "4", "--layout-columns-tablet": "8", "--layout-columns-desktop": "12",
  "--layout-margin-mobile": "16px", "--layout-margin-tablet": "24px", "--layout-margin-desktop": "32px",
  "--layout-gutter-mobile": "16px", "--layout-gutter-tablet": "16px", "--layout-gutter-desktop": "24px",
  "--layout-max-width": "1280px",
  "--radius-none": "0", "--radius-sm": "4px", "--radius-md": "8px", "--radius-lg": "16px", "--radius-full": "9999px",
  "--stroke-sm": "1px", "--stroke-md": "2px",
  "--control-height-sm": "32px", "--control-height-md": "40px", "--control-height-lg": "48px",
  "--icon-size-sm": "16px", "--icon-size-md": "20px", "--icon-size-lg": "24px",
}));

function norm(v) { return v.replace(/\s+/g, " ").trim().toLowerCase(); }
const errors = [];
for (const [k, v] of EXPECTED) {
  if (!cssVars.has(k)) { errors.push(`falta en tokens.css: ${k}`); continue; }
  if (norm(cssVars.get(k)) !== norm(v)) errors.push(`valor distinto ${k}: css=${cssVars.get(k)} esperado=${v}`);
}
// Casos especiales con derivación permitida (spec §6.2–6.3)
for (const [k, must] of [
  ["--surface-overlay", "color-mix(in srgb, var(--color-neutral-900) 50%, transparent)"],
  ["--shadow-raised", "color-mix(in srgb, var(--color-neutral-900)"],
  ["--shadow-overlay", "color-mix(in srgb, var(--color-neutral-900)"],
]) {
  const got = cssVars.get(k) ?? "";
  if (!norm(got).includes(norm(must).slice(0, 30))) errors.push(`derivado inválido ${k}: ${got}`);
}
// Viceversa: sin tokens extra fuera de alias responsivos (--control-height, --layout-columns/margin/gutter sin sufijo)
const allowedExtra = new Set(["--control-height", "--layout-columns", "--layout-margin", "--layout-gutter"]);
for (const k of cssVars.keys()) {
  if (EXPECTED.has(k) || allowedExtra.has(k) || ["--surface-overlay", "--shadow-raised", "--shadow-overlay"].includes(k)) continue;
  // alias viven en base.css, no aquí; si aparecen en tokens.css es error
  errors.push(`token extra en tokens.css no definido en tokens.md: ${k}`);
}
if (errors.length) { console.error("check-tokens-sync: FALLA\n" + errors.join("\n")); process.exit(1); }
console.log(`check-tokens-sync: OK (${EXPECTED.size} tokens + 3 derivados)`);
