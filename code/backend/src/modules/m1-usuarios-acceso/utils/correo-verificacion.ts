import type { CorreoSaliente } from '../../../common/correo/correo.service.js';
import { escapar } from './correo-recuperacion.js';

/**
 * Correo de verificación (HU-M1-04, «diseñar también el correo»). Mismo
 * formato que el de recuperación: estilos en línea, colores de Velora y el
 * enlace también en texto por si el botón no se ve.
 */
export function correoVerificacion(datos: { para: string; nombre: string; enlace: string; horas: number }): CorreoSaliente {
  const nombre = escapar(datos.nombre);
  const enlace = escapar(datos.enlace);
  return {
    para: datos.para,
    asunto: 'Verifica tu correo en Velora',
    texto: [
      `Hola, ${datos.nombre}:`,
      '',
      'Tu escuela creó una cuenta de Velora con este correo. Confirma que es tuyo abriendo este enlace',
      `(vence en ${datos.horas} horas y sirve una sola vez):`,
      datos.enlace,
      '',
      'Si no esperabas este correo, ignóralo.',
    ].join('\n'),
    html: `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#edf3ff;font-family:Arial,Helvetica,sans-serif;color:#071433">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#f8faff;border:1px solid #b8c7e8">
      <tr><td style="background:#0a2f8f;padding:18px 24px;color:#f7f9ff;font-weight:800;letter-spacing:0.08em">VELORA</td></tr>
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 12px;font-size:22px">Verifica tu correo</h1>
        <p style="margin:0 0 12px;line-height:1.5">Hola, ${nombre}. Tu escuela creó una cuenta de Velora con este correo. Confirma que es tuyo.</p>
        <p style="margin:0 0 20px;line-height:1.5">El enlace vence en ${datos.horas} horas y sirve una sola vez.</p>
        <p style="margin:0 0 20px"><a href="${enlace}" style="display:inline-block;padding:12px 20px;background:#ffd21e;color:#030d28;font-weight:700;text-decoration:none;letter-spacing:0.06em">VERIFICAR MI CORREO</a></p>
        <p style="margin:0 0 8px;font-size:13px;color:#526489">Si el botón no funciona, copia este enlace en tu navegador:</p>
        <p style="margin:0 0 20px;font-size:13px;word-break:break-all"><a href="${enlace}" style="color:#1f5cff">${enlace}</a></p>
        <p style="margin:0;font-size:13px;color:#526489">Si no esperabas este correo, ignóralo.</p>
      </td></tr>
    </table>
  </body>
</html>`,
  };
}
