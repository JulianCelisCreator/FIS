import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type {
  CategoriaPatinaje,
  DiaSemana,
  RolDocenteGrupo,
} from '../entities/grupo.entity.js';

export class CreateGrupoDto {
  @IsString({ message: 'El nombre del grupo es obligatorio' })
  @IsNotEmpty({ message: 'El nombre del grupo no puede estar vacío' })
  nombre!: string;

  @IsOptional()
  @IsString({ message: 'El nivel técnico debe ser válido' })
  nivelId?: string;

  @IsOptional()
  @IsString({ message: 'La categoría deportiva debe ser válida' })
  categoriaId?: string;

  @IsOptional()
  @IsString()
  categoria?: CategoriaPatinaje;

  @IsOptional()
  @IsString({ message: 'La sede es obligatoria' })
  sedeId?: string;

  @IsOptional()
  @IsArray({ message: 'Los días de clase deben enviarse como una lista' })
  @IsString({ each: true })
  dias?: DiaSemana[];

  @IsOptional()
  @IsInt({ message: 'El aforo máximo debe ser un número entero' })
  @Min(1, { message: 'El aforo máximo debe ser mayor a 0' })
  aforoMax?: number;

  @IsOptional()
  @IsInt({ message: 'El cupo máximo debe ser un número entero' })
  @Min(1, { message: 'El cupo máximo debe ser mayor a 0' })
  cupoMaximo?: number;

  @IsOptional()
  @IsInt({ message: 'Los cupos ocupados deben ser un número entero' })
  @Min(0, { message: 'Los cupos ocupados no pueden ser negativos' })
  ocupados?: number;
}

export class UpdateGrupoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El nombre del grupo no puede estar vacío' })
  nombre?: string;

  @IsOptional()
  @IsString()
  nivelId?: string;

  @IsOptional()
  @IsString()
  categoriaId?: string;

  @IsOptional()
  @IsString()
  sedeId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dias?: DiaSemana[];

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'El aforo máximo debe ser mayor a 0' })
  aforoMax?: number;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Los cupos ocupados no pueden ser negativos' })
  ocupados?: number;
}

export class CambiarEstadoGrupoDto {
  @IsBoolean({ message: 'El estado activo debe ser booleano' })
  activo!: boolean;
}

export class AsignarProfesorDto {
  @IsString()
  @IsNotEmpty()
  profesorId!: string;

  @IsOptional()
  @IsString()
  profesorNombre?: string;

  @IsOptional()
  @IsString()
  rolDocente?: RolDocenteGrupo;
}

/**
 * HU-3.2: Permite asignar uno o varios profesores a un grupo de clase específico.
 */
export class AsignarProfesoresMultipleDto {
  @IsArray({ message: 'Debe enviar la lista de IDs de profesores a asignar' })
  @ArrayMinSize(1, { message: 'Seleccione al menos un profesor para asignar' })
  @IsString({ each: true })
  profesoresIds!: string[];

  @IsOptional()
  @IsString()
  rolDocente?: RolDocenteGrupo;
}

/**
 * HU-3.4: Solicitud de inscripción o cambio de grupo por parte del usuario
 * (Estudiante mayor de edad o Acudiente autorizado).
 */
export class InscribirCambiarGrupoDto {
  @IsString({ message: 'El ID del estudiante es obligatorio' })
  @IsNotEmpty({ message: 'El ID del estudiante no puede estar vacío' })
  estudianteId!: string;

  @IsString({ message: 'El grupo destino es obligatorio' })
  @IsNotEmpty({ message: 'Debe seleccionar un grupo destino' })
  grupoDestinoId!: string;

  @IsString({ message: 'El rol del actor que realiza la solicitud es obligatorio' })
  @IsNotEmpty()
  actorRol!: 'ESTUDIANTE' | 'ACUDIENTE';

  @IsOptional()
  @IsString()
  acudienteId?: string;
}
