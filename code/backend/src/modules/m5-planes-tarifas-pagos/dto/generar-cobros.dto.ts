import { IsOptional, Matches } from 'class-validator';

/** Entrada de la generación manual de mensualidades (RF-M5-08). */
export class GenerarCobrosDto {
  /** Mes a generar, 'AAAA-MM'. Si se omite, el mes actual. */
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'periodo debe tener el formato AAAA-MM' })
  periodo?: string;
}
