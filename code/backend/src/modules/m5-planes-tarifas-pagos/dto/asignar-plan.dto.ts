import { IsInt, IsISO8601, IsPositive, Matches } from 'class-validator';
import { FORMATO_FECHA } from './datos-transaccion.dto.js';

/** Entrada de RF-M5-06: asignar un plan a un patinador sin plan activo. */
export class AsignarPlanDto {
  @IsInt()
  @IsPositive()
  patinadorId: number;

  @IsInt()
  @IsPositive()
  planId: number;

  @Matches(FORMATO_FECHA, { message: 'fechaInicio debe tener el formato AAAA-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'fechaInicio no es una fecha válida' })
  fechaInicio: string;
}
