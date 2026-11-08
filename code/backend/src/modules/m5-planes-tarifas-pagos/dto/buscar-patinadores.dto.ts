import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

/** Filtro del buscador de patinadores de las pantallas de M5. */
export class BuscarPatinadoresDto {
  /** Parte del nombre o del número de documento. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  buscar?: string;

  /** Un patinador concreto (p. ej. al llegar desde un enlace); igual respeta lo que el rol puede ver. */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'patinadorId debe ser un número entero' })
  @IsPositive()
  patinadorId?: number;
}
