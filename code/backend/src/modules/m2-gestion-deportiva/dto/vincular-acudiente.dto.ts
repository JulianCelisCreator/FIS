import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

/** HU-M2-03: vincula perfiles que ya existen en M1 y M2. */
export class VincularAcudienteDto {
  @Type(() => Number)
  @IsInt({ message: 'Selecciona un acudiente registrado' })
  @Min(1, { message: 'Selecciona un acudiente registrado' })
  acudienteId: number;

  @IsString({ message: 'Indica el parentesco o relación' })
  @Matches(/\S/, { message: 'El parentesco o relación es obligatorio' })
  @MaxLength(40, { message: 'La relación no puede superar 40 caracteres' })
  parentesco: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado principal no es válido' })
  esPrincipal?: boolean;
}
