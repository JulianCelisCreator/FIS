import { Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

/** Entrada de HU-M1-09: el acudiente (o el Administrador en su nombre) acepta el texto. */
export class RegistrarAutorizacionDto {
  /** El texto de la autorización solo se registra si se acepta explícitamente. */
  @IsBoolean({ message: 'Debes aceptar el texto de la autorización' })
  @Equals(true, { message: 'Debes aceptar el texto de la autorización' })
  acepta: boolean;

  /** Versión del texto que se mostró y se aceptó (CA-01). */
  @IsString({ message: 'Falta la versión del texto de la autorización' })
  @MaxLength(20)
  versionTexto: string;

  /**
   * Solo para el Administrador que registra en nombre de un acudiente. Si el
   * patinador tiene varios vínculos, indica cuál otorga la autorización.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'acudienteId debe ser un número entero' })
  @IsPositive()
  acudienteId?: number;
}
