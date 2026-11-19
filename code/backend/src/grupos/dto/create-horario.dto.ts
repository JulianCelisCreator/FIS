import { IsNotEmpty, IsString } from 'class-validator';
import type { DiaSemana } from '../entities/grupo.entity.js';

export class CreateHorarioDto {
  @IsString()
  @IsNotEmpty()
  dia!: DiaSemana;

  @IsString()
  @IsNotEmpty()
  horaInicio!: string;

  @IsString()
  @IsNotEmpty()
  horaFin!: string;

  @IsString()
  @IsNotEmpty()
  pista!: string;
}
