import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';
import { normalizarCorreo } from './crear-cuenta.dto.js';

// Entradas de HU-M1-04. El token del enlace: 32 bytes en base64url (43 caracteres).
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export class TokenVerificacionDto {
  @Matches(TOKEN, { message: 'Este enlace no es válido. Revisa que lo copiaste completo o pide uno nuevo.' })
  @IsString({ message: 'Falta el enlace de verificación' })
  token: string;
}

export class ReenviarVerificacionDto {
  @Transform(normalizarCorreo)
  @MaxLength(254, { message: 'El correo es demasiado largo' })
  @IsEmail({}, { message: 'Escribe un correo electrónico válido' })
  correo: string;
}
