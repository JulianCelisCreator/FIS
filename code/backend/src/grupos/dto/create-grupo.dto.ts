import { CategoriaPatinaje } from '../entities/grupo.entity';

export class CreateGrupoDto {
  nombre!: string;
  categoria!: CategoriaPatinaje;
  cupoMaximo!: number;
}

export class AsignarProfesorDto {
  profesorId!: string;
  profesorNombre!: string;
}
