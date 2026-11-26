import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const limpiar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Campos de texto del formulario multipart de HU-M1-10. El archivo llega
 * aparte con `@UploadedFile()`; las fechas se validan de nuevo en el servicio
 * (existencia real y orden).
 */
export class RegistrarPolizaDto {
  @Transform(limpiar)
  @IsString({ message: 'Escribe la aseguradora de la póliza.' })
  @MinLength(2, { message: 'Escribe la aseguradora de la póliza.' })
  @MaxLength(120, { message: 'La aseguradora no puede superar 120 caracteres.' })
  aseguradora: string;

  @Transform(limpiar)
  @IsString({ message: 'Escribe el número de la póliza.' })
  @MinLength(1, { message: 'Escribe el número de la póliza.' })
  @MaxLength(60, { message: 'El número de la póliza no puede superar 60 caracteres.' })
  numeroPoliza: string;

  @Transform(limpiar)
  @IsString({ message: 'Elige la fecha de inicio de la vigencia.' })
  @Matches(FECHA_ISO, { message: 'La fecha de inicio debe tener el formato AAAA-MM-DD.' })
  vigenteDesde: string;

  @Transform(limpiar)
  @IsString({ message: 'Elige la fecha de fin de la vigencia.' })
  @Matches(FECHA_ISO, { message: 'La fecha de fin debe tener el formato AAAA-MM-DD.' })
  vigenteHasta: string;
}
