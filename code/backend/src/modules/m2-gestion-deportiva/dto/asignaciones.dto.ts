import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

const recortar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Asignación inicial (RF-M2-08) o cambio de categoría (RF-M2-09). */
export class AsignarCategoriaDto {
  @IsInt() @Min(1) categoriaId: number;
  @IsOptional() @Transform(recortar) @IsString() @MaxLength(500) motivo?: string;
}

/** Propuesta o promoción del profesor (RF-M2-16). */
export class ProponerCambioCategoriaDto {
  @IsInt() @Min(1) patinadorId: number;
  @IsInt() @Min(1) categoriaId: number;
  @Transform(recortar) @IsString() @Matches(/\S/, { message: 'Escribe la justificación del cambio' }) @MaxLength(1000)
  justificacion: string;
}

export class RechazarPropuestaDto {
  @IsOptional() @Transform(recortar) @IsString() @MaxLength(500) motivo?: string;
}
