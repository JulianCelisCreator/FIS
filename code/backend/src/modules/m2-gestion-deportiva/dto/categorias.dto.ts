import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export enum GeneroCategoriaDto {
  FEMENINO = 'FEMENINO',
  MASCULINO = 'MASCULINO',
  MIXTO = 'MIXTO',
}

const recortar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CrearCategoriaDto {
  @Transform(recortar) @IsString() @Matches(/\S/) @MaxLength(100) nombre: string;
  @IsInt() @Min(0) @Max(120) edadMinima: number;
  @IsOptional() @IsInt() @Min(0) @Max(120) edadMaxima?: number | null;
  @IsOptional() @IsInt() @Min(1) nivelMinimoId?: number | null;
  @IsOptional() @IsEnum(GeneroCategoriaDto) genero?: GeneroCategoriaDto;
}

export class EditarCategoriaDto {
  @IsOptional() @Transform(recortar) @IsString() @Matches(/\S/) @MaxLength(100) nombre?: string;
  @IsOptional() @IsInt() @Min(0) @Max(120) edadMinima?: number;
  @IsOptional() @IsInt() @Min(0) @Max(120) edadMaxima?: number | null;
  @IsOptional() @IsInt() @Min(1) nivelMinimoId?: number | null;
  @IsOptional() @IsEnum(GeneroCategoriaDto) genero?: GeneroCategoriaDto;
  @IsOptional() @IsBoolean() activo?: boolean;
}
