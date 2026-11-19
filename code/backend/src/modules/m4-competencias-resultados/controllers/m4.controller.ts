import {
  BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { AutenticacionTemporalGuard } from '../../../common/auth/autenticacion-temporal.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import {
  CancelarCompetenciaDto, CorregirResultadoDto, CrearCompetenciaDto, CrearPruebaDto,
  EditarCompetenciaDto, FiltrosCompetenciaDto, PreseleccionarDto, RegistrarResultadoDto,
  SolicitarInscripcionDto,
} from '../dto/m4.dto.js';
import { PermisoM4 } from '../enums/permiso-m4.enum.js';
import { M4Service } from '../services/m4.service.js';

@Controller('m4')
@UseGuards(AutenticacionTemporalGuard, PermisosGuard)
export class M4Controller {
  constructor(private readonly m4: M4Service) {}

  @Get('competencias')
  @RequierePermiso(PermisoM4.CONSULTAR)
  listar(@UsuarioActual() usuario:UsuarioAutenticado,@Query() filtros: FiltrosCompetenciaDto) { return this.m4.listar(usuario,filtros); }

  @Get('categorias')
  @RequierePermiso(PermisoM4.COMPETENCIA_GESTIONAR)
  categorias() { return this.m4.categorias(); }

  @Get('competencias/:id')
  @RequierePermiso(PermisoM4.CONSULTAR)
  detalle(@UsuarioActual() usuario:UsuarioAutenticado,@Param('id',ParseIntPipe) id:number) { return this.m4.detalle(usuario,id); }

  @Post('competencias')
  @RequierePermiso(PermisoM4.COMPETENCIA_GESTIONAR)
  crear(@UsuarioActual() usuario:UsuarioAutenticado,@Body() dto:CrearCompetenciaDto) { return this.m4.crear(usuario,dto); }

  @Patch('competencias/:id')
  @RequierePermiso(PermisoM4.COMPETENCIA_GESTIONAR)
  editar(@UsuarioActual() usuario:UsuarioAutenticado,@Param('id',ParseIntPipe) id:number,@Body() dto:EditarCompetenciaDto) {
    return this.m4.editar(usuario,id,dto);
  }

  @Post('competencias/:id/publicar')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso(PermisoM4.COMPETENCIA_GESTIONAR)
  publicar(@UsuarioActual() usuario:UsuarioAutenticado,@Param('id',ParseIntPipe) id:number) { return this.m4.publicar(usuario,id); }

  @Post('competencias/:id/cancelar')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso(PermisoM4.COMPETENCIA_GESTIONAR)
  cancelar(@UsuarioActual() usuario:UsuarioAutenticado,@Param('id',ParseIntPipe) id:number,@Body() dto:CancelarCompetenciaDto) {
    return this.m4.cancelar(usuario,id,dto.motivo);
  }

  @Post('pruebas')
  @RequierePermiso(PermisoM4.COMPETENCIA_GESTIONAR)
  agregarPrueba(@UsuarioActual() usuario:UsuarioAutenticado,@Body() dto:CrearPruebaDto) { return this.m4.agregarPrueba(usuario,dto); }

  @Get('competencias/:id/elegibles')
  @RequierePermiso(PermisoM4.INSCRIPCION_GESTIONAR)
  elegibles(@UsuarioActual() usuario:UsuarioAutenticado,@Param('id',ParseIntPipe) id:number) { return this.m4.elegibles(usuario,id); }

  @Post('preselecciones')
  @RequierePermiso(PermisoM4.INSCRIPCION_GESTIONAR)
  preseleccionar(@UsuarioActual() usuario:UsuarioAutenticado,@Body() dto:PreseleccionarDto) { return this.m4.preseleccionar(usuario,dto); }

  @Post('inscripciones')
  @RequierePermiso(PermisoM4.INSCRIPCION_GESTIONAR)
  solicitar(@UsuarioActual() usuario:UsuarioAutenticado,@Body() dto:SolicitarInscripcionDto) { return this.m4.solicitarInscripcion(usuario,dto); }

  @Get('pruebas/:id/inscripciones')
  @RequierePermiso(PermisoM4.COMPETENCIA_GESTIONAR)
  inscripciones(@UsuarioActual() usuario:UsuarioAutenticado,@Param('id',ParseIntPipe) id:number) { return this.m4.inscripciones(usuario,id); }

  @Get('pruebas/:id/participantes')
  @RequierePermiso(PermisoM4.RESULTADO_REGISTRAR)
  participantes(@UsuarioActual() usuario:UsuarioAutenticado,@Param('id',ParseIntPipe) id:number) { return this.m4.participantesResultado(usuario,id); }

  @Post('resultados')
  @RequierePermiso(PermisoM4.RESULTADO_REGISTRAR)
  registrarResultado(@UsuarioActual() usuario:UsuarioAutenticado,@Body() dto:RegistrarResultadoDto) { return this.m4.registrarResultado(usuario,dto); }

  @Get('pruebas/:id/resultados')
  @RequierePermiso(PermisoM4.RESULTADO_REGISTRAR)
  resultados(@UsuarioActual() usuario:UsuarioAutenticado,@Param('id',ParseIntPipe) id:number) { return this.m4.tablaResultados(usuario,id); }

  @Get('ranking')
  @RequierePermiso(PermisoM4.RESULTADO_CONSULTAR)
  ranking(@UsuarioActual() usuario:UsuarioAutenticado,@Query('categoriaId') categoriaId?:string,@Query('nivelId') nivelId?:string) {
    const categoria=categoriaId===undefined?undefined:Number(categoriaId);
    const nivel=nivelId===undefined?undefined:Number(nivelId);
    if(categoria!==undefined&&(!Number.isInteger(categoria)||categoria<1)) throw new BadRequestException('categoriaId debe ser un entero positivo');
    if(nivel!==undefined&&(!Number.isInteger(nivel)||nivel<1)) throw new BadRequestException('nivelId debe ser un entero positivo');
    return this.m4.ranking(usuario,categoria,nivel);
  }

  @Get('rendimiento/:patinadorId')
  @RequierePermiso(PermisoM4.RESULTADO_CONSULTAR)
  rendimiento(@UsuarioActual() usuario:UsuarioAutenticado,@Param('patinadorId',ParseIntPipe) id:number) {
    return this.m4.rendimiento(usuario,id);
  }

  @Patch('resultados/:id/corregir')
  @RequierePermiso(PermisoM4.RESULTADO_ADMINISTRAR)
  corregir(@UsuarioActual() usuario:UsuarioAutenticado,@Param('id',ParseIntPipe) id:number,@Body() dto:CorregirResultadoDto) {
    return this.m4.corregir(usuario,id,dto);
  }

  @Get('resultados/:id/auditoria')
  @RequierePermiso(PermisoM4.RESULTADO_ADMINISTRAR)
  historialCorrecciones(@UsuarioActual() usuario:UsuarioAutenticado,@Param('id',ParseIntPipe) id:number) {
    return this.m4.historialCorrecciones(usuario,id);
  }

  @Post('competencias/:id/publicar-resultados')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso(PermisoM4.RESULTADO_PUBLICAR)
  publicarResultados(@UsuarioActual() usuario:UsuarioAutenticado,@Param('id',ParseIntPipe) id:number) {
    return this.m4.publicarResultados(usuario,id);
  }
}
