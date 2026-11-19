import {
  IsEnum,
  IsISO8601,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { MedioPago } from '../enums/medio-pago.enum.js';

export const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Campos comunes de un pago, en el orden fijo de TransactionFields del design
 * system: monto (en cada DTO), fecha, medio y referencia.
 */
export abstract class DatosTransaccionDto {
  @Matches(FORMATO_FECHA, { message: 'fechaPago debe tener el formato AAAA-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'fechaPago no es una fecha válida' })
  fechaPago: string;

  @IsEnum(MedioPago, { message: 'medioPago debe ser EFECTIVO, TRANSFERENCIA o CONSIGNACION' })
  medioPago: MedioPago;

  // En efectivo la referencia es opcional; en los demás medios es obligatoria.
  @ValidateIf(
    (dto: DatosTransaccionDto) =>
      dto.medioPago !== MedioPago.EFECTIVO || dto.referencia !== undefined,
  )
  // class-validator ejecuta de abajo hacia arriba: primero que sea texto.
  @MaxLength(100, { message: 'La referencia no puede superar 100 caracteres' })
  @Matches(/\S/, { message: 'La referencia es obligatoria para transferencias y consignaciones' })
  @IsString({ message: 'La referencia es obligatoria para transferencias y consignaciones' })
  referencia?: string;
}
