// check-contrast.mjs — DSR-07 (tokens.md §9). Calcula contrastes texto/superficie.
// Falla bajo 4.5:1 (texto) o 3:1 (bordes de control e íconos informativos).
function lum(hex) {
  const c = hex.replace("#", "");
  const v = [0, 2, 4].map((i) => {
    let x = parseInt(c.slice(i, i + 2), 16) / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function ratio(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
const C = {
  "neutral-0": "#FFFFFF", "neutral-50": "#F8F9FA", "neutral-100": "#F1F3F5", "neutral-500": "#7B8491",
  "neutral-600": "#5B6470", "neutral-800": "#272D35", "neutral-900": "#14181D",
  "success-100": "#DDF3E4", "success-700": "#176B3A", "warning-100": "#FFF1CC", "warning-700": "#7A5200",
  "error-100": "#FBE1E0", "error-700": "#9B1C1C", "info-100": "#DCEBFB", "info-700": "#1A4FA0",
};
const textPairs = [
  ["headings/900 sobre page/50", C["neutral-900"], C["neutral-50"], 4.5],
  ["body/800 sobre page/50", C["neutral-800"], C["neutral-50"], 4.5],
  ["muted/600 sobre page/50", C["neutral-600"], C["neutral-50"], 4.5],
  ["body/800 sobre primary/0", C["neutral-800"], C["neutral-0"], 4.5],
  ["success-700 sobre success-100", C["success-700"], C["success-100"], 4.5],
  ["warning-700 sobre warning-100", C["warning-700"], C["warning-100"], 4.5],
  ["error-700 sobre error-100", C["error-700"], C["error-100"], 4.5],
  ["info-700 sobre info-100", C["info-700"], C["info-100"], 4.5],
  ["on-action/0 sobre action/900", C["neutral-0"], C["neutral-900"], 4.5],
];
const borderPairs = [["border-strong/500 sobre primary/0", C["neutral-500"], C["neutral-0"], 3]];
let fail = 0;
for (const [name, fg, bg, min] of [...textPairs, ...borderPairs]) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  console.log(`${ok ? "OK  " : "FAIL"} ${r.toFixed(2)}:1 ${name} (mín ${min}:1)`);
  if (!ok) fail++;
}
if (fail) { console.error(`check-contrast: ${fail} fallo(s)`); process.exit(1); }
console.log("check-contrast: OK");
