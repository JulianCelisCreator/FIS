import { IsOptional, IsString } from 'class-validator';

/**
 * Rango del reporte (HU-6.4). Las dos fechas son obligatorias; la validación
 * de formato y orden la hace validarRango() para dar un mensaje claro.
 */
export class RangoReporteDto {
  @IsOptional()
  @IsString()
  desde?: string;

  @IsOptional()
  @IsString()
  hasta?: string;
}
