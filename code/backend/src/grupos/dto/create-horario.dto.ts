import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { DiaSemana } from '../entities/grupo.entity.js';

export class CreateHorarioDto {
  @IsOptional()
  @IsString()
  grupoId?: string;

  @IsOptional()
  @IsString()
  dia?: DiaSemana;

  @IsOptional()
  @IsString()
  diaSemana?: DiaSemana;

  @IsString({ message: 'La hora de inicio es obligatoria' })
  @IsNotEmpty({ message: 'La hora de inicio no puede estar vacía' })
  horaInicio!: string;

  @IsString({ message: 'La hora de fin es obligatoria' })
  @IsNotEmpty({ message: 'La hora de fin no puede estar vacía' })
  horaFin!: string;

  @IsOptional()
  @IsString()
  sedeId?: string;

  @IsOptional()
  @IsString()
  pista?: string;
}

export class UpdateHorarioDto {
  @IsOptional()
  @IsString()
  grupoId?: string;

  @IsOptional()
  @IsString()
  dia?: DiaSemana;

  @IsOptional()
  @IsString()
  diaSemana?: DiaSemana;

  @IsOptional()
  @IsString()
  horaInicio?: string;

  @IsOptional()
  @IsString()
  horaFin?: string;

  @IsOptional()
  @IsString()
  sedeId?: string;

  @IsOptional()
  @IsString()
  pista?: string;
}

export class CancelarHorarioDto {
  @IsString({ message: 'El motivo de anulación o cancelación es obligatorio' })
  @IsNotEmpty({ message: 'Debe describir el motivo de la anulación de la franja' })
  motivo!: string;
}

/**
 * HU-3.5: Creación de evento global / fecha institucional (exclusivo para ADMIN).
 */
export class CrearEventoGlobalDto {
  @IsString({ message: 'El título del evento global es obligatorio' })
  @IsNotEmpty({ message: 'El título del evento global no puede estar vacío' })
  titulo!: string;

  @IsString({ message: 'La fecha/hora de inicio en ISO 8601 es obligatoria' })
  @IsNotEmpty()
  inicio!: string;

  @IsString({ message: 'La fecha/hora de fin en ISO 8601 es obligatoria' })
  @IsNotEmpty()
  fin!: string;

  @IsString({ message: 'La ubicación o sede es obligatoria' })
  @IsNotEmpty()
  ubicacion!: string;

  @IsOptional()
  @IsString()
  sedeId?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}

export class ActualizarEventoGlobalDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  inicio?: string;

  @IsOptional()
  @IsString()
  fin?: string;

  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
