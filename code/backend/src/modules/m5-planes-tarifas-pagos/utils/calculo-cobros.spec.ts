import {
  diasCobradosPrimerMes,
  fechaLimiteMensualidad,
  fechaLimitePrimeraMensualidad,
  primerDiaDelMes,
  primerDiaMesSiguiente,
  sumarDias,
  valorPrimeraMensualidad,
} from './calculo-cobros.js';

describe('calculo-cobros', () => {
  describe('fechas', () => {
    it('obtiene el primer día del mes y del mes siguiente', () => {
      expect(primerDiaDelMes('2026-10-15')).toBe('2026-10-01');
      expect(primerDiaMesSiguiente('2026-10-15')).toBe('2026-11-01');
      expect(primerDiaMesSiguiente('2026-12-31')).toBe('2027-01-01');
    });

    it('suma y resta días cruzando meses', () => {
      expect(sumarDias('2026-11-01', -1)).toBe('2026-10-31');
      expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29');
    });

    it('ubica la fecha límite en el día límite del plan', () => {
      expect(fechaLimiteMensualidad('2026-11-01', 5)).toBe('2026-11-05');
    });
  });

  describe('primera mensualidad prorrateada', () => {
    it('cobra el mes completo a quien empieza el día 1', () => {
      expect(diasCobradosPrimerMes('2026-10-01')).toBe(30);
      expect(valorPrimeraMensualidad(180000, '2026-10-01')).toBe(180000);
    });

    it('prorratea como el wireframe: el día 15 paga 15/30', () => {
      expect(diasCobradosPrimerMes('2026-10-15')).toBe(15);
      expect(valorPrimeraMensualidad(180000, '2026-10-15')).toBe(90000);
      expect(diasCobradosPrimerMes('2026-10-02')).toBe(28);
    });

    it('cobra al menos un día a quien entra el 29, 30 o 31', () => {
      expect(diasCobradosPrimerMes('2026-10-29')).toBe(1);
      expect(diasCobradosPrimerMes('2026-10-30')).toBe(1);
      expect(diasCobradosPrimerMes('2026-10-31')).toBe(1);
      expect(valorPrimeraMensualidad(180000, '2026-10-31')).toBe(6000);
    });

    it('redondea al peso', () => {
      expect(valorPrimeraMensualidad(100000, '2026-10-10')).toBe(66667);
      expect(valorPrimeraMensualidad(35500, '2026-10-20')).toBe(11833);
    });

    it('vence al ingresar, pero no antes del día límite normal', () => {
      expect(fechaLimitePrimeraMensualidad('2026-10-15', 5)).toBe('2026-10-15');
      expect(fechaLimitePrimeraMensualidad('2026-10-03', 5)).toBe('2026-10-05');
      expect(fechaLimitePrimeraMensualidad('2026-10-01', 5)).toBe('2026-10-05');
    });
  });
});
