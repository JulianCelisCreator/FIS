import type { DatosComprobante } from '../../repositories/consultas-pagos.repository.js';
import { cop, fecha, fechaHora, medio, nombreCobro } from './formato.js';
import { COLOR, encabezado, generarPdf, numerarPaginas } from './pdf.js';

const NOTA = 'Soporte interno de pago. No es factura electrónica.';

/**
 * Comprobante de pago en PDF (RF-M5-15), con los datos del wireframe
 * comprobante.html: número, patinador, conceptos con el saldo al momento del
 * pago y quién lo registró. Un pago anulado conserva su número y muestra el
 * motivo, el usuario y la fecha de la anulación.
 */
export function comprobantePdf(datos: DatosComprobante): Promise<Buffer> {
  return generarPdf(
    {
      size: 'LETTER',
      margins: { top: 48, bottom: 56, left: 56, right: 56 },
      info: { Title: `Comprobante de pago N.º ${datos.numero}`, Author: 'Velora' },
    },
    (doc) => {
      const izquierda = doc.page.margins.left;
      const ancho = doc.page.width - izquierda - doc.page.margins.right;
      encabezado(doc, 'Comprobante de pago');

      // Número, fecha y estado.
      const yNumero = doc.y;
      doc.fillColor(COLOR.muted).fontSize(8).text('COMPROBANTE N.º', izquierda, yNumero, { characterSpacing: 1 });
      doc.fillColor(COLOR.ink).font('Helvetica-Bold').fontSize(20).text(datos.numero, izquierda, yNumero + 11);
      doc.font('Helvetica').fontSize(9).fillColor(COLOR.muted).text('FECHA DE PAGO', izquierda, yNumero, {
        width: ancho,
        align: 'right',
        characterSpacing: 1,
      });
      doc.fillColor(COLOR.ink).fontSize(12).text(fecha(datos.fechaPago), izquierda, yNumero + 13, {
        width: ancho,
        align: 'right',
      });
      doc.y = yNumero + 44;

      if (datos.estado === 'ANULADO') {
        const yAnulado = doc.y;
        doc.rect(izquierda, yAnulado, ancho, 46).lineWidth(1).strokeColor(COLOR.alert).stroke();
        doc.fillColor(COLOR.alert).font('Helvetica-Bold').fontSize(11).text('PAGO ANULADO', izquierda + 10, yAnulado + 8);
        doc.font('Helvetica').fontSize(9).text(
          `Motivo: ${datos.motivoAnulacion ?? '—'} · ${datos.anuladoPor ?? '—'}` +
            (datos.anuladoEn ? ` · ${fechaHora(datos.anuladoEn)}` : ''),
          izquierda + 10,
          yAnulado + 24,
          { width: ancho - 20 },
        );
        doc.y = yAnulado + 58;
      }

      // Datos del pago.
      const primerCobro = datos.cobros[0];
      const filas: [string, string][] = [
        ['Patinador', datos.patinador],
        ['Documento', datos.documento],
        ['Acudiente', datos.acudientes || '— (mayor de edad)'],
      ];
      if (primerCobro?.plan) filas.push(['Plan', primerCobro.plan]);
      if (datos.tipo === 'SESION' && datos.numeroSesiones) {
        const valorSesion = datos.monto / datos.numeroSesiones;
        filas.push(['Sesiones', `${datos.numeroSesiones} × ${cop(valorSesion)}`]);
      } else if (primerCobro) {
        filas.push(['Periodo', datos.cobros.map(nombreCobro).join(', ')]);
      }
      filas.push(['Medio de pago', medio(datos.medioPago) + (datos.referencia ? ` · ${datos.referencia}` : '')]);

      doc.moveTo(izquierda, doc.y).lineTo(izquierda + ancho, doc.y).lineWidth(1).strokeColor(COLOR.line).stroke();
      doc.y += 10;
      for (const [etiqueta, valor] of filas) {
        const y = doc.y;
        doc.fillColor(COLOR.muted).font('Helvetica').fontSize(8).text(etiqueta.toUpperCase(), izquierda, y + 2, {
          width: 130,
          characterSpacing: 0.8,
        });
        doc.fillColor(COLOR.ink).fontSize(11).text(valor, izquierda + 140, y, { width: ancho - 140 });
        doc.y = Math.max(doc.y, y + 16) + 6;
      }

      // Conceptos: valor del cobro, pagos anteriores, este pago y saldo restante.
      doc.y += 8;
      const yTabla = doc.y;
      doc.rect(izquierda, yTabla, ancho, 22).fill(COLOR.ice);
      doc.fillColor(COLOR.muted).font('Helvetica').fontSize(8);
      doc.text('CONCEPTO', izquierda + 8, yTabla + 8, { characterSpacing: 0.8 });
      doc.text('VALOR', izquierda, yTabla + 8, { width: ancho - 8, align: 'right', characterSpacing: 0.8 });
      doc.y = yTabla + 30;

      const fila = (concepto: string, valor: string, negrita = false) => {
        const y = doc.y;
        doc.fillColor(COLOR.ink).font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(10.5);
        doc.text(concepto, izquierda + 8, y, { width: ancho - 140 });
        doc.text(valor, izquierda, y, { width: ancho - 8, align: 'right' });
        doc.y = Math.max(doc.y, y + 14) + 6;
      };
      for (const cobro of datos.cobros) {
        const nombre = nombreCobro(cobro);
        fila(`Valor del cobro (${nombre})`, cop(cobro.valor));
        if (datos.tipo === 'COBRO') fila('Pagos anteriores', cop(cobro.pagosAnteriores));
        fila('Este pago', cop(cobro.estePago));
        if (datos.tipo === 'COBRO') fila('Saldo restante del cobro', cop(cobro.saldoRestante));
      }
      doc.moveTo(izquierda, doc.y).lineTo(izquierda + ancho, doc.y).lineWidth(1).strokeColor(COLOR.ink).stroke();
      doc.y += 8;
      fila(datos.estado === 'ANULADO' ? 'Total pagado (anulado)' : 'Total pagado', cop(datos.monto), true);

      doc.y += 14;
      doc.fillColor(COLOR.muted).font('Helvetica').fontSize(9).text(
        `Registrado por ${datos.registradoPor}${datos.rolesRegistro ? ` (${datos.rolesRegistro})` : ''} · ${fechaHora(datos.registradoEn)}`,
        izquierda,
        doc.y,
        { width: ancho },
      );

      numerarPaginas(doc, NOTA);
    },
  );
}
