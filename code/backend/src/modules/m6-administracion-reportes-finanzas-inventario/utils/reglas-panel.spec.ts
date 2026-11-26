import { rangoPanel } from './reglas-panel.js';
import { ErrorReglaReporte } from './reglas-reporte.js';

describe('rangoPanel', () => {
  it('sin fechas usa el mes en curso hasta hoy', () => {
    expect(rangoPanel('2026-11-18')).toEqual({ desde: '2026-11-01', hasta: '2026-11-18' });
  });

  it('con fechas aplica las mismas reglas que los reportes', () => {
    expect(rangoPanel('2026-11-18', '2026-10-01', '2026-10-31')).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
    expect(() => rangoPanel('2026-11-18', '2026-10-01')).toThrow(ErrorReglaReporte);
    expect(() => rangoPanel('2026-11-18', '2026-11-30', '2026-11-01')).toThrow(
      'La fecha inicial no puede ser posterior a la fecha final',
    );
  });
});
