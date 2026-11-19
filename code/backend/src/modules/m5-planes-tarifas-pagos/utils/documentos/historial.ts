import ExcelJS from 'exceljs';
import type { FilaPago } from '../../repositories/consultas-pagos.repository.js';
import { cop, fecha, fechaHora, medio, nombreCobro } from './formato.js';
import { COLOR, encabezado, generarPdf, numerarPaginas } from './pdf.js';

/** Resumen de los filtros aplicados, para dejarlo escrito en el documento. */
export interface ContextoExportacion {
  filtros: string;
  generadoPor: string;
  generadoEn: Date;
}

/** Los pagos anulados siguen en el historial, pero no suman al total. */
export function totalSinAnulados(pagos: FilaPago[]): number {
  return pagos.filter((p) => p.estado === 'REGISTRADO').reduce((suma, p) => suma + p.monto, 0);
}

function cobroAplicado(pago: FilaPago): string {
  if (pago.tipo === 'SESION' && pago.numeroSesiones) return `${pago.numeroSesiones} sesión(es)`;
  return pago.cobros.map(nombreCobro).join(', ') || '—';
}

const COLUMNAS: { titulo: string; ancho: number; derecha?: boolean; valor: (p: FilaPago) => string }[] = [
  { titulo: 'Comprobante', ancho: 74, valor: (p) => p.comprobante ?? '—' },
  { titulo: 'Fecha', ancho: 62, valor: (p) => fecha(p.fechaPago) },
  { titulo: 'Patinador', ancho: 120, valor: (p) => p.patinador },
  { titulo: 'Cobro aplicado', ancho: 110, valor: cobroAplicado },
  { titulo: 'Monto', ancho: 70, derecha: true, valor: (p) => cop(p.monto) },
  { titulo: 'Medio', ancho: 82, valor: (p) => medio(p.medioPago) },
  { titulo: 'Registró', ancho: 100, valor: (p) => p.registradoPor },
  { titulo: 'Estado', ancho: 62, valor: (p) => (p.estado === 'ANULADO' ? 'Anulado' : 'Registrado') },
];

/** Historial de pagos en PDF horizontal, con los filtros y el total sin anulados. */
export function historialPdf(pagos: FilaPago[], contexto: ContextoExportacion): Promise<Buffer> {
  return generarPdf(
    {
      size: 'LETTER',
      layout: 'landscape',
      margins: { top: 40, bottom: 50, left: 40, right: 40 },
      info: { Title: 'Historial de pagos', Author: 'Velora' },
    },
    (doc) => {
      const izquierda = doc.page.margins.left;
      const ancho = doc.page.width - izquierda - doc.page.margins.right;
      const escala = ancho / COLUMNAS.reduce((suma, c) => suma + c.ancho, 0);
      const anchos = COLUMNAS.map((c) => c.ancho * escala);
      const limite = () => doc.page.height - doc.page.margins.bottom - 20;

      const cabeceraTabla = () => {
        const y = doc.y;
        doc.rect(izquierda, y, ancho, 20).fill(COLOR.ice);
        doc.fillColor(COLOR.muted).font('Helvetica').fontSize(7.5);
        let x = izquierda;
        COLUMNAS.forEach((columna, i) => {
          doc.text(columna.titulo.toUpperCase(), x + 4, y + 7, {
            width: anchos[i] - 8,
            align: columna.derecha ? 'right' : 'left',
            characterSpacing: 0.6,
          });
          x += anchos[i];
        });
        doc.y = y + 26;
      };

      encabezado(doc, 'Historial de pagos');
      doc.fillColor(COLOR.ink).font('Helvetica').fontSize(9);
      doc.text(`Filtros: ${contexto.filtros}`, izquierda, doc.y, { width: ancho });
      doc
        .fillColor(COLOR.muted)
        .text(`Generado por ${contexto.generadoPor} · ${fechaHora(contexto.generadoEn)}`, { width: ancho });
      doc.y += 10;

      if (pagos.length === 0) {
        doc.fillColor(COLOR.ink).fontSize(11).text('No hay pagos con esos filtros.', izquierda, doc.y);
      } else {
        cabeceraTabla();
        for (const pago of pagos) {
          doc.font('Helvetica').fontSize(8.5);
          const alto = Math.max(
            ...COLUMNAS.map((columna, i) => doc.heightOfString(columna.valor(pago), { width: anchos[i] - 8 })),
          );
          if (doc.y + alto + 8 > limite()) {
            doc.addPage();
            doc.y = doc.page.margins.top;
            cabeceraTabla();
          }
          const y = doc.y;
          doc.fillColor(pago.estado === 'ANULADO' ? COLOR.muted : COLOR.ink);
          let x = izquierda;
          COLUMNAS.forEach((columna, i) => {
            doc.text(columna.valor(pago), x + 4, y, { width: anchos[i] - 8, align: columna.derecha ? 'right' : 'left' });
            x += anchos[i];
          });
          doc.y = y + alto + 4;
          doc.moveTo(izquierda, doc.y).lineTo(izquierda + ancho, doc.y).lineWidth(0.5).strokeColor(COLOR.line).stroke();
          doc.y += 4;
        }
        const registrados = pagos.filter((p) => p.estado === 'REGISTRADO').length;
        doc.y += 6;
        doc
          .fillColor(COLOR.ink)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(`Total sin anulados · ${registrados} pagos: ${cop(totalSinAnulados(pagos))}`, izquierda, doc.y, {
            width: ancho,
            align: 'right',
          });
      }

      numerarPaginas(doc, 'Velora · Historial de pagos. Los pagos anulados no suman al total.');
    },
  );
}

/** 'AAAA-MM-DD' → fecha de Excel (UTC, para que no se corra el día). */
function fechaExcel(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

/** Historial de pagos en XLSX: montos como número y fechas como fecha, listos para filtrar y sumar. */
export async function historialXlsx(pagos: FilaPago[], contexto: ContextoExportacion): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Velora';
  libro.created = contexto.generadoEn;
  const hoja = libro.addWorksheet('Historial de pagos', { views: [{ state: 'frozen', ySplit: 4 }] });

  hoja.getCell('A1').value = 'Historial de pagos';
  hoja.getCell('A1').font = { bold: true, size: 14 };
  hoja.getCell('A2').value = `Filtros: ${contexto.filtros}`;
  hoja.getCell('A3').value = `Generado por ${contexto.generadoPor} · ${fechaHora(contexto.generadoEn)}`;

  const encabezados = [
    'Comprobante', 'Fecha', 'Patinador', 'Acudiente', 'Cobro aplicado', 'Monto (COP)',
    'Medio', 'Referencia', 'Registró', 'Estado', 'Motivo de anulación',
  ];
  const filaTitulos = hoja.getRow(4);
  filaTitulos.values = encabezados;
  filaTitulos.font = { bold: true, color: { argb: 'FFF7F9FF' } };
  filaTitulos.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A2F8F' } };

  for (const pago of pagos) {
    hoja.addRow([
      pago.comprobante ?? '',
      fechaExcel(pago.fechaPago),
      pago.patinador,
      pago.acudientes,
      cobroAplicado(pago),
      pago.monto,
      medio(pago.medioPago),
      pago.referencia ?? '',
      pago.registradoPor,
      pago.estado === 'ANULADO' ? 'Anulado' : 'Registrado',
      pago.motivoAnulacion ?? '',
    ]);
  }
  const filaTotal = hoja.addRow(['', '', '', '', 'Total sin anulados', totalSinAnulados(pagos)]);
  filaTotal.font = { bold: true };

  hoja.getColumn(2).numFmt = 'dd/mm/yyyy';
  hoja.getColumn(6).numFmt = '"$" #,##0';
  [14, 12, 28, 26, 26, 14, 14, 18, 22, 12, 36].forEach((ancho, i) => {
    hoja.getColumn(i + 1).width = ancho;
  });
  hoja.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: encabezados.length } };

  return Buffer.from(await libro.xlsx.writeBuffer());
}
