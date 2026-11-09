import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AsignarProfesorDto, CreateGrupoDto } from './dto/create-grupo.dto';
import { CreateHorarioDto } from './dto/create-horario.dto';
import { GruposService } from './grupos.service';

@Controller('grupos')
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  @Get()
  findAll() {
    return this.gruposService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gruposService.findOne(id);
  }

  @Post()
  create(@Body() createGrupoDto: CreateGrupoDto) {
    return this.gruposService.create(createGrupoDto);
  }

  @Patch(':id/profesor')
  asignarProfesor(
    @Param('id') id: string,
    @Body() asignarProfesorDto: AsignarProfesorDto,
  ) {
    return this.gruposService.asignarProfesor(id, asignarProfesorDto);
  }

  @Post(':id/horarios')
  agregarHorario(
    @Param('id') id: string,
    @Body() createHorarioDto: CreateHorarioDto,
  ) {
    return this.gruposService.agregarHorario(id, createHorarioDto);
  }
}
