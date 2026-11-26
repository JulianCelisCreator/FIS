import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { normalizarCorreo } from './crear-cuenta.dto.js';

/**
 * HU-M1-12 · Activación en el primer ingreso. Se vuelven a enviar el correo y
 * la contraseña temporal (así no hace falta una sesión a medias) junto con la
 * contraseña nueva. La política de la nueva se revisa en el servicio para
 * devolver cada condición que falta.
 */
export class ActivarCuentaDto {
  @Transform(normalizarCorreo)
  @MaxLength(254, { message: 'El correo es demasiado largo' })
  @IsEmail({}, { message: 'Escribe un correo electrónico válido' })
  correo: string;

  @MaxLength(128, { message: 'La contraseña no puede superar 128 caracteres' })
  @MinLength(1, { message: 'Escribe tu contraseña temporal' })
  @IsString({ message: 'Escribe tu contraseña temporal' })
  contrasenaTemporal: string;

  @MaxLength(128, { message: 'La contraseña no puede superar 128 caracteres' })
  @IsString({ message: 'Escribe la nueva contraseña' })
  contrasenaNueva: string;
}
