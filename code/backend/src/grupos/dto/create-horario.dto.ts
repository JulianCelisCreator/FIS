import { DiaSemana } from '../entities/grupo.entity.js';

export class CreateHorarioDto {
  dia!: DiaSemana;
  horaInicio!: string;
  horaFin!: string;
  pista!: string;
}
