import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Rol } from '../../../common/auth/usuario-autenticado.js';

export const ESTADOS_CUENTA = ['POR_REGISTRAR', 'ACTIVA', 'DESACTIVADA'] as const;
export type EstadoCuenta = (typeof ESTADOS_CUENTA)[number];

export const TAMANO_PAGINA_POR_DEFECTO = 20;

/** Filtros y página del listado «Usuarios» (HU-M1-05 CA-01). Se aplican en el servidor. */
export class FiltrosCuentasDto {
  /** Parte del nombre o del correo. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80, { message: 'La búsqueda no puede superar 80 caracteres' })
  buscar?: string;

  @IsOptional()
  @IsEnum(Rol, { message: 'rol no es un rol del sistema' })
  rol?: Rol;

  @IsOptional()
  @IsIn(ESTADOS_CUENTA, { message: 'estado debe ser POR_REGISTRAR, ACTIVA o DESACTIVADA' })
  estado?: EstadoCuenta;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pagina debe ser un número entero' })
  @Min(1, { message: 'pagina debe ser 1 o mayor' })
  pagina: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'tamano debe ser un número entero' })
  @Min(1, { message: 'tamano debe ser 1 o mayor' })
  @Max(100, { message: 'tamano no puede superar 100' })
  tamano: number = TAMANO_PAGINA_POR_DEFECTO;
}
