// Exportación de reportes financieros a PDF y XLSX (HU-6.5 / RF-M6-05). Recibe
// el mismo objeto Reporte que muestra la pantalla (HU-6.4), así que el archivo
// tiene exactamente los mismos valores. Contenido: título, período, fecha y
// hora de generación, notas, totales y detalle. Solo los datos del reporte:
// nada de documentos ni contactos de patinadores o acudientes (Ley 1581).
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type { FormatoValor, Reporte, TipoReporte } from './reglas-reporte.js';

export const FORMATOS_EXPORTACION = ['pdf', 'xlsx'] as const;
export type FormatoExportacion = (typeof FORMATOS_EXPORTACION)[number];

export const TIPO_CONTENIDO: Record<FormatoExportacion, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const NOMBRE_TIPO: Record<TipoReporte, string> = {
  ingresos: 'Ingresos',
  pagos: 'Pagos',
  cartera: 'Cartera',
  'movimientos-uniformes': 'MovimientosUniformes',
};

/** Reporte_<Tipo>_<AAAA-MM-DD>_<AAAA-MM-DD>.<ext>, como pide la HU-6.5. */
export function nombreArchivo(reporte: Pick<Reporte, 'tipo' | 'desde' | 'hasta'>, formato: FormatoExportacion): string {
  return `Reporte_${NOMBRE_TIPO[reporte.tipo]}_${reporte.desde}_${reporte.hasta}.${formato}`;
}

// --- Formatos de texto (iguales a los de la pantalla) --------------------------

const fechaHoraClub = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});
const numero = new Intl.NumberFormat('es-CO');

function pesos(valor: number): string {
  const absoluto = Math.trunc(Math.abs(valor)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${valor < 0 ? '- ' : ''}$ ${absoluto}`;
}

function fecha(iso: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : iso;
}

export function textoValor(valor: string | number | null | undefined, formato: FormatoValor): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (formato === 'cop') return pesos(Number(valor));
  if (formato === 'numero') return numero.format(Number(valor));
  if (formato === 'fecha') return fecha(String(valor));
  return String(valor);
}

function lineaPeriodo(reporte: Reporte): string {
  return `Período: ${fecha(reporte.desde)} – ${fecha(reporte.hasta)}`;
}

function lineaGeneracion(reporte: Reporte): string {
  return `Generado el ${fechaHoraClub.format(new Date(reporte.generadoEn))}`;
}

// --- XLSX ----------------------------------------------------------------------

const FORMATO_COP = '"$" #,##0;-"$" #,##0';

function celdaXlsx(valor: string | number | null | undefined, formato: FormatoValor): ExcelJS.CellValue {
  if (valor === null || valor === undefined || valor === '') return null;
  if (formato === 'cop' || formato === 'numero') return Number(valor);
  if (formato === 'fecha') {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor));
    return partes ? new Date(Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]))) : String(valor);
  }
  return String(valor);
}

function formatoCelda(formato: FormatoValor): string | undefined {
  if (formato === 'cop') return FORMATO_COP;
  if (formato === 'numero') return '#,##0';
  if (formato === 'fecha') return 'dd/mm/yyyy';
  return undefined;
}

export async function generarXlsx(reporte: Reporte): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Velora · Módulo 6';
  libro.created = new Date(reporte.generadoEn);
  const hoja = libro.addWorksheet('Reporte');

  hoja.addRow([reporte.titulo]).font = { bold: true, size: 14 };
  hoja.addRow([lineaPeriodo(reporte)]);
  hoja.addRow([lineaGeneracion(reporte)]);
  for (const nota of reporte.notas) hoja.addRow([nota]).font = { italic: true };
  if (reporte.sinDatos) hoja.addRow(['No hay registros en el período; los totales aparecen en cero.']).font = { italic: true };
  hoja.addRow([]);

  hoja.addRow(['Totales']).font = { bold: true };
  for (const total of reporte.totales) {
    const fila = hoja.addRow([total.etiqueta, total.valor]);
    fila.getCell(2).numFmt = formatoCelda(total.formato) ?? '';
  }
  hoja.addRow([]);

  hoja.addRow(['Detalle']).font = { bold: true };
  const encabezado = hoja.addRow(reporte.columnas.map((columna) => columna.etiqueta));
  encabezado.font = { bold: true };
  encabezado.eachCell((celda) => {
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8ECEF' } };
    celda.border = { bottom: { style: 'thin' } };
  });
  for (const filaDatos of reporte.filas) {
    const fila = hoja.addRow(reporte.columnas.map((columna) => celdaXlsx(filaDatos[columna.clave], columna.formato)));
    reporte.columnas.forEach((columna, indice) => {
      const formato = formatoCelda(columna.formato);
      if (formato) fila.getCell(indice + 1).numFmt = formato;
    });
  }

  reporte.columnas.forEach((columna, indice) => {
    const largos = [columna.etiqueta, ...reporte.filas.map((fila) => textoValor(fila[columna.clave], columna.formato))]
      .map((texto) => texto.length);
    hoja.getColumn(indice + 1).width = Math.min(60, Math.max(12, ...largos) + 2);
  });
  hoja.getColumn(1).width = Math.max(hoja.getColumn(1).width ?? 12, 28);

  return Buffer.from(await libro.xlsx.writeBuffer());
}

// --- PDF -----------------------------------------------------------------------

const MARGEN = 40;
const ALTO_FILA = 18;

export function generarPdf(reporte: Reporte): Promise<Buffer> {
  return new Promise((resolver, rechazar) => {
    const horizontal = reporte.columnas.length > 5;
    const doc = new PDFDocument({
      size: 'A4',
      layout: horizontal ? 'landscape' : 'portrait',
      margin: MARGEN,
      bufferPages: true,
      info: { Title: reporte.titulo, Author: 'Velora · Módulo 6', CreationDate: new Date(reporte.generadoEn) },
    });
    const partes: Buffer[] = [];
    doc.on('data', (parte: Buffer) => partes.push(parte));
    doc.on('end', () => resolver(Buffer.concat(partes)));
    doc.on('error', rechazar);

    const ancho = doc.page.width - MARGEN * 2;
    const limiteInferior = () => doc.page.height - MARGEN - 20;

    // Encabezado
    doc.font('Helvetica-Bold').fontSize(16).text(reporte.titulo);
    doc.font('Helvetica').fontSize(10).fillColor('#333333').text(lineaPeriodo(reporte)).text(lineaGeneracion(reporte));
    for (const nota of reporte.notas) doc.font('Helvetica-Oblique').fontSize(9).text(nota);
    if (reporte.sinDatos) {
      doc.moveDown(0.5).font('Helvetica-Oblique').fontSize(10)
        .text('No hay registros en el período; los totales aparecen en cero.');
    }

    // Totales
    doc.moveDown().font('Helvetica-Bold').fontSize(11).fillColor('#000000').text('Totales');
    doc.moveDown(0.3);
    for (const total of reporte.totales) {
      const y = doc.y;
      doc.font('Helvetica').fontSize(10).text(total.etiqueta, MARGEN, y, { width: ancho * 0.6 });
      doc.font('Helvetica-Bold').text(textoValor(total.valor, total.formato), MARGEN + ancho * 0.6, y, {
        width: ancho * 0.4, align: 'right',
      });
      doc.moveDown(0.2);
    }

    // Detalle
    if (!reporte.sinDatos) {
      doc.moveDown().font('Helvetica-Bold').fontSize(11).text('Detalle', MARGEN);
      doc.moveDown(0.3);
      const anchos = anchosColumnas(reporte, ancho);
      const alineacion = (formato: FormatoValor) => (formato === 'cop' || formato === 'numero' ? 'right' : 'left');

      const fila = (valores: string[], negrita: boolean, fondo?: string) => {
        if (doc.y + ALTO_FILA > limiteInferior()) doc.addPage();
        const y = doc.y;
        if (fondo) doc.rect(MARGEN, y - 3, ancho, ALTO_FILA).fill(fondo).fillColor('#000000');
        let x = MARGEN;
        valores.forEach((valor, indice) => {
          doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).text(valor, x + 3, y, {
            width: anchos[indice] - 6,
            height: ALTO_FILA - 4,
            ellipsis: true,
            lineBreak: false,
            align: alineacion(reporte.columnas[indice].formato),
          });
          x += anchos[indice];
        });
        doc.x = MARGEN;
        doc.y = y + ALTO_FILA;
      };

      const encabezado = () => fila(reporte.columnas.map((columna) => columna.etiqueta), true, '#E8ECEF');
      encabezado();
      reporte.filas.forEach((datos, indice) => {
        if (doc.y + ALTO_FILA > limiteInferior()) {
          doc.addPage();
          encabezado();
        }
        fila(
          reporte.columnas.map((columna) => textoValor(datos[columna.clave], columna.formato)),
          false,
          indice % 2 === 1 ? '#F6F8F9' : undefined,
        );
      });
    }

    // Pie con número de página
    const paginas = doc.bufferedPageRange();
    for (let i = 0; i < paginas.count; i++) {
      doc.switchToPage(paginas.start + i);
      // Sin margen inferior para que el pie no cree una página nueva.
      doc.page.margins.bottom = 0;
      doc.font('Helvetica').fontSize(8).fillColor('#666666').text(
        `${reporte.titulo} · Página ${i + 1} de ${paginas.count}`,
        MARGEN, doc.page.height - MARGEN + 12, { width: ancho, align: 'center', lineBreak: false },
      );
    }
    doc.end();
  });
}

/** Reparte el ancho según el contenido, con un mínimo por columna. */
function anchosColumnas(reporte: Reporte, ancho: number): number[] {
  const pesos = reporte.columnas.map((columna) => {
    const largos = [columna.etiqueta, ...reporte.filas.slice(0, 200).map((fila) => textoValor(fila[columna.clave], columna.formato))]
      .map((texto) => texto.length);
    return Math.min(40, Math.max(8, ...largos));
  });
  const totalPesos = pesos.reduce((suma, peso) => suma + peso, 0);
  return pesos.map((peso) => (peso / totalPesos) * ancho);
}
