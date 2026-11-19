import { construirHistorialTarifas, type TarifaRegistrada } from './historial-tarifas.js';

const tarifa = (id: number, valor: number, vigenteDesde: string): TarifaRegistrada => ({
  id,
  valor,
  vigenteDesde,
  registradoPor: 'Andrea López',
  registradoEn: new Date('2026-01-01T12:00:00Z'),
});

describe('construirHistorialTarifas', () => {
  // Ejemplo del wireframe de planes: 165.000 (2025), 180.000 vigente y 195.000 programada.
  const tarifas = [
    tarifa(2, 180000, '2026-02-01'),
    tarifa(3, 195000, '2026-11-01'),
    tarifa(1, 165000, '2025-02-01'),
  ];

  it('marca la programada, la vigente y la histórica, de la más nueva a la más antigua', () => {
    const historial = construirHistorialTarifas(tarifas, '2026-09-30');
    expect(historial.map((t) => [t.valor, t.estado, t.vigenteHasta])).toEqual([
      [195000, 'PROGRAMADA', null],
      [180000, 'VIGENTE', '2026-10-31'],
      [165000, 'HISTORICA', '2026-01-31'],
    ]);
  });

  it('cuando llega la fecha, la programada pasa a vigente', () => {
    const historial = construirHistorialTarifas(tarifas, '2026-11-01');
    expect(historial.map((t) => t.estado)).toEqual(['VIGENTE', 'HISTORICA', 'HISTORICA']);
  });

  it('un plan sin tarifas que ya rijan solo tiene programadas', () => {
    const historial = construirHistorialTarifas([tarifa(1, 50000, '2027-01-01')], '2026-11-08');
    expect(historial[0].estado).toBe('PROGRAMADA');
    expect(construirHistorialTarifas([], '2026-11-08')).toEqual([]);
  });
});
