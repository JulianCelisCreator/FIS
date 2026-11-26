import { IsISO8601, IsInt, IsNumber, IsOptional, IsPositive, Matches, Max, Min } from 'class-validator';
import { DatosTransaccionDto, FORMATO_FECHA } from './datos-transaccion.dto.js';

const DOS_DECIMALES = { maxDecimalPlaces: 2 };

/** Entrada de RF-M5-09: pago (total o parcial) de un cobro existente. */
export class RegistrarPagoCobroDto extends DatosTransaccionDto {
  @IsInt()
  @IsPositive()
  cobroId: number;

  @IsNumber(DOS_DECIMALES, { message: 'monto debe ser un número con máximo dos decimales' })
  @IsPositive({ message: 'El monto debe ser mayor que 0' })
  monto: number;
}

/** Entrada de RF-M5-10: pago por sesión de un patinador con plan de día único. */
export class RegistrarPagoSesionDto extends DatosTransaccionDto {
  @IsInt()
  @IsPositive()
  patinadorId: number;

  @IsInt()
  @Min(1, { message: 'Debe pagarse al menos una sesión' })
  @Max(31)
  numeroSesiones: number;

  /**
   * Día de la clase; por defecto, la fecha del pago. Se puede pagar por
   * adelantado o, con recargo, al día siguiente de la clase (día de gracia).
   */
  @IsOptional()
  @Matches(FORMATO_FECHA, { message: 'fechaClase debe tener el formato AAAA-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'fechaClase no es una fecha válida' })
  fechaClase?: string;
}

/** Clase de valoración previa a la inscripción; su valor se abona a la matrícula. */
export class RegistrarValoracionDto extends DatosTransaccionDto {
  @IsInt()
  @IsPositive()
  patinadorId: number;
}

/** Entrada del pago de matrícula y gastos administrativos, requisito para activar el primer plan. */
export class RegistrarMatriculaDto extends DatosTransaccionDto {
  @IsInt()
  @IsPositive()
  patinadorId: number;

  @IsNumber(DOS_DECIMALES)
  @IsPositive({ message: 'La matrícula debe ser mayor que 0' })
  valorMatricula: number;

  @IsNumber(DOS_DECIMALES)
  @IsPositive({ message: 'Los gastos administrativos deben ser mayores que 0' })
  valorGastosAdministrativos: number;
}
