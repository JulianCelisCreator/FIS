import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { MedioPago } from '../enums/medio-pago.enum.js';
import { FORMATO_FECHA } from './datos-transaccion.dto.js';

const ESTADOS_CARTERA = ['AL_DIA', 'PENDIENTE', 'VENCIDO'] as const;
const ESTADOS_PAGO = ['REGISTRADO', 'ANULADO'] as const;

/** Filtros combinables de la consulta de cartera (RF-M5-13). */
export class FiltrosCarteraDto {
  @IsOptional()
  @IsIn(ESTADOS_CARTERA, { message: 'estado debe ser AL_DIA, PENDIENTE o VENCIDO' })
  estado?: (typeof ESTADOS_CARTERA)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'planId debe ser un número entero' })
  @IsPositive()
  planId?: number;

  /** Nombre o documento del patinador. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  patinador?: string;

  /** Nombre del acudiente. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  acudiente?: string;

  /** Vencimiento más antiguo desde esta fecha. */
  @IsOptional()
  @Matches(FORMATO_FECHA, { message: 'venceDesde debe tener el formato AAAA-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'venceDesde no es una fecha válida' })
  venceDesde?: string;

  @IsOptional()
  @Matches(FORMATO_FECHA, { message: 'venceHasta debe tener el formato AAAA-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'venceHasta no es una fecha válida' })
  venceHasta?: string;
}

/** Filtros del historial de pagos (RF-M5-16). */
export class FiltrosHistorialDto {
  @IsOptional()
  @Matches(FORMATO_FECHA, { message: 'desde debe tener el formato AAAA-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'desde no es una fecha válida' })
  desde?: string;

  @IsOptional()
  @Matches(FORMATO_FECHA, { message: 'hasta debe tener el formato AAAA-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'hasta no es una fecha válida' })
  hasta?: string;

  @IsOptional()
  @IsEnum(MedioPago, { message: 'medio debe ser EFECTIVO, TRANSFERENCIA o CONSIGNACION' })
  medio?: MedioPago;

  @IsOptional()
  @IsIn(ESTADOS_PAGO, { message: 'estado debe ser REGISTRADO o ANULADO' })
  estado?: (typeof ESTADOS_PAGO)[number];

  /** Nombre o documento del patinador, o nombre del acudiente. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  buscar?: string;
}

/** Exportación del historial con los mismos filtros (RF-M5-16, RF-M6-05). */
export class ExportarHistorialDto extends FiltrosHistorialDto {
  @IsIn(['pdf', 'xlsx'], { message: 'formato debe ser pdf o xlsx' })
  formato: 'pdf' | 'xlsx';
}
