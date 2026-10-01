// Formatos colombianos en un solo lugar (spec §7.7, DSR-08).
// Funciones puras. No dependen del DOM.

export function formatTime(ms) {
  if (!Number.isInteger(ms) || ms < 0) return "—";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(milli).padStart(3, "0")}`;
}

export function parseTime(text) {
  const m = /^(\d{2,}):([0-5]\d)\.(\d{3})$/.exec(String(text).trim());
  if (!m) return null;
  return Number(m[1]) * 60000 + Number(m[2]) * 1000 + Number(m[3]);
}

export function formatCOP(n) {
  if (!Number.isFinite(Number(n))) return "—";
  const v = Math.trunc(Number(n));
  return "$ " + v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function parseCOP(text) {
  const digits = String(text).replace(/[^0-9]/g, "");
  if (digits === "") return null;
  return Number(digits);
}

export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  if (!m) return "—";
  const [, y, mo, d] = m;
  // Forzar 2-digit sin depender del motor (spec §7.7).
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  if (dt.getFullYear() !== Number(y) || dt.getMonth() !== Number(mo) - 1 || dt.getDate() !== Number(d)) return "—";
  return `${d}/${mo}/${y}`;
  // Equivalente Intl: new Intl.DateTimeFormat("es-CO",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"UTC"}).format(...)
}

export function parseDate(text) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(text).trim());
  if (!m) return null;
  const [, d, mo, y] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  if (dt.getFullYear() !== Number(y) || dt.getMonth() !== Number(mo) - 1 || dt.getDate() !== Number(d)) return null;
  return `${y}-${mo}-${d}`;
}

export function formatPosition(n) {
  if (!Number.isInteger(n) || n < 1) return "—";
  return `${n}.º`;
}
