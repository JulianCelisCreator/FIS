import { CategoriaPatinaje } from '../entities/grupo.entity.js';

export class CreateGrupoDto {
  nombre!: string;
  categoria!: CategoriaPatinaje;
  cupoMaximo!: number;
}

export class AsignarProfesorDto {
  profesorId!: string;
  profesorNombre!: string;
}
