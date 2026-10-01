// Catálogo entidad + estado → { label, tone, icon } (status-and-formats.md §3).
// Reglas: Anulado/Cancelado → neutral; Rechazado → error; Vencido prevalece sobre Pendiente.

const TONES = {
  success: { icon: "check-circle" },
  warning: { icon: "alert-triangle" },
  error: { icon: "x-circle" },
  info: { icon: "info" },
  neutral: { icon: "minus-circle" },
};

const TABLE = {
  profesor: { "por-registrar": ["Por registrar", "neutral"], "cuenta-activa": ["Cuenta activa", "success"] },
  patinador: { bloqueado: ["Bloqueado", "error"], habilitado: ["Habilitado", "success"] },
  grupo: { "con-cupo": ["Con cupo", "success"], "alerta-90": ["Alerta al 90 %", "warning"], lleno: ["Lleno", "error"] },
  competencia: { programada: ["Programada", "info"], cancelada: ["Cancelada", "neutral"] },
  inscripcion: { "en-validacion": ["En validación", "info"], aprobada: ["Aprobada", "success"], rechazada: ["Rechazada", "error"], anulada: ["Anulada", "neutral"] },
  "causal-rechazo": { poliza: ["Póliza", "error"], cartera: ["Cartera", "error"], autorizacion: ["Autorización", "error"], sancion: ["Sanción", "error"] },
  participante: { "no-finalizo": ["No finalizó", "neutral"] },
  plan: { activo: ["Activo", "success"], inactivo: ["Inactivo", "neutral"] },
  cobro: { pendiente: ["Pendiente", "warning"], pagado: ["Pagado", "success"], anulado: ["Anulado", "neutral"] },
  pago: { registrado: ["Registrado", "success"], anulado: ["Anulado", "neutral"] },
  comprobante: { vigente: ["Vigente", "success"], anulado: ["Anulado", "neutral"] },
  cartera: { "al-dia": ["Al día", "success"], pendiente: ["Pendiente", "warning"], vencido: ["Vencido", "error"] },
  personal: { activo: ["Activo", "success"], inactivo: ["Inactivo", "neutral"] },
  uniforme: { "stock-normal": ["Stock normal", "success"], "alerta-minimo": ["Alerta por cantidad mínima", "warning"] },
  prestamo: { activo: ["Activo", "info"], devuelto: ["Devuelto", "success"], vencido: ["Vencido", "error"], "perdida-dano": ["Pérdida o daño", "error"] },
  validacion: { aprobo: ["Aprobó", "success"], fallo: ["Falló", "error"], "en-validacion": ["En validación", "info"], "no-aplica": ["No aplica", "neutral"] },
};

export function resolveStatus(entity, status) {
  const e = TABLE[entity];
  if (!e || !e[status]) return { label: status, tone: "neutral", icon: TONES.neutral.icon };
  const [label, tone] = e[status];
  return { label, tone, icon: TONES[tone].icon };
}

// Precedencia de cartera (M5-12): Vencido > Pendiente > Al día.
export function resolveCartera(states) {
  if (states.includes("vencido")) return resolveStatus("cartera", "vencido");
  if (states.includes("pendiente")) return resolveStatus("cartera", "pendiente");
  return resolveStatus("cartera", "al-dia");
}

export const STATUS_TABLE = TABLE;
