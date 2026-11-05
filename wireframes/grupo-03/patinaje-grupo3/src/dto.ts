import { IsString, IsNotEmpty, MaxLength, IsDateString, IsEmail, IsInt, Min, IsUUID, ValidateIf, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
const trim = () => Transform(({value}) => typeof value === 'string' ? value.trim() : value);
export class EstudianteDto {
 @trim() @IsString() @IsNotEmpty() @MaxLength(30) documento!: string;
 @trim() @IsString() @IsNotEmpty() @MaxLength(100) nombres!: string;
 @trim() @IsString() @IsNotEmpty() @MaxLength(100) apellidos!: string;
 @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({strict:true}) fechaNacimiento!: string;
 @trim() @IsString() @IsNotEmpty() @MaxLength(30) telefono!: string;
 @trim() @IsString() @IsNotEmpty() @MaxLength(200) direccion!: string;
}
export class ActualizarEstudianteDto extends EstudianteDto {}
// ValidateIf permite omitir campos en PATCH pero rechaza null.
for (const campo of ['documento','nombres','apellidos','fechaNacimiento','telefono','direccion']) {
 ValidateIf((_o,v)=>v !== undefined)(ActualizarEstudianteDto.prototype,campo);
}
export class AcudienteDto {
 @trim() @IsString() @IsNotEmpty() @MaxLength(30) documento!: string;
 @trim() @IsString() @IsNotEmpty() @MaxLength(100) nombres!: string;
 @trim() @IsString() @IsNotEmpty() @MaxLength(100) apellidos!: string;
 @trim() @IsString() @IsNotEmpty() @MaxLength(30) telefono!: string;
 @trim() @IsEmail() @MaxLength(254) correo!: string;
}
export class AsociacionDto { @IsUUID() acudienteId!: string; }
export class NivelDto {
 @trim() @IsString() @IsNotEmpty() @MaxLength(80) nombre!: string;
 @trim() @IsString() @IsNotEmpty() @MaxLength(500) descripcion!: string;
 @IsInt() @Min(1) orden!: number;
}
export class ActualizarNivelDto extends NivelDto {}
for (const campo of ['nombre','descripcion','orden']) {
 ValidateIf((_o,v)=>v !== undefined)(ActualizarNivelDto.prototype,campo);
}
