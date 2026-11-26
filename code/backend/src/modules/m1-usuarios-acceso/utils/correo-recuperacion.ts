import type { CorreoSaliente } from '../../../common/correo/correo.service.js';

/** Escapa texto que va dentro del HTML del correo. */
function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

/**
 * Correo de recuperación de contraseña (HU-M1-08). Diseño simple con estilos
 * en línea (los clientes de correo no cargan hojas de estilo), colores de
 * Velora y el enlace también en texto por si el botón no se ve.
 */
export function correoRecuperacion(datos: { para: string; nombre: string; enlace: string; minutos: number }): CorreoSaliente {
  const nombre = escapar(datos.nombre);
  const enlace = escapar(datos.enlace);
  return {
    para: datos.para,
    asunto: 'Restablece tu contraseña de Velora',
    texto: [
      `Hola, ${datos.nombre}:`,
      '',
      'Recibimos una solicitud para restablecer la contraseña de tu cuenta de Velora.',
      `Abre este enlace para crear una nueva (vence en ${datos.minutos} minutos y sirve una sola vez):`,
      datos.enlace,
      '',
      'Si no la pediste, ignora este correo: tu contraseña no cambia.',
    ].join('\n'),
    html: `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#edf3ff;font-family:Arial,Helvetica,sans-serif;color:#071433">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#f8faff;border:1px solid #b8c7e8">
      <tr><td style="background:#0a2f8f;padding:18px 24px;color:#f7f9ff;font-weight:800;letter-spacing:0.08em">VELORA</td></tr>
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 12px;font-size:22px">Restablece tu contraseña</h1>
        <p style="margin:0 0 12px;line-height:1.5">Hola, ${nombre}. Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
        <p style="margin:0 0 20px;line-height:1.5">El enlace vence en ${datos.minutos} minutos y sirve una sola vez.</p>
        <p style="margin:0 0 20px"><a href="${enlace}" style="display:inline-block;padding:12px 20px;background:#ffd21e;color:#030d28;font-weight:700;text-decoration:none;letter-spacing:0.06em">CREAR NUEVA CONTRASEÑA</a></p>
        <p style="margin:0 0 8px;font-size:13px;color:#526489">Si el botón no funciona, copia este enlace en tu navegador:</p>
        <p style="margin:0 0 20px;font-size:13px;word-break:break-all"><a href="${enlace}" style="color:#1f5cff">${enlace}</a></p>
        <p style="margin:0;font-size:13px;color:#526489">Si no la pediste, ignora este correo: tu contraseña no cambia.</p>
      </td></tr>
    </table>
  </body>
</html>`,
  };
}
