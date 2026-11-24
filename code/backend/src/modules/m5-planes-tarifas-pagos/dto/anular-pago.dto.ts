import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** RF-M5-11: el motivo es obligatorio y queda en la auditoría. */
export class AnularPagoDto {
  @MaxLength(500, { message: 'El motivo no puede superar los 500 caracteres' })
  @MinLength(5, { message: 'Escribe el motivo de la anulación (mínimo 5 caracteres)' })
  @IsString({ message: 'Escribe el motivo de la anulación' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  motivo!: string;
}
