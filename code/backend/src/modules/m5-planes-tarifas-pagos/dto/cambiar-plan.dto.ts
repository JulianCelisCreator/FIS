import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

/** Entrada de RF-M5-07: cambiar el plan de un patinador desde el siguiente periodo. */
export class CambiarPlanDto {
  @IsInt()
  @IsPositive()
  patinadorId: number;

  @IsInt()
  @IsPositive()
  planId: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
