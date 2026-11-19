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
