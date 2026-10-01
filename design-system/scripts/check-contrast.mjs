// check-contrast.mjs — DSR-07 (tokens.md §9). Calcula contrastes texto/superficie.
// Falla bajo 4.5:1 (texto) o 3:1 (bordes de control e íconos informativos).
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../tokens.css", import.meta.url), "utf8");
const tokens = new Map();
for (const match of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) tokens.set(match[1], match[2].trim());

function color(token, stack = new Set()) {
  if (stack.has(token)) throw new Error(`referencia circular: ${token}`);
  const value = tokens.get(token);
  if (!value) throw new Error(`falta el token ${token}`);
  const ref = /^var\((--[a-z0-9-]+)\)$/.exec(value);
  if (ref) {
    stack.add(token);
    return color(ref[1], stack);
  }
  if (!/^#[\da-f]{6}$/i.test(value)) throw new Error(`color no resoluble en ${token}: ${value}`);
  return value;
}

function lum(hex) {
  const c = hex.slice(1);
  const v = [0, 2, 4].map((i) => {
    let x = parseInt(c.slice(i, i + 2), 16) / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

function ratio(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const pairs = [
  ["headings sobre page", "--text-headings", "--surface-page", 4.5],
  ["body sobre page", "--text-body", "--surface-page", 4.5],
  ["muted sobre page", "--text-muted", "--surface-page", 4.5],
  ["body sobre primary", "--text-body", "--surface-primary", 4.5],
  ["success-700 sobre success-100", "--text-success", "--surface-success", 4.5],
  ["warning-700 sobre warning-100", "--text-warning", "--surface-warning", 4.5],
  ["error-700 sobre error-100", "--text-error", "--surface-error", 4.5],
  ["info-700 sobre info-100", "--text-info", "--surface-info", 4.5],
  ["on-action sobre action", "--text-on-action", "--surface-action", 4.5],
  ["border-strong sobre primary", "--border-strong", "--surface-primary", 3],
];

let fail = 0;
for (const [name, fgToken, bgToken, min] of pairs) {
  try {
    const value = ratio(color(fgToken), color(bgToken));
    const ok = value >= min;
    console.log(`${ok ? "OK  " : "FAIL"} ${value.toFixed(2)}:1 ${name} (mín ${min}:1)`);
    if (!ok) fail++;
  } catch (error) {
    fail++;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
if (fail) { console.error(`check-contrast: ${fail} fallo(s)`); process.exit(1); }
console.log("check-contrast: OK");
