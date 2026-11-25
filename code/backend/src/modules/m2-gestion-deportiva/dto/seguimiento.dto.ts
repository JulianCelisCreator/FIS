import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min, ValidateNested,
} from 'class-validator';

const recortar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export enum ResultadoEvaluacion {
  APROBADO = 'APROBADO',
  EN_PROCESO = 'EN_PROCESO',
  NO_APROBADO = 'NO_APROBADO',
}

export enum EstadoHabilidad {
  ADQUIRIDA = 'ADQUIRIDA',
  PENDIENTE = 'PENDIENTE',
}

/** RF-M2-12 */
export class CrearEvaluacionDto {
  @IsInt() @Min(1) nivelEvaluadoId: number;
  @IsEnum(ResultadoEvaluacion) resultado: ResultadoEvaluacion;
  @IsOptional() @Transform(recortar) @IsString() @MaxLength(1000) observacion?: string;
}

export class MarcaHabilidadDto {
  @IsInt() @Min(1) habilidadId: number;
  @IsEnum(EstadoHabilidad) estado: EstadoHabilidad;
}

/** RF-M2-13 */
export class RegistrarHabilidadesDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => MarcaHabilidadDto)
  habilidades: MarcaHabilidadDto[];
}

/** RF-M2-14 */
export class CrearObservacionDto {
  @Transform(recortar) @IsString() @Matches(/\S/, { message: 'Escribe la observación' }) @MaxLength(2000) texto: string;
  @IsOptional() @IsBoolean() visibleParaPatinador?: boolean;
}

/** RF-M2-23 */
export class HabilitarObservacionesDto {
  @IsBoolean() habilitada: boolean;
}
