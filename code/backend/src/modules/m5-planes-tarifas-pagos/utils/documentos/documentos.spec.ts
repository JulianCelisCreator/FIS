import ExcelJS from 'exceljs';
import type { DatosComprobante, FilaPago } from '../../repositories/consultas-pagos.repository.js';
import { MedioPago } from '../../enums/medio-pago.enum.js';
import { comprobantePdf } from './comprobante-pdf.js';
import { cop, fecha, mesAnio, nombreCobro } from './formato.js';
import { historialPdf, historialXlsx, totalSinAnulados } from './historial.js';

const pago = (id: number, monto: number, estado: FilaPago['estado']): FilaPago => ({
  pagoId: id,
  fechaPago: '2026-11-07',
  comprobante: `CP-00000${id}`,
  estadoComprobante: estado === 'ANULADO' ? 'ANULADO' : 'VIGENTE',
  patinadorId: 1,
  patinador: 'Samuel Herrera Díaz',
  acudientes: 'Luis Herrera',
  tipo: 'COBRO',
  monto,
  medioPago: MedioPago.TRANSFERENCIA,
  referencia: 'TRX-1',
  numeroSesiones: null,
  registradoPor: 'Martha Gómez',
  registradoEn: new Date('2026-11-07T15:00:00Z'),
  estado,
  anuladoPor: estado === 'ANULADO' ? 'Andrea López' : null,
  anuladoEn: estado === 'ANULADO' ? new Date('2026-11-08T15:00:00Z') : null,
  motivoAnulacion: estado === 'ANULADO' ? 'Valor mal digitado' : null,
  cobros: [{ concepto: 'MENSUALIDAD', descripcion: 'Mensualidad', periodo: '2026-10-01', fechaLimite: '2026-10-05', montoAplicado: monto }],
});

const contexto = { filtros: 'todos los pagos', generadoPor: 'Andrea López', generadoEn: new Date() };

describe('formatos de los documentos', () => {
  it('escribe pesos, fechas y meses en español de Colombia', () => {
    expect(cop(1620000)).toBe('$ 1.620.000');
    expect(cop(0)).toBe('$ 0');
    expect(fecha('2026-09-05')).toBe('05/09/2026');
    expect(mesAnio('2026-08-01')).toBe('Agosto 2026');
  });

  it('nombra la mensualidad por su mes y los demás cobros por su descripción', () => {
    expect(nombreCobro({ concepto: 'MENSUALIDAD', descripcion: 'x', periodo: '2026-12-01' })).toBe('Diciembre 2026');
    expect(nombreCobro({ concepto: 'MATRICULA', descripcion: 'Matrícula', periodo: null })).toBe('Matrícula');
  });
});

describe('historial de pagos', () => {
  const pagos = [pago(3, 200000, 'REGISTRADO'), pago(2, 15000, 'ANULADO'), pago(1, 150000, 'REGISTRADO')];

  it('el total no suma los pagos anulados', () => {
    expect(totalSinAnulados(pagos)).toBe(350000);
  });

  it('genera un PDF válido, también sin pagos', async () => {
    expect((await historialPdf(pagos, contexto)).subarray(0, 4).toString()).toBe('%PDF');
    expect((await historialPdf([], contexto)).subarray(0, 4).toString()).toBe('%PDF');
  });

  it('genera un XLSX con fechas reales, montos numéricos y el total sin anulados', async () => {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(await historialXlsx(pagos, contexto));
    const hoja = libro.getWorksheet('Historial de pagos')!;
    expect(hoja.getRow(4).getCell(1).value).toBe('Comprobante');
    expect(hoja.getCell('B5').value).toEqual(new Date(Date.UTC(2026, 10, 7)));
    expect(hoja.getCell('F5').value).toBe(200000);
    expect(hoja.getCell('J6').value).toBe('Anulado');
    expect(hoja.getCell('K6').value).toBe('Valor mal digitado');
    expect(hoja.getCell('F8').value).toBe(350000);
  });
});

describe('comprobante de pago en PDF', () => {
  const datos: DatosComprobante = {
    pagoId: 3,
    numero: 'CP-000482',
    estadoComprobante: 'VIGENTE',
    patinadorId: 1,
    patinador: 'Samuel Herrera Díaz',
    documento: 'TI 1012345678',
    acudientes: 'Luis Herrera',
    tipo: 'COBRO',
    fechaPago: '2026-09-30',
    monto: 200000,
    medioPago: MedioPago.TRANSFERENCIA,
    referencia: 'TRF-88210345',
    numeroSesiones: null,
    registradoPor: 'Jorge Méndez',
    rolesRegistro: 'Contador',
    registradoEn: new Date('2026-09-30T15:14:00Z'),
    estado: 'REGISTRADO',
    anuladoPor: null,
    anuladoEn: null,
    motivoAnulacion: null,
    cobros: [
      {
        concepto: 'MENSUALIDAD',
        descripcion: 'Mensualidad',
        periodo: '2026-08-01',
        plan: 'Competencia 6 días',
        valor: 300000,
        pagosAnteriores: 0,
        estePago: 200000,
        saldoRestante: 100000,
      },
    ],
  };

  it('genera un PDF válido en menos de 5 segundos', async () => {
    const inicio = Date.now();
    const pdf = await comprobantePdf(datos);
    expect(Date.now() - inicio).toBeLessThan(5000);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('genera también el de un pago anulado y el de un pago por sesión', async () => {
    const anulado = await comprobantePdf({
      ...datos,
      estado: 'ANULADO',
      estadoComprobante: 'ANULADO',
      anuladoPor: 'Andrea López',
      anuladoEn: new Date(),
      motivoAnulacion: 'Se digitó mal el valor',
    });
    const sesion = await comprobantePdf({ ...datos, tipo: 'SESION', numeroSesiones: 4, monto: 140000 });
    expect(anulado.subarray(0, 4).toString()).toBe('%PDF');
    expect(sesion.subarray(0, 4).toString()).toBe('%PDF');
  });
});
