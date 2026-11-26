import { calcularEstadoPoliza } from './estado-poliza.js';

describe('calcularEstadoPoliza (HU-M1-10, CA-03)', () => {
  const poliza = { vigenteDesde: '2026-01-01', vigenteHasta: '2026-12-31' };

  it('marca Pendiente cuando todavía no hay póliza', () => {
    expect(calcularEstadoPoliza(null, '2026-06-15')).toBe('PENDIENTE');
  });

  it('marca Pendiente cuando la vigencia empieza en el futuro', () => {
    expect(calcularEstadoPoliza(poliza, '2025-12-31')).toBe('PENDIENTE');
  });

  it('marca Vigente el primer y el último día de la vigencia', () => {
    expect(calcularEstadoPoliza(poliza, '2026-01-01')).toBe('VIGENTE');
    expect(calcularEstadoPoliza(poliza, '2026-12-31')).toBe('VIGENTE');
  });

  it('marca Vencida desde el día siguiente a la fecha de fin', () => {
    expect(calcularEstadoPoliza(poliza, '2027-01-01')).toBe('VENCIDA');
  });
});
