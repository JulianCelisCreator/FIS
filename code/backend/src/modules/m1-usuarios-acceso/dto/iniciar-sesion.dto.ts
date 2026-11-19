import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { normalizarCorreo } from './crear-cuenta.dto.js';

/** Entrada de HU-M1-02: correo y contraseña. El rol lo identifica el sistema (sin selector). */
export class IniciarSesionDto {
  @Transform(normalizarCorreo)
  @MaxLength(254, { message: 'El correo es demasiado largo' })
  @IsEmail({}, { message: 'Escribe un correo electrónico válido' })
  correo: string;

  @MaxLength(128, { message: 'La contraseña no puede superar 128 caracteres' })
  @MinLength(1, { message: 'Escribe tu contraseña' })
  @IsString({ message: 'Escribe tu contraseña' })
  contrasena: string;
}
