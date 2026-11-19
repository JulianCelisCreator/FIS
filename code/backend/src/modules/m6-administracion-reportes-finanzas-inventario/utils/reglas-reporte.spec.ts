import {
  ErrorReglaReporte,
  reporteCartera,
  reporteIngresos,
  reporteMovimientos,
  reportePagos,
  validarRango,
  validarTipoReporte,
} from './reglas-reporte.js';

const encabezado = { desde: '2026-11-01', hasta: '2026-11-30', generadoEn: '2026-11-18T15:00:00.000Z' };
const total = (reporte: { totales: { clave: string; valor: number }[] }, clave: string) =>
  reporte.totales.find((item) => item.clave === clave)?.valor;

describe('validarRango', () => {
  it('acepta un rango válido y un solo día', () => {
    expect(validarRango('2026-11-01', '2026-11-30')).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' });
    expect(validarRango('2026-11-18', '2026-11-18')).toEqual({ desde: '2026-11-18', hasta: '2026-11-18' });
  });

  it.each([
    [undefined, '2026-11-30', 'Indica la fecha inicial y la fecha final del reporte'],
    ['2026-11-01', undefined, 'Indica la fecha inicial y la fecha final del reporte'],
    ['01/11/2026', '2026-11-30', 'La fecha inicial no es válida (AAAA-MM-DD)'],
    ['2026-11-01', '2026-02-30', 'La fecha final no es válida (AAAA-MM-DD)'],
    ['2026-12-01', '2026-11-30', 'La fecha inicial no puede ser posterior a la fecha final'],
  ])('rechaza desde=%s hasta=%s', (desde, hasta, mensaje) => {
    expect(() => validarRango(desde, hasta)).toThrow(new ErrorReglaReporte(mensaje));
  });
});

describe('validarTipoReporte', () => {
  it('acepta los cuatro tipos y rechaza otros con NO_ENCONTRADO', () => {
    for (const tipo of ['ingresos', 'pagos', 'cartera', 'movimientos-uniformes']) {
      expect(validarTipoReporte(tipo)).toBe(tipo);
    }
    expect(() => validarTipoReporte('nomina')).toThrow(expect.objectContaining({ motivo: 'NO_ENCONTRADO' }));
  });
});

describe('reporteIngresos', () => {
  it('suma los pagos por concepto y resta los reembolsos de devoluciones parciales', () => {
    const reporte = reporteIngresos(
      encabezado,
      [
        { concepto: 'VENTA_UNIFORME', pagos: 2, valor: 390000 },
        { concepto: 'MENSUALIDAD', pagos: 1, valor: 180000 },
        { concepto: 'PRESTAMO_IMPLEMENTO', pagos: 1, valor: 15000 },
      ],
      { devoluciones: 1, valor: 55000 },
    );
    expect(total(reporte, 'ingresosBrutos')).toBe(585000);
    expect(total(reporte, 'reembolsos')).toBe(55000);
    expect(total(reporte, 'ingresosNetos')).toBe(530000);
    expect(total(reporte, 'ventasUniformes')).toBe(335000);
    // Ordenado como el catálogo de conceptos, con el reembolso al final y en negativo.
    expect(reporte.filas).toEqual([
      { concepto: 'Mensualidades', registros: 1, valor: 180000 },
      { concepto: 'Ventas de uniformes', registros: 2, valor: 390000 },
      { concepto: 'Préstamos de implementos', registros: 1, valor: 15000 },
      { concepto: 'Reembolsos por devoluciones parciales de uniformes', registros: 1, valor: -55000 },
    ]);
    expect(reporte.sinDatos).toBe(false);
  });

  it('sin datos: totales en cero y sinDatos', () => {
    const reporte = reporteIngresos(encabezado, [], { devoluciones: 0, valor: 0 });
    expect(reporte.sinDatos).toBe(true);
    expect(reporte.filas).toEqual([]);
    expect(reporte.totales.every((item) => item.valor === 0)).toBe(true);
    expect(reporte).toMatchObject({ tipo: 'ingresos', desde: '2026-11-01', hasta: '2026-11-30' });
  });
});

describe('reportePagos', () => {
  it('traduce tipo y medio, y totaliza por medio de pago', () => {
    const reporte = reportePagos(encabezado, [
      { fecha: '2026-11-03', comprobante: 'CP-000010', patinador: 'Juan Pablo González', tipo: 'COBRO', medio: 'EFECTIVO', referencia: null, monto: 15000 },
      { fecha: '2026-11-13', comprobante: 'CP-000008', patinador: 'Juan Pablo González', tipo: 'VENTA_UNIFORME', medio: 'CONSIGNACION', referencia: 'CON-4471', monto: 265000 },
    ]);
    expect(reporte.filas[1]).toMatchObject({ tipo: 'Venta de uniformes', medio: 'Consignación' });
    expect(total(reporte, 'pagos')).toBe(2);
    expect(total(reporte, 'total')).toBe(280000);
    expect(total(reporte, 'efectivo')).toBe(15000);
    expect(total(reporte, 'consignacion')).toBe(265000);
    expect(total(reporte, 'transferencia')).toBe(0);
  });
});

describe('reporteCartera', () => {
  it('omite saldos en cero y marca vencido si hay saldo vencido', () => {
    const reporte = reporteCartera(encabezado, [
      { patinador: 'Samuel Herrera Díaz', cobros: 3, vencimientoMasAntiguo: '2026-10-05', saldo: 471000, saldoVencido: 450000 },
      { patinador: 'Sofía Ramírez Torres', cobros: 1, vencimientoMasAntiguo: '2026-11-23', saldo: 14000, saldoVencido: 0 },
      { patinador: 'Mateo Ramírez Torres', cobros: 0, vencimientoMasAntiguo: '2026-11-05', saldo: 0, saldoVencido: 0 },
    ]);
    expect(reporte.filas.map((fila) => [fila.patinador, fila.estado])).toEqual([
      ['Samuel Herrera Díaz', 'Vencido'],
      ['Sofía Ramírez Torres', 'Pendiente'],
    ]);
    expect(total(reporte, 'saldoPendiente')).toBe(485000);
    expect(total(reporte, 'saldoVencido')).toBe(450000);
    expect(total(reporte, 'patinadores')).toBe(2);
    expect(reporte.notas[0]).toContain('2026-11-30');
  });
});

describe('reporteMovimientos', () => {
  it('cuenta unidades por tipo de movimiento y calcula ventas netas', () => {
    const reporte = reporteMovimientos(
      encabezado,
      [
        { fecha: '2026-11-13', referencia: 'CAM-OFI-M', talla: 'M', tipo: 'VENTA', cantidad: -1, valor: 55000, observacion: 'Venta #3', registradoPor: 'Andrea López' },
        { fecha: '2026-11-13', referencia: 'UNI-COMP-M', talla: 'M', tipo: 'VENTA', cantidad: -1, valor: 210000, observacion: 'Venta #3', registradoPor: 'Andrea López' },
        { fecha: '2026-11-15', referencia: 'CAM-OFI-M', talla: 'M', tipo: 'DEVOLUCION', cantidad: 1, valor: null, observacion: null, registradoPor: 'Andrea López' },
        { fecha: '2026-11-16', referencia: 'ROD-PAT-U', talla: 'UNICA', tipo: 'PRESTAMO', cantidad: -2, valor: null, observacion: null, registradoPor: 'Andrea López' },
      ],
      { valorVentas: 265000, valorDevuelto: 55000 },
    );
    expect(reporte.filas[0]).toMatchObject({ tipo: 'Venta', cantidad: -1 });
    expect(total(reporte, 'unidadesVendidas')).toBe(2);
    expect(total(reporte, 'unidadesPrestadas')).toBe(2);
    expect(total(reporte, 'unidadesDevueltas')).toBe(1);
    expect(total(reporte, 'ventasNetas')).toBe(210000);
  });
});
