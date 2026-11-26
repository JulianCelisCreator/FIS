import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export const TIPOS_DOCUMENTO = ['CC', 'CE', 'PASAPORTE', 'OTRO'] as const;
export const CARGOS = ['PROFESOR', 'CONTADOR', 'FISIOTERAPEUTA', 'ADMINISTRATIVO'] as const;
export const ESTADOS_PERSONAL = ['ACTIVO', 'INACTIVO'] as const;

export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];
export type Cargo = (typeof CARGOS)[number];
export type EstadoPersonal = (typeof ESTADOS_PERSONAL)[number];

/** Filtros del listado (HU-6.2): búsqueda por documento o nombre y estado. */
export class FiltrosPersonalDto {
  @IsOptional()
  @IsString()
  @Length(0, 100)
  buscar?: string;

  @IsOptional()
  @IsIn(ESTADOS_PERSONAL, { message: 'El estado debe ser ACTIVO o INACTIVO' })
  estado?: EstadoPersonal;

  @IsOptional()
  @IsIn(CARGOS, { message: 'El cargo no es válido' })
  cargo?: Cargo;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  tamano = 20;
}

export class CrearPersonalDto {
  @IsIn(TIPOS_DOCUMENTO, { message: 'El tipo de documento es obligatorio' })
  tipoDocumento!: TipoDocumento;

  @IsString({ message: 'El número de documento es obligatorio' })
  @Matches(/^[A-Za-z0-9-]{3,20}$/, {
    message: 'El número de documento debe tener entre 3 y 20 letras, números o guiones',
  })
  numeroDocumento!: string;

  @IsString({ message: 'Los nombres son obligatorios' })
  @Length(1, 100, { message: 'Los nombres son obligatorios' })
  nombres!: string;

  @IsString({ message: 'Los apellidos son obligatorios' })
  @Length(1, 100, { message: 'Los apellidos son obligatorios' })
  apellidos!: string;

  @IsEmail({}, { message: 'El correo no es válido' })
  @Length(3, 150)
  correo!: string;

  @IsString({ message: 'El teléfono es obligatorio' })
  @Matches(/^\+?[0-9 ]{7,20}$/, { message: 'El teléfono debe tener entre 7 y 20 dígitos' })
  telefono!: string;

  @IsIn(CARGOS, { message: 'El cargo es obligatorio' })
  cargo!: Cargo;

  /** Cuenta de M1 que se vincula (opcional). null la desvincula al editar. */
  @IsOptional()
  @ValidateIf((_objeto, valor) => valor !== null)
  @IsInt()
  @Min(1)
  usuarioId?: number | null;
}

export class EditarPersonalDto {
  @IsOptional()
  @IsIn(TIPOS_DOCUMENTO, { message: 'El tipo de documento no es válido' })
  tipoDocumento?: TipoDocumento;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9-]{3,20}$/, {
    message: 'El número de documento debe tener entre 3 y 20 letras, números o guiones',
  })
  numeroDocumento?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Los nombres no pueden quedar vacíos' })
  nombres?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Los apellidos no pueden quedar vacíos' })
  apellidos?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo no es válido' })
  correo?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9 ]{7,20}$/, { message: 'El teléfono debe tener entre 7 y 20 dígitos' })
  telefono?: string;

  @IsOptional()
  @IsIn(CARGOS, { message: 'El cargo no es válido' })
  cargo?: Cargo;

  @IsOptional()
  @ValidateIf((_objeto, valor) => valor !== null)
  @IsInt()
  @Min(1)
  usuarioId?: number | null;
}

export class DesactivarPersonalDto {
  @IsOptional()
  @IsString()
  @Length(1, 500)
  motivo?: string;
}

export class BuscarCuentasDto {
  @IsOptional()
  @IsString()
  @Length(0, 150)
  buscar?: string;
}
