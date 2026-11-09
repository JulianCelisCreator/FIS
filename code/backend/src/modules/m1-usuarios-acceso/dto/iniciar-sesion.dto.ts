import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { Rol } from '../../../common/auth/usuario-autenticado.js';
import { normalizarCorreo } from './registrar-usuario.dto.js';

/**
 * Entrada de RF-M1-02: correo, contraseña y el rol con el que se ingresa
 * («Soy», como en el wireframe W01). Puede ser cualquier rol del sistema: el
 * personal también ingresa por aquí.
 */
export class IniciarSesionDto {
  @Transform(normalizarCorreo)
  @MaxLength(254, { message: 'El correo es demasiado largo' })
  @IsEmail({}, { message: 'Escribe un correo electrónico válido' })
  correo: string;

  @MaxLength(128, { message: 'La contraseña no puede superar 128 caracteres' })
  @MinLength(1, { message: 'Escribe tu contraseña' })
  @IsString({ message: 'Escribe tu contraseña' })
  contrasena: string;

  @IsEnum(Rol, { message: 'Elige con qué rol ingresas' })
  rol: Rol;
}
