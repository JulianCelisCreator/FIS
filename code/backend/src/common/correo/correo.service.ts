import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

export interface CorreoSaliente {
  para: string;
  asunto: string;
  html: string;
  /** Versión en texto plano para clientes de correo que no muestran HTML. */
  texto: string;
}

/** Error al entregar un correo; el que llama decide si se lo muestra o no a la persona. */
export class CorreoNoEnviadoError extends Error {
  constructor(motivo: string) {
    super(`No se pudo enviar el correo: ${motivo}`);
    this.name = 'CorreoNoEnviadoError';
  }
}

/**
 * Correo saliente de la plataforma (HU-M1-08; lo reutiliza HU-M1-04).
 *
 * - Con RESEND_API_KEY en .env, envía por Resend desde CORREO_REMITENTE.
 *   Sin un dominio verificado en Resend, solo entrega al correo dueño de la
 *   cuenta de Resend (remitente onboarding@resend.dev).
 * - Sin clave, no envía nada: escribe el correo en la consola de la API. Así
 *   se desarrolla y se prueba sin mandar correos reales.
 */
@Injectable()
export class CorreoService {
  private readonly logger = new Logger(CorreoService.name);
  private readonly resend: Resend | null;
  private readonly remitente: string;

  constructor() {
    const clave = process.env.RESEND_API_KEY?.trim();
    this.resend = clave ? new Resend(clave) : null;
    this.remitente = process.env.CORREO_REMITENTE?.trim() || 'Velora <onboarding@resend.dev>';
  }

  /** true si se envían correos reales (hay clave de Resend). */
  get enviaCorreosReales(): boolean {
    return this.resend !== null;
  }

  async enviar(correo: CorreoSaliente): Promise<void> {
    if (!this.resend) {
      this.logger.log(
        `[sin RESEND_API_KEY] Correo no enviado, solo registrado:\n` +
          `  Para: ${correo.para}\n  Asunto: ${correo.asunto}\n${correo.texto}`,
      );
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.remitente,
      to: correo.para,
      subject: correo.asunto,
      html: correo.html,
      text: correo.texto,
    });
    if (error) {
      // El detalle va al log de la API, nunca a la respuesta: no revela qué correos existen.
      this.logger.error(`Resend rechazó el correo a ${correo.para}: ${error.name} · ${error.message}`);
      throw new CorreoNoEnviadoError(error.name);
    }
  }
}
