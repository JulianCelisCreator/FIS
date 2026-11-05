import { Body, Controller, Get, Post, Patch, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { DeportivoService } from './deportivo.service';
import { AdminGuard } from './auth.guard';
import { EstudianteDto, ActualizarEstudianteDto, AcudienteDto, AsociacionDto, NivelDto, ActualizarNivelDto } from './dto';
@Controller() @UseGuards(AdminGuard)
export class DeportivoController {
 constructor(private readonly servicio:DeportivoService) {}
 @Get('estudiantes') listar() { return this.servicio.listarEstudiantes(); }
 @Get('estudiantes/:id') perfil(@Param('id',ParseUUIDPipe) id:string) { return this.servicio.perfil(id); }
 @Post('estudiantes') crear(@Body() dto:EstudianteDto) { return this.servicio.crearEstudiante(dto); }
 @Patch('estudiantes/:id') actualizar(@Param('id',ParseUUIDPipe) id:string,@Body() dto:ActualizarEstudianteDto) { return this.servicio.actualizarEstudiante(id,dto); }
 @Post('estudiantes/:id/acudientes') asociar(@Param('id',ParseUUIDPipe) id:string,@Body() dto:AsociacionDto) { return this.servicio.asociar(id,dto.acudienteId); }
 @Post('acudientes') acudiente(@Body() dto:AcudienteDto) { return this.servicio.crearAcudiente(dto); }
 @Get('acudientes') acudientes() { return this.servicio.listarAcudientes(); }
 @Get('niveles') niveles() { return this.servicio.listarNiveles(); }
 @Post('niveles') nivel(@Body() dto:NivelDto) { return this.servicio.crearNivel(dto); }
 @Patch('niveles/:id') actualizarNivel(@Param('id',ParseUUIDPipe) id:string,@Body() dto:ActualizarNivelDto) { return this.servicio.actualizarNivel(id,dto); }
}
