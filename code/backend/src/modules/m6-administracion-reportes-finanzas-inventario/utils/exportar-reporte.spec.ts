import ExcelJS from 'exceljs';
import { generarPdf, generarXlsx, nombreArchivo, textoValor } from './exportar-reporte.js';
import { reporteIngresos, reportePagos, type Reporte } from './reglas-reporte.js';

const encabezado = { desde: '2026-11-01', hasta: '2026-11-30', generadoEn: '2026-11-18T20:30:00.000Z' };

const ingresos = reporteIngresos(
  encabezado,
  [
    { concepto: 'MENSUALIDAD', pagos: 1, valor: 180000 },
    { concepto: 'VENTA_UNIFORME', pagos: 2, valor: 390000 },
  ],
  { devoluciones: 1, valor: 55000 },
);

async function leerXlsx(contenido: Buffer): Promise<ExcelJS.Worksheet> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(contenido as unknown as ArrayBuffer);
  return libro.getWorksheet('Reporte')!;
}

function filasComoTexto(hoja: ExcelJS.Worksheet): unknown[][] {
  const filas: unknown[][] = [];
  hoja.eachRow((fila) => filas.push((fila.values as unknown[]).slice(1)));
  return filas;
}

describe('nombreArchivo', () => {
  it('sigue el formato Reporte_<Tipo>_<desde>_<hasta>', () => {
    expect(nombreArchivo(ingresos, 'pdf')).toBe('Reporte_Ingresos_2026-11-01_2026-11-30.pdf');
    expect(nombreArchivo({ ...ingresos, tipo: 'movimientos-uniformes' }, 'xlsx'))
      .toBe('Reporte_MovimientosUniformes_2026-11-01_2026-11-30.xlsx');
  });
});

describe('textoValor', () => {
  it('formatea pesos, números, fechas y vacíos como la pantalla', () => {
    expect(textoValor(1234567, 'cop')).toBe('$ 1.234.567');
    expect(textoValor(-55000, 'cop')).toBe('- $ 55.000');
    expect(textoValor('2026-11-05', 'fecha')).toBe('05/11/2026');
    expect(textoValor(null, 'texto')).toBe('—');
  });
});

describe('generarXlsx', () => {
  it('incluye título, período, generación, totales y detalle con los mismos valores', async () => {
    const hoja = await leerXlsx(await generarXlsx(ingresos));
    const filas = filasComoTexto(hoja);
    expect(filas[0]).toEqual(['Reporte de ingresos']);
    expect(filas[1]).toEqual(['Período: 01/11/2026 – 30/11/2026']);
    expect(String(filas[2][0])).toMatch(/^Generado el /);
    // Totales con valores numéricos (no texto) para poder sumarlos en Excel.
    expect(filas).toContainEqual(['Pagos registrados', 570000]);
    expect(filas).toContainEqual(['Total de ingresos', 515000]);
    // Encabezado del detalle y filas, incluido el reembolso en negativo.
    expect(filas).toContainEqual(['Concepto', 'Registros', 'Valor']);
    expect(filas).toContainEqual(['Ventas de uniformes', 2, 390000]);
    expect(filas).toContainEqual(['Reembolsos por devoluciones parciales de uniformes', 1, -55000]);
  });

  it('las fechas del detalle son fechas reales de Excel', async () => {
    const pagos = reportePagos(encabezado, [
      { fecha: '2026-11-13', comprobante: 'CP-000008', patinador: 'Juan Pablo González', tipo: 'VENTA_UNIFORME', medio: 'CONSIGNACION', referencia: 'CON-4471', monto: 265000 },
    ]);
    const hoja = await leerXlsx(await generarXlsx(pagos));
    const fila = filasComoTexto(hoja).find((valores) => valores[1] === 'CP-000008')!;
    expect(fila[0]).toEqual(new Date(Date.UTC(2026, 10, 13)));
    expect(fila[6]).toBe(265000);
  });

  it('sin datos: totales en cero y aviso', async () => {
    const vacio = reporteIngresos(encabezado, [], { devoluciones: 0, valor: 0 });
    const filas = filasComoTexto(await leerXlsx(await generarXlsx(vacio)));
    expect(filas).toContainEqual(['No hay registros en el período; los totales aparecen en cero.']);
    expect(filas).toContainEqual(['Total de ingresos', 0]);
  });
});

describe('generarPdf', () => {
  it('produce un PDF válido', async () => {
    const pdf = await generarPdf(ingresos);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.subarray(-6).toString()).toContain('%%EOF');
  });

  it('genera 1.000 filas en varias páginas en menos de 5 segundos', async () => {
    const muchos: Reporte = reportePagos(
      encabezado,
      Array.from({ length: 1000 }, (_, i) => ({
        fecha: '2026-11-13', comprobante: `CP-${String(i).padStart(6, '0')}`, patinador: 'Patinadora de prueba con un nombre largo',
        tipo: 'COBRO', medio: 'EFECTIVO', referencia: null, monto: 180000,
      })),
    );
    const inicio = performance.now();
    const pdf = await generarPdf(muchos);
    expect(performance.now() - inicio).toBeLessThan(5000);
    const paginas = pdf.toString('latin1').match(/\/Type \/Page\b/g)?.length ?? 0;
    expect(paginas).toBeGreaterThan(10);
  });
});
