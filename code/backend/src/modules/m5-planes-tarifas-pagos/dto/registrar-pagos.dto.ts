import { IsInt, IsNumber, IsPositive, Max, Min } from 'class-validator';
import { DatosTransaccionDto } from './datos-transaccion.dto.js';

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
