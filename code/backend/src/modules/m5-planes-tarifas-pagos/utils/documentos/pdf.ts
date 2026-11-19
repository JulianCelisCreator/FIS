import PDFDocument from 'pdfkit';

/** Colores de la identidad Velora (code/frontend/DESIGN.md). */
export const COLOR = {
  rink: '#0a2f8f',
  ink: '#071433',
  muted: '#526489',
  line: '#b8c7e8',
  ice: '#edf3ff',
  signal: '#ffd21e',
  alert: '#b3261e',
  white: '#f7f9ff',
};

/** Crea un PDF y devuelve su contenido cuando `dibujar` termina. */
export function generarPdf(
  opciones: PDFKit.PDFDocumentOptions,
  dibujar: (doc: PDFKit.PDFDocument) => void,
): Promise<Buffer> {
  return new Promise((resolver, rechazar) => {
    const doc = new PDFDocument({ ...opciones, bufferPages: true });
    const partes: Buffer[] = [];
    doc.on('data', (parte: Buffer) => partes.push(parte));
    doc.on('end', () => resolver(Buffer.concat(partes)));
    doc.on('error', rechazar);
    try {
      dibujar(doc);
      doc.end();
    } catch (error) {
      rechazar(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/** Banda superior con la marca de Velora y el nombre del documento. */
export function encabezado(doc: PDFKit.PDFDocument, titulo: string): void {
  const ancho = doc.page.width;
  doc.rect(0, 0, ancho, 64).fill(COLOR.rink);
  doc.rect(0, 64, ancho, 3).fill(COLOR.signal);
  doc.fillColor(COLOR.white).font('Helvetica-Bold').fontSize(18).text('VELORA', doc.page.margins.left, 20);
  doc.font('Helvetica').fontSize(8).text('ESCUELA DE PATINAJE', doc.page.margins.left, 41, { characterSpacing: 1.2 });
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(titulo.toUpperCase(), doc.page.margins.left, 27, {
      width: ancho - doc.page.margins.left - doc.page.margins.right,
      align: 'right',
      characterSpacing: 0.8,
    });
  doc.fillColor(COLOR.ink).font('Helvetica');
  doc.y = 96;
}

/** «Página n de m» al pie de cada página (requiere bufferPages). */
export function numerarPaginas(doc: PDFKit.PDFDocument, nota: string): void {
  const rango = doc.bufferedPageRange();
  for (let i = rango.start; i < rango.start + rango.count; i++) {
    doc.switchToPage(i);
    // El pie va dentro del margen inferior; sin quitarlo, pdfkit abriría una página nueva.
    const margenInferior = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = doc.page.height - margenInferior + 16;
    const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc.fillColor(COLOR.muted).font('Helvetica').fontSize(8);
    doc.text(nota, doc.page.margins.left, y, { width: ancho, align: 'left', lineBreak: false });
    doc.text(`Página ${i + 1} de ${rango.count}`, doc.page.margins.left, y, {
      width: ancho,
      align: 'right',
      lineBreak: false,
    });
    doc.page.margins.bottom = margenInferior;
  }
}
