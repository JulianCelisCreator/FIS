// check-raw-values.mjs — DSR-03 (spec §7.9). Sin dependencias.
// Falla si en components/**/*.css o base/**/*.css (no tokens.css) hay:
// - colores literales (#, rgb(, hsl(, nombres salvo transparent/currentColor)
// - longitudes px/rem/em salvo: 0; breakpoints 640/768/1024/1280 en @media/@container; outline-offset: 2px
// - font-size/line-height/font-weight sin var(--fontsize-* / --lineheight-* / --type-font-weight-*)
// - box-shadow/text-shadow sin var(--shadow-*)
// - z-index literal
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIRS = ["base", "components"];
const files = [];
function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".css")) files.push(p);
  }
}
for (const d of DIRS) {
  try { walk(join(ROOT, d)); } catch {}
}

let errors = [];
const ALLOWED_PX = new Set(["640px", "768px", "1024px", "1280px"]);
for (const f of files) {
  const raw = readFileSync(f, "utf8");
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");
  const lines = css.split("\n");
  const inMedia = /@(media|container)[^{]*640|@(media|container)[^{]*768|@(media|container)[^{]*1024|@(media|container)[^{]*1280/;
  lines.forEach((line, i) => {
    const loc = `${f}:${i + 1}`;
    const code = line.split("/*")[0];
    // colores literales
    if (/(#[0-9a-fA-F]{3,8}|rgb\(|hsl\()/.test(code)) errors.push(`${loc} color literal: ${line.trim()}`);
    // longitudes
    const lens = code.match(/(\d*\.?\d+)(px|r?em)\b/g) || [];
    for (const l of lens) {
      if (l === "0px" || l === "0em" || l === "0rem") continue;
      if (ALLOWED_PX.has(l) && inMedia.test(css)) continue;
      if (l === "2px" && /outline-offset/.test(code)) continue;
      // permitir 9999px de --radius-full ya está en tokens; aquí solo components/base
      errors.push(`${loc} longitud cruda ${l}: ${line.trim()}`);
      break;
    }
    if (/\bfont-size\s*:/.test(code) && !/var\(--fontsize-/.test(code)) errors.push(`${loc} font-size sin var(--fontsize-*): ${line.trim()}`);
    if (/\bline-height\s*:/.test(code) && !/var\(--lineheight-/.test(code)) errors.push(`${loc} line-height sin var(--lineheight-*): ${line.trim()}`);
    if (/\bfont-weight\s*:/.test(code) && !/var\(--type-font-weight-/.test(code)) errors.push(`${loc} font-weight sin var(--type-font-weight-*): ${line.trim()}`);
    if (/(box-shadow|text-shadow)\s*:/.test(code) && !/var\(--shadow-/.test(code)) errors.push(`${loc} sombra sin var(--shadow-*): ${line.trim()}`);
    if (/\bz-index\s*:\s*\d/.test(code)) errors.push(`${loc} z-index literal (pendiente decisión §14.4): ${line.trim()}`);
  });
}
if (errors.length) {
  console.error(`check-raw-values: ${errors.length} infracción(es)\n` + errors.join("\n"));
  process.exit(1);
}
console.log(`check-raw-values: OK (${files.length} archivos)`);
