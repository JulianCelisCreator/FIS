import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AsignarProfesorDto, CreateGrupoDto } from './dto/create-grupo.dto';
import { CreateHorarioDto } from './dto/create-horario.dto';
import { Grupo, Horario } from './entities/grupo.entity';

@Injectable()
export class GruposService {
  private grupos: Grupo[] = [
    {
      id: 'GRP-01',
      nombre: 'Semillero Velocidad A',
      categoria: 'Iniciacion',
      cupoMaximo: 20,
      inscritosActuales: 12,
      profesorId: 'PROF-01',
      profesorNombre: 'Carlos Mendoza',
      horarios: [
        {
          id: 'HOR-01',
          dia: 'Martes',
          horaInicio: '15:00',
          horaFin: '17:00',
          pista: 'Pista Principal - El Salitre',
        },
      ],
      activo: true,
    },
  ];

  findAll(): Grupo[] {
    return this.grupos;
  }

  findOne(id: string): Grupo {
    const grupo = this.grupos.find((g) => g.id === id);
    if (!grupo) {
      throw new NotFoundException(`El grupo con ID ${id} no existe`);
    }
    return grupo;
  }

  create(createGrupoDto: CreateGrupoDto): Grupo {
    if (createGrupoDto.cupoMaximo <= 0) {
      throw new BadRequestException('El cupo maximo debe ser mayor a 0');
    }

    const nuevoGrupo: Grupo = {
      id: `GRP-0${this.grupos.length + 1}`,
      nombre: createGrupoDto.nombre,
      categoria: createGrupoDto.categoria,
      cupoMaximo: createGrupoDto.cupoMaximo,
      inscritosActuales: 0,
      profesorId: null,
      profesorNombre: null,
      horarios: [],
      activo: true,
    };

    this.grupos.push(nuevoGrupo);
    return nuevoGrupo;
  }

  asignarProfesor(grupoId: string, dto: AsignarProfesorDto): Grupo {
    const grupo = this.findOne(grupoId);

    const gruposDelProfesor = this.grupos.filter(
      (g) => g.profesorId === dto.profesorId && g.id !== grupoId,
    );

    for (const otroGrupo of gruposDelProfesor) {
      for (const hActual of grupo.horarios) {
        const hayCruce = otroGrupo.horarios.some(
          (hOtro) =>
            hOtro.dia === hActual.dia &&
            hActual.horaInicio < hOtro.horaFin &&
            hActual.horaFin > hOtro.horaInicio,
        );
        if (hayCruce) {
          throw new BadRequestException(
            `El profesor ${dto.profesorNombre} ya tiene clase asignada el ${hActual.dia} en ese bloque horario`,
          );
        }
      }
    }

    grupo.profesorId = dto.profesorId;
    grupo.profesorNombre = dto.profesorNombre;
    return grupo;
  }

  agregarHorario(grupoId: string, dto: CreateHorarioDto): Horario {
    const grupo = this.findOne(grupoId);

    if (dto.horaInicio >= dto.horaFin) {
      throw new BadRequestException(
        'La hora de inicio debe ser anterior a la hora de finalizacion',
      );
    }

    const existeSolapamiento = grupo.horarios.some(
      (h) =>
        h.dia === dto.dia &&
        dto.horaInicio < h.horaFin &&
        dto.horaFin > h.horaInicio,
    );

    if (existeSolapamiento) {
      throw new BadRequestException(
        `El grupo ya tiene un entrenamiento programado el dia ${dto.dia} en ese rango de horas`,
      );
    }

    const nuevoHorario: Horario = {
      id: `HOR-${Date.now()}`,
      ...dto,
    };

    grupo.horarios.push(nuevoHorario);
    return nuevoHorario;
  }
}
