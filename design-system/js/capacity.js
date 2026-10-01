// Regla RF M3-02 con aritmética entera (spec §9.2). Pura, sin DOM.
export function resolveCapacity(value, max) {
  if (!Number.isInteger(value) || !Number.isInteger(max) || max <= 0 || value < 0) {
    return { tone: "neutral", label: "—", invalid: true, percent: null };
  }
  if (value >= max) return { tone: "error", label: "Lleno", invalid: false, percent: Math.min(100, Math.round((value * 100) / max)) };
  if (value * 100 >= max * 90) return { tone: "warning", label: "Alerta al 90 %", invalid: false, percent: Math.round((value * 100) / max) };
  return { tone: "success", label: "Con cupo", invalid: false, percent: Math.round((value * 100) / max) };
}
