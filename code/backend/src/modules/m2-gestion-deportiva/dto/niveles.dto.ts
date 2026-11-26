import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CrearNivelDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString({ message: 'El nombre del nivel es obligatorio' })
  @Matches(/\S/, { message: 'El nombre del nivel es obligatorio' })
  @MaxLength(80, { message: 'El nombre no puede superar 80 caracteres' })
  nombre: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString({ message: 'La descripción no es válida' })
  @MaxLength(250, { message: 'La descripción no puede superar 250 caracteres' })
  descripcion?: string;

  @Type(() => Number)
  @IsInt({ message: 'El orden debe ser un número entero' })
  @Min(1, { message: 'El orden debe ser mayor que cero' })
  @Max(32767, { message: 'El orden supera el límite permitido' })
  orden: number;
}

export class EditarNivelDto {
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString({ message: 'El nombre del nivel no es válido' })
  @Matches(/\S/, { message: 'El nombre del nivel no puede quedar vacío' })
  @MaxLength(80, { message: 'El nombre no puede superar 80 caracteres' })
  nombre?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() || null : value)
  @IsString({ message: 'La descripción no es válida' })
  @MaxLength(250, { message: 'La descripción no puede superar 250 caracteres' })
  descripcion?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El orden debe ser un número entero' })
  @Min(1, { message: 'El orden debe ser mayor que cero' })
  @Max(32767, { message: 'El orden supera el límite permitido' })
  orden?: number;

  @IsOptional()
  @IsBoolean({ message: 'El estado no es válido' })
  activo?: boolean;
}
