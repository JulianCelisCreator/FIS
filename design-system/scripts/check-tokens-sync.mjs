// check-tokens-sync.mjs — DSR-12. Compara tokens.md (skill) vs tokens.css.
import { readFileSync } from "node:fs";

const reference = readFileSync(new URL("../../.agents/skills/DesignSystem/references/tokens.md", import.meta.url), "utf8");
const css = readFileSync(new URL("../tokens.css", import.meta.url), "utf8");
const cssVars = new Map();
for (const match of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) cssVars.set(match[1], match[2].trim());
const referenceNames = new Set([...reference.matchAll(/`(--[a-z0-9-]+)`/g)].map((match) => match[1]));
const expected = new Map();
const errors = [];
const define = (name, value) => expected.set(name, value);
const px = (value) => Number(value) === 0 ? "0" : `${Number(value)}px`;

for (const match of reference.matchAll(/\|\s*`(--color-neutral-\d+)`\s*\|\s*`(#[\da-f]{6})`/gi)) {
  define(match[1], match[2]);
}
for (const match of reference.matchAll(/\|\s*`--color-(success|warning|error|info)-\*`\s*\|\s*`(#[\da-f]{6})`\s*\|\s*`(#[\da-f]{6})`\s*\|\s*`(#[\da-f]{6})`/gi)) {
  ["100", "500", "700"].forEach((step, index) => define(`--color-${match[1]}-${step}`, match[index + 2]));
}

for (const match of reference.matchAll(/\|\s*`(--(?:text|surface|border|icon)-[a-z-]+)`\s*\|\s*`([a-z]+-\d+)`/g)) {
  define(match[1], `var(--color-${match[2]})`);
}
const overlay = /\|\s*`--surface-overlay`\s*\|\s*`([a-z]+-\d+)` al (\d+)\s*%\s*\|/.exec(reference);
if (overlay) define("--surface-overlay", `color-mix(in srgb, var(--color-${overlay[1]}) ${overlay[2]}%, transparent)`);

for (const match of reference.matchAll(/\|\s*`(--spacing-[a-z0-9-]+)`\s*\|\s*(\d+)\s*\|/g)) define(match[1], px(match[2]));
const family = /`--type-font-family-base`\s*=\s*`([^`]+)`/.exec(reference);
if (family) define("--type-font-family-base", family[1]);
for (const match of reference.matchAll(/`(--type-font-weight-[a-z]+)`\s+(\d+)/g)) define(match[1], match[2]);
for (const match of reference.matchAll(/\|\s*`([a-z0-9]+)`\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/g)) {
  define(`--fontsize-${match[1]}`, px(match[2]));
  define(`--lineheight-${match[1]}`, px(match[3]));
}
for (const match of reference.matchAll(/\|\s*`(--bp-[a-z]+)`\s*\|\s*(\d+)\s*\|/g)) define(match[1], px(match[2]));

const layoutRows = [...reference.matchAll(/\|\s*(?:Menor a `--bp-md`|`--bp-md` a menor a `--bp-lg`|`--bp-lg` en adelante)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/g)];
const layoutNames = ["mobile", "tablet", "desktop"];
layoutRows.forEach((match, index) => {
  const [columns, margin, gutter] = match.slice(1).map(Number);
  const suffix = layoutNames[index];
  define(`--layout-columns-${suffix}`, String(columns));
  define(`--layout-margin-${suffix}`, px(margin));
  define(`--layout-gutter-${suffix}`, px(gutter));
});
const maxWidth = /`--layout-max-width`\s*=\s*(\d+)/.exec(reference);
if (maxWidth) define("--layout-max-width", px(maxWidth[1]));

for (const match of reference.matchAll(/\|\s*`(--(?:radius|stroke|control-height|icon-size)-[a-z0-9-]+)`\s*\|\s*(\d+)\s*\|/g)) {
  define(match[1], px(match[2]));
}
for (const match of reference.matchAll(/\|\s*`(--shadow-(?:raised|overlay))`\s*\|\s*`([^`]+)`/g)) {
  const value = match[2];
  const parts = /^(.*?)\s*rgba\(\d+,\s*\d+,\s*\d+,\s*\.?(\d+)\)$/.exec(value);
  if (!parts) {
    errors.push(`no se pudo interpretar ${match[1]} en tokens.md`);
    continue;
  }
  const alpha = Number(`0.${parts[2]}`) * 100;
  define(match[1], `${parts[1].trim()} color-mix(in srgb, var(--color-neutral-900) ${alpha}%, transparent)`);
}

for (const [name, value] of expected) {
  const actual = cssVars.get(name);
  if (actual === undefined) errors.push(`falta en tokens.css: ${name}`);
  else if (norm(actual) !== norm(value)) errors.push(`valor distinto ${name}: css=${actual} esperado=${value}`);
}
for (const name of referenceNames) {
  if (!cssVars.has(name)) errors.push(`token de tokens.md ausente en tokens.css: ${name}`);
  if (!expected.has(name)) errors.push(`token de tokens.md sin regla de comparación: ${name}`);
}
for (const name of cssVars.keys()) {
  if (!expected.has(name)) errors.push(`token sin definición en tokens.md: ${name}`);
}

function norm(value) { return value.replace(/\s+/g, " ").trim().toLowerCase(); }
if (errors.length) {
  console.error("check-tokens-sync: FALLA\n" + errors.join("\n"));
  process.exit(1);
}
console.log(`check-tokens-sync: OK (${expected.size} tokens extraídos de tokens.md)`);
