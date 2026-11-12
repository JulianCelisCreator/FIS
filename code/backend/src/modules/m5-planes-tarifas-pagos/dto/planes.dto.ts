import {
  IsEnum,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { DIAS_LIMITE_PAGO, TipoPlan } from '../enums/tipo-plan.enum.js';
import { FORMATO_FECHA } from './datos-transaccion.dto.js';

const MENSAJE_DIA_LIMITE = `diaLimitePago debe ser uno de: ${DIAS_LIMITE_PAGO.join(', ')}`;

/** Entrada de RF-M5-01: crear un plan de servicio. */
export class CrearPlanDto {
  @MaxLength(80, { message: 'El nombre no puede superar 80 caracteres' })
  @Matches(/\S/, { message: 'El nombre del plan es obligatorio' })
  @IsString({ message: 'El nombre del plan es obligatorio' })
  nombre: string;

  @IsEnum(TipoPlan, {
    message: 'tipo debe ser DIA_UNICO, TRES_DIAS, SEIS_DIAS o SEIS_DIAS_GIMNASIO',
  })
  tipo: TipoPlan;

  /** Obligatorio en los planes mensuales; el de día único se cobra por sesión. */
  @ValidateIf((dto: CrearPlanDto) => dto.tipo !== TipoPlan.DIA_UNICO || dto.diaLimitePago !== undefined)
  @IsIn(DIAS_LIMITE_PAGO, { message: MENSAJE_DIA_LIMITE })
  diaLimitePago?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La descripción no puede superar 500 caracteres' })
  descripcion?: string;
}

/**
 * Entrada de RF-M5-02: editar un plan. Tipo y periodicidad no se cambian (se
 * crea otro plan) y el precio va por tarifa (RF-M5-04).
 */
export class EditarPlanDto {
  @IsOptional()
  @MaxLength(80, { message: 'El nombre no puede superar 80 caracteres' })
  @Matches(/\S/, { message: 'El nombre del plan no puede quedar vacío' })
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsIn(DIAS_LIMITE_PAGO, { message: MENSAJE_DIA_LIMITE })
  diaLimitePago?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La descripción no puede superar 500 caracteres' })
  descripcion?: string;
}

/** Entrada de RF-M5-03: desactivar un plan. */
export class DesactivarPlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}

/** Entrada de RF-M5-04: registrar una tarifa con fecha de vigencia. */
export class RegistrarTarifaDto {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'valor debe ser un número con máximo dos decimales' })
  @IsPositive({ message: 'El valor de la tarifa debe ser mayor que 0' })
  valor: number;

  @Matches(FORMATO_FECHA, { message: 'vigenteDesde debe tener el formato AAAA-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'vigenteDesde no es una fecha válida' })
  vigenteDesde: string;
}

/** Filtros del listado de planes del Administrador. */
export class FiltrosPlanesDto {
  @IsOptional()
  @IsEnum(TipoPlan, { message: 'tipo no es un tipo de plan válido' })
  tipo?: TipoPlan;

  @IsOptional()
  @IsIn(['ACTIVO', 'INACTIVO'], { message: 'estado debe ser ACTIVO o INACTIVO' })
  estado?: 'ACTIVO' | 'INACTIVO';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  buscar?: string;
}
