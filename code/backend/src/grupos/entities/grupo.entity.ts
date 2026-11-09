export type CategoriaPatinaje =
  | 'Iniciacion'
  | 'Transicion'
  | 'Avanzado'
  | 'Elite';

export type DiaSemana =
  | 'Lunes'
  | 'Martes'
  | 'Miercoles'
  | 'Jueves'
  | 'Viernes'
  | 'Sabado'
  | 'Domingo';

export interface Horario {
  id: string;
  dia: DiaSemana;
  horaInicio: string; // Formato HH:mm (ej. "14:00")
  horaFin: string; // Formato HH:mm (ej. "16:00")
  pista: string;
}

export class Grupo {
  id!: string;
  nombre!: string;
  categoria!: CategoriaPatinaje;
  cupoMaximo!: number;
  inscritosActuales!: number;
  profesorId!: string | null;
  profesorNombre!: string | null;
  horarios!: Horario[];
  activo!: boolean;
}
