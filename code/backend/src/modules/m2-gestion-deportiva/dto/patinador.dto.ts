import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export enum TipoDocumentoPatinador {
  CC = 'CC', TI = 'TI', RC = 'RC', CE = 'CE', PASAPORTE = 'PASAPORTE', OTRO = 'OTRO',
}

export enum GeneroPatinador {
  FEMENINO = 'FEMENINO', MASCULINO = 'MASCULINO',
}

export class CrearPatinadorDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsEnum(TipoDocumentoPatinador) tipoDocumento: TipoDocumentoPatinador;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Matches(/\S/) @MaxLength(30) numeroDocumento: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Matches(/\S/) @MaxLength(100) nombres: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Matches(/\S/) @MaxLength(100) apellidos: string;

  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) fechaNacimiento: string;
  @IsEnum(GeneroPatinador) genero: GeneroPatinador;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() || null : value)
  @IsString() @MaxLength(30) telefonoContacto?: string | null;
}

export class EditarPatinadorDto {
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsEnum(TipoDocumentoPatinador) tipoDocumento?: TipoDocumentoPatinador;

  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Matches(/\S/) @MaxLength(30) numeroDocumento?: string;

  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Matches(/\S/) @MaxLength(100) nombres?: string;

  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Matches(/\S/) @MaxLength(100) apellidos?: string;

  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) fechaNacimiento?: string;
  @IsOptional() @IsEnum(GeneroPatinador) genero?: GeneroPatinador;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() || null : value)
  @IsString() @MaxLength(30) telefonoContacto?: string | null;
}
