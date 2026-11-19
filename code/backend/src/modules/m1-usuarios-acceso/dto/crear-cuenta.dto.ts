import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsString, Matches, MaxLength } from 'class-validator';
import { ROLES_CUENTA, type RolCuenta } from '../enums/rol-cuenta.enum.js';

const recortar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** El correo es único sin distinguir mayúsculas (índice usuario_correo_uk); se guarda recortado y en minúsculas. */
export const normalizarCorreo = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Entrada de HU-M1-01: el Administrador registra una cuenta y le asigna un rol. */
export class CrearCuentaDto {
  @Transform(recortar)
  @MaxLength(80, { message: 'Los nombres no pueden superar 80 caracteres' })
  @Matches(/\S/, { message: 'Escribe los nombres' })
  @IsString({ message: 'Escribe los nombres' })
  nombres: string;

  @Transform(recortar)
  @MaxLength(80, { message: 'Los apellidos no pueden superar 80 caracteres' })
  @Matches(/\S/, { message: 'Escribe los apellidos' })
  @IsString({ message: 'Escribe los apellidos' })
  apellidos: string;

  @Transform(normalizarCorreo)
  @MaxLength(254, { message: 'El correo es demasiado largo' })
  @IsEmail({}, { message: 'Escribe un correo electrónico válido, por ejemplo laura.cubillos@example.com' })
  correo: string;

  @IsIn(ROLES_CUENTA, { message: 'Elige el rol: profesor, patinador, acudiente, contador o fisioterapeuta' })
  rol: RolCuenta;
}
