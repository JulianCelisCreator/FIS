import { DiaSemana } from '../entities/grupo.entity';

export class CreateHorarioDto {
  dia!: DiaSemana;
  horaInicio!: string;
  horaFin!: string;
  pista!: string;
}
