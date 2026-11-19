import {
  IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, MaxLength, Min, MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TipoCompetencia { INTERNA = 'INTERNA', FEDERADA = 'FEDERADA', FESTIVAL = 'FESTIVAL' }
export enum ModalidadPrueba {
  CONTRARRELOJ = 'CONTRARRELOJ', PUNTOS = 'PUNTOS', ELIMINACION = 'ELIMINACION',
  RELEVOS = 'RELEVOS', VELOCIDAD = 'VELOCIDAD', FONDO = 'FONDO',
}
export enum GeneroPrueba { FEMENINO = 'FEMENINO', MASCULINO = 'MASCULINO', MIXTO = 'MIXTO' }

export class CrearCompetenciaDto {
  @IsString() @MinLength(3) @MaxLength(140) nombre: string;
  @IsISO8601() fechaHora: string;
  @IsString() @MinLength(2) @MaxLength(180) lugar: string;
  @IsEnum(TipoCompetencia) tipo: TipoCompetencia;
  @IsISO8601() aperturaInscripciones: string;
  @IsISO8601() cierreInscripciones: string;
}
export class EditarCompetenciaDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(140) nombre?: string;
  @IsOptional() @IsISO8601() fechaHora?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(180) lugar?: string;
  @IsOptional() @IsEnum(TipoCompetencia) tipo?: TipoCompetencia;
  @IsOptional() @IsISO8601() aperturaInscripciones?: string;
  @IsOptional() @IsISO8601() cierreInscripciones?: string;
}
export class CrearPruebaDto {
  @Type(() => Number) @IsInt() @Min(1) competenciaId: number;
  @IsEnum(ModalidadPrueba) modalidad: ModalidadPrueba;
  @Type(() => Number) @IsInt() @Min(1) distanciaMetros: number;
  @IsOptional() @IsString() @MaxLength(300) descripcion?: string;
  @Type(() => Number) @IsInt() @Min(1) categoriaId: number;
  @IsEnum(GeneroPrueba) genero: GeneroPrueba;
}
export class CancelarCompetenciaDto {
  @IsString() @MinLength(5) @MaxLength(500) motivo: string;
}
export class PreseleccionarDto {
  @Type(() => Number) @IsInt() @Min(1) competenciaId: number;
  @IsArray() @Type(() => Number) @IsInt({ each: true }) patinadoresIds: number[];
}
export class SolicitarInscripcionDto {
  @Type(() => Number) @IsInt() @Min(1) pruebaId: number;
  @Type(() => Number) @IsInt() @Min(1) patinadorId: number;
  @IsOptional() @IsBoolean() confirmarAutorizacionAcudiente?: boolean;
}
export class RegistrarResultadoDto {
  @Type(() => Number) @IsInt() @Min(1) inscripcionId: number;
  @IsOptional() @IsString() @Matches(/^\d{2}:\d{2}\.\d{3}$/) tiempo?: string;
  @IsBoolean() noFinalizo: boolean;
  @IsOptional() @IsString() @MaxLength(500) observaciones?: string;
}
export class CorregirResultadoDto {
  @IsOptional() @IsString() @Matches(/^\d{2}:\d{2}\.\d{3}$/) tiempo?: string;
  @IsBoolean() noFinalizo: boolean;
  @IsString() @MinLength(5) @MaxLength(500) motivo: string;
  @IsOptional() @IsString() @MaxLength(500) observaciones?: string;
}
export class FiltrosCompetenciaDto {
  @IsOptional() @IsIn(['BORRADOR','PUBLICADA','CANCELADA','FINALIZADA']) estado?: string;
  @IsOptional() @IsString() @MaxLength(120) buscar?: string;
}
