import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import { Rol, type UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { M4Repository } from '../repositories/m4.repository.js';

@Injectable()
export class M4Service {
  constructor(
    private readonly db: BaseDatosService,
    private readonly repo: M4Repository,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  private tiene(usuario: UsuarioAutenticado, ...roles: Rol[]) {
    return roles.some((rol) => usuario.roles.includes(rol));
  }
  private admin(usuario: UsuarioAutenticado) {
    if (!this.tiene(usuario, Rol.ADMINISTRADOR)) throw new ForbiddenException('Acción exclusiva del Administrador');
  }
  private gestor(usuario: UsuarioAutenticado) {
    if (!this.tiene(usuario, Rol.ADMINISTRADOR, Rol.PROFESOR)) throw new ForbiddenException('Solo Administrador o Profesor');
  }
  private validarFechas(x: any) {
    const apertura = new Date(x.aperturaInscripciones).getTime();
    const cierre = new Date(x.cierreInscripciones).getTime();
    const evento = new Date(x.fechaHora).getTime();
    if (!(apertura < cierre && cierre < evento)) {
      throw new BadRequestException('Las fechas deben cumplir: apertura < cierre de inscripciones < fecha de competencia');
    }
  }
  listar(usuario:UsuarioAutenticado,filtros: { estado?: string; buscar?: string }) {
    const estadosVisibles=this.tiene(usuario,Rol.ADMINISTRADOR,Rol.PROFESOR)
      ? undefined : ['PUBLICADA','FINALIZADA','CANCELADA'];
    return this.repo.listarCompetencias(this.db.consultor, filtros, estadosVisibles);
  }
  async detalle(usuario:UsuarioAutenticado,id: number) {
    const competencia = await this.repo.competencia(this.db.consultor, id);
    if (!competencia) throw new NotFoundException('La competencia no existe');
    if(competencia.estado==='BORRADOR'&&!this.tiene(usuario,Rol.ADMINISTRADOR,Rol.PROFESOR))
      throw new ForbiddenException('La competencia todavía no ha sido publicada');
    return { ...competencia, pruebas: await this.repo.pruebas(this.db.consultor, id) };
  }
  categorias() { return this.repo.categorias(this.db.consultor); }

  async crear(usuario: UsuarioAutenticado, dto: any) {
    this.gestor(usuario); this.validarFechas(dto);
    const id = await this.db.transaccion(async (tx) => {
      const nuevo = await this.repo.crearCompetencia(tx, dto, usuario.id);
      await this.auditoria.registrar(tx, { modulo:'M4', tabla:'competencia', registroId:nuevo,
        accion:'CREAR_COMPETENCIA', valorNuevo:dto, usuarioId:usuario.id });
      return nuevo;
    });
    return this.detalle(usuario,id);
  }

  async editar(usuario: UsuarioAutenticado, id: number, dto: any) {
    this.gestor(usuario);
    if(Object.keys(dto).length===0) throw new BadRequestException('Indica al menos un campo para modificar');
    await this.db.transaccion(async (tx) => {
      const anterior = await this.repo.competencia(tx,id,true);
      if (!anterior) throw new NotFoundException('La competencia no existe');
      if (['CANCELADA','FINALIZADA'].includes(anterior.estado) || new Date(anterior.fechaHora).getTime() <= Date.now())
        throw new BadRequestException('No se puede modificar una competencia realizada, cancelada o finalizada');
      const nuevo = { ...anterior, ...dto };
      this.validarFechas(nuevo);
      await this.repo.actualizarCompetencia(tx,id,dto);
      await this.auditoria.registrar(tx,{modulo:'M4',tabla:'competencia',registroId:id,
        accion:'MODIFICAR_COMPETENCIA',valorAnterior:anterior,valorNuevo:nuevo,usuarioId:usuario.id});
      await tx.query(
        `INSERT INTO notificacion (usuario_id,modulo,titulo,mensaje,entidad,entidad_id)
         SELECT DISTINCT destinatario.usuario_id,'M4','Competencia modificada',$2,'competencia',$1
         FROM (
           SELECT i.solicitada_por AS usuario_id FROM inscripcion i JOIN prueba p ON p.id=i.prueba_id WHERE p.competencia_id=$1
           UNION SELECT pt.usuario_id FROM inscripcion i JOIN prueba p ON p.id=i.prueba_id
             JOIN patinador pt ON pt.id=i.patinador_id WHERE p.competencia_id=$1 AND pt.usuario_id IS NOT NULL
           UNION SELECT aa.acudiente_id FROM inscripcion i JOIN prueba p ON p.id=i.prueba_id
             JOIN acudiente_patinador aa ON aa.patinador_id=i.patinador_id AND aa.desvinculado_en IS NULL WHERE p.competencia_id=$1
         ) destinatario WHERE destinatario.usuario_id IS NOT NULL`,
        [id,`La competencia ${nuevo.nombre} fue modificada.`],
      );
    });
    return this.detalle(usuario,id);
  }

  async agregarPrueba(usuario: UsuarioAutenticado, dto: any) {
    this.gestor(usuario);
    return this.db.transaccion(async (tx) => {
      const c = await this.repo.competencia(tx,dto.competenciaId,true);
      if (!c) throw new NotFoundException('La competencia no existe');
      if (c.estado !== 'BORRADOR') throw new BadRequestException('Solo se configuran pruebas en competencias programadas');
      const categoria=await tx.query<{genero:string}>(
        `SELECT genero FROM categoria WHERE id=$1 AND activo=true`,[dto.categoriaId]);
      if(!categoria.rows[0]) throw new NotFoundException('La categoría no existe o está inactiva');
      if(categoria.rows[0].genero!=='MIXTO' && dto.genero!==categoria.rows[0].genero)
        throw new BadRequestException('El género de la prueba no coincide con el de la categoría');
      const { rows } = await tx.query(
        `INSERT INTO prueba (competencia_id,modalidad,distancia_metros,descripcion)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (competencia_id,modalidad,distancia_metros)
         DO UPDATE SET descripcion=COALESCE(EXCLUDED.descripcion,prueba.descripcion)
         RETURNING id`,
        [dto.competenciaId,dto.modalidad,dto.distanciaMetros,dto.descripcion?.trim() || null],
      );
      await tx.query(`INSERT INTO prueba_categoria (prueba_id,categoria_id,genero) VALUES ($1,$2,$3)
         ON CONFLICT (prueba_id,categoria_id,genero) DO NOTHING`,
        [rows[0].id,dto.categoriaId,dto.genero]);
      await this.auditoria.registrar(tx,{modulo:'M4',tabla:'prueba',registroId:rows[0].id,
        accion:'CONFIGURAR_PRUEBA',valorNuevo:dto,usuarioId:usuario.id});
      return { id: rows[0].id, competenciaId:dto.competenciaId };
    });
  }

  async publicar(usuario: UsuarioAutenticado, id: number) {
    this.gestor(usuario);
    await this.db.transaccion(async (tx) => {
      const c = await this.repo.competencia(tx,id,true);
      if (!c) throw new NotFoundException('La competencia no existe');
      if (c.estado !== 'BORRADOR') throw new BadRequestException('Solo se publican competencias programadas');
      const pruebas = await this.repo.pruebas(tx,id);
      if (!pruebas.length || pruebas.some((p:any) => !p.categorias?.length))
        throw new BadRequestException('Configura al menos una prueba y asocia una categoría y género antes de publicar');
      await tx.query(`UPDATE competencia SET estado='PUBLICADA',publicada_en=now(),actualizado_en=now() WHERE id=$1`,[id]);
      await this.auditoria.registrar(tx,{modulo:'M4',tabla:'competencia',registroId:id,
        accion:'PUBLICAR_COMPETENCIA',valorAnterior:c,valorNuevo:{estado:'PUBLICADA'},usuarioId:usuario.id});
      await tx.query(
        `INSERT INTO notificacion (usuario_id,modulo,titulo,mensaje,entidad,entidad_id)
         SELECT DISTINCT u.id,'M4','Nueva competencia publicada',$2,'competencia',$1
         FROM usuario u JOIN usuario_rol ur ON ur.usuario_id=u.id JOIN rol r ON r.id=ur.rol_id
         WHERE r.codigo IN ('PATINADOR','ACUDIENTE') AND u.estado='ACTIVA'`,
        [id,`Se publicó la competencia ${c.nombre}. Ya puedes consultar sus pruebas e inscripciones.`],
      );
    });
    return this.detalle(usuario,id);
  }

  async cancelar(usuario: UsuarioAutenticado,id:number,motivo:string) {
    this.admin(usuario);
    await this.db.transaccion(async(tx)=>{
      const c=await this.repo.competencia(tx,id,true);
      if(!c) throw new NotFoundException('La competencia no existe');
      if(c.estado==='CANCELADA'||c.estado==='FINALIZADA'||new Date(c.fechaHora).getTime()<=Date.now())
        throw new BadRequestException('La competencia ya no se puede cancelar');
      await tx.query(`UPDATE competencia SET estado='CANCELADA',cancelada_en=now(),motivo_cancelacion=$2,actualizado_en=now() WHERE id=$1`,[id,motivo.trim()]);
      await this.auditoria.registrar(tx,{modulo:'M4',tabla:'competencia',registroId:id,accion:'CANCELAR_COMPETENCIA',
        valorAnterior:c,valorNuevo:{estado:'CANCELADA'},motivo,usuarioId:usuario.id});
      await tx.query(
        `INSERT INTO notificacion (usuario_id,modulo,titulo,mensaje,entidad,entidad_id)
         SELECT DISTINCT destinatario.usuario_id,'M4','Competencia cancelada',$2,'competencia',$1
         FROM (
           SELECT i.solicitada_por AS usuario_id FROM inscripcion i JOIN prueba p ON p.id=i.prueba_id WHERE p.competencia_id=$1
           UNION SELECT pt.usuario_id FROM inscripcion i JOIN prueba p ON p.id=i.prueba_id
             JOIN patinador pt ON pt.id=i.patinador_id WHERE p.competencia_id=$1 AND pt.usuario_id IS NOT NULL
           UNION SELECT aa.acudiente_id FROM inscripcion i JOIN prueba p ON p.id=i.prueba_id
             JOIN acudiente_patinador aa ON aa.patinador_id=i.patinador_id AND aa.desvinculado_en IS NULL WHERE p.competencia_id=$1
         ) destinatario WHERE destinatario.usuario_id IS NOT NULL`,
        [id,`La competencia ${c.nombre} fue cancelada. Motivo: ${motivo}`],
      );
    });
    return this.detalle(usuario,id);
  }

  async elegibles(usuario: UsuarioAutenticado, competenciaId: number) {
    const c=await this.repo.competencia(this.db.consultor,competenciaId);
    if(!c) throw new NotFoundException('La competencia no existe');
    if(this.tiene(usuario,Rol.PATINADOR,Rol.ACUDIENTE))
      return this.repo.elegiblesPropios(this.db.consultor,usuario.id,competenciaId,this.tiene(usuario,Rol.ACUDIENTE));
    return this.repo.elegibles(this.db.consultor,usuario.id,competenciaId,this.tiene(usuario,Rol.ADMINISTRADOR));
  }
  async preseleccionar(usuario: UsuarioAutenticado,dto:any) {
    if(!this.tiene(usuario,Rol.PROFESOR,Rol.ADMINISTRADOR)) throw new ForbiddenException('Solo un Profesor puede preseleccionar patinadores');
    if(!Array.isArray(dto.patinadoresIds)||dto.patinadoresIds.length===0) throw new BadRequestException('Selecciona al menos un patinador');
    const elegibles=await this.repo.elegibles(this.db.consultor,usuario.id,dto.competenciaId,this.tiene(usuario,Rol.ADMINISTRADOR));
    const permitidos=new Set(elegibles.map((x:any)=>x.id));
    for(const id of dto.patinadoresIds) if(!permitidos.has(id)) throw new ForbiddenException(`El patinador ${id} no pertenece a un grupo a tu cargo`);
    await this.db.transaccion(async(tx)=>{
      const c=await this.repo.competencia(tx,dto.competenciaId,true);
      if(!c||c.estado!=='PUBLICADA') throw new BadRequestException('La competencia debe estar publicada');
      for(const id of dto.patinadoresIds) await this.repo.preseleccionar(tx,dto.competenciaId,id,usuario.id);
    });
    return { preseleccionados:dto.patinadoresIds.length };
  }

  async solicitarInscripcion(usuario:UsuarioAutenticado,dto:any) {
    const esAdmin=this.tiene(usuario,Rol.ADMINISTRADOR);
    const autorizado=await this.repo.puedeSolicitar(this.db.consultor,usuario.id,dto.patinadorId);
    if(!autorizado&&!this.tiene(usuario,Rol.PROFESOR)&&!esAdmin) throw new ForbiddenException('Solo el patinador, su acudiente o el profesor responsable puede solicitar la inscripción');
    return this.db.transaccion(async(tx)=>{
      const {rows:pr}=await tx.query(
        `SELECT p.id,p.competencia_id AS "competenciaId",c.estado,c.apertura_inscripciones,c.cierre_inscripciones
         FROM prueba p JOIN competencia c ON c.id=p.competencia_id WHERE p.id=$1 FOR UPDATE`,[dto.pruebaId]);
      const p=pr[0];
      if(!p||p.estado!=='PUBLICADA') throw new BadRequestException('La prueba no pertenece a una competencia publicada');
      const ahora=Date.now();
      if(ahora<new Date(p.apertura_inscripciones).getTime()||ahora>new Date(p.cierre_inscripciones).getTime())
        throw new BadRequestException('El período de inscripciones está cerrado');
      const {rows:pre}=await tx.query(`SELECT 1 FROM preseleccion WHERE competencia_id=$1 AND patinador_id=$2`,
        [p.competenciaId,dto.patinadorId]);
      if(!pre.length) throw new BadRequestException('El patinador no fue preseleccionado por su profesor');
      const {rows:duplicada}=await tx.query(`SELECT 1 FROM inscripcion WHERE prueba_id=$1 AND patinador_id=$2`,
        [dto.pruebaId,dto.patinadorId]);
      if(duplicada.length) throw new BadRequestException('El patinador ya tiene una inscripción para esta prueba');
      if(!await this.repo.esElegiblePrueba(tx,dto.pruebaId,dto.patinadorId))
        throw new BadRequestException('El patinador no pertenece a una categoría y género habilitados para esta prueba');
      const valid=await this.repo.validaciones(tx,dto.patinadorId);
      if(!valid) throw new NotFoundException('El patinador no existe o está inactivo');
      const confirmar=dto.confirmarAutorizacionAcudiente===true;
      if(valid.menor===true && confirmar && !await this.repo.esAcudiente(tx,usuario.id,dto.patinadorId))
        throw new ForbiddenException('La autorización digital debe confirmarla el acudiente asociado');
      const resultado=await this.repo.crearInscripcion(tx,dto,usuario.id,valid,valid.menor===true && confirmar);
      await this.auditoria.registrar(tx,{modulo:'M4',tabla:'inscripcion',registroId:resultado.id,
        accion:resultado.estado==='APROBADA'?'APROBAR_INSCRIPCION':'RECHAZAR_INSCRIPCION',
        valorNuevo:resultado,usuarioId:usuario.id});
      return resultado;
    });
  }

  async inscripciones(usuario:UsuarioAutenticado,pruebaId:number) {
    this.gestor(usuario);
    const prueba=await this.repo.pruebasCompetencia(this.db.consultor,pruebaId);
    if(!prueba) throw new NotFoundException('La prueba no existe');
    return this.repo.inscripciones(this.db.consultor,pruebaId);
  }

  async participantesResultado(usuario:UsuarioAutenticado,pruebaId:number) {
    this.gestor(usuario);
    const p=await this.repo.pruebasCompetencia(this.db.consultor,pruebaId);
    if(!p) throw new NotFoundException('La prueba no existe');
    return this.repo.participantesResultado(this.db.consultor,pruebaId);
  }

  private tiempoMs(tiempo?:string, noFinalizo?:boolean):number|null {
    if(noFinalizo) return null;
    if(!tiempo || !/^\d{2}:\d{2}\.\d{3}$/.test(tiempo)) throw new BadRequestException('El tiempo debe tener formato MM:SS.mmm');
    const [min,resto]=tiempo.split(':'); const [seg,ms]=resto.split('.');
    if(Number(seg)>59) throw new BadRequestException('Los segundos deben estar entre 00 y 59');
    const total=(Number(min)*60+Number(seg))*1000+Number(ms);
    if(total<=0) throw new BadRequestException('El tiempo debe ser mayor que cero');
    return total;
  }
  async registrarResultado(usuario:UsuarioAutenticado,dto:any) {
    this.gestor(usuario);
    if(!dto.noFinalizo&&!dto.tiempo) throw new BadRequestException('Ingresa un tiempo o marca No finalizó');
    if(dto.noFinalizo&&dto.tiempo) throw new BadRequestException('No ingreses tiempo cuando marcas No finalizó');
    const ms=this.tiempoMs(dto.tiempo,dto.noFinalizo);
    return this.db.transaccion(async(tx)=>{
      const ins=await this.repo.existeInscripcion(tx,dto.inscripcionId);
      if(!ins||ins.estado!=='APROBADA') throw new BadRequestException('Solo se registran resultados de inscripciones aprobadas');
      const {rows:resultadoExistente}=await tx.query(`SELECT id FROM resultado WHERE inscripcion_id=$1`,[dto.inscripcionId]);
      if(resultadoExistente.length) throw new BadRequestException('El resultado ya está registrado. Solicita al Administrador una corrección.');
      const comp=await this.repo.pruebasCompetencia(tx,ins.pruebaId);
      if(!comp||comp.estadoCompetencia!=='PUBLICADA')
        throw new BadRequestException('Solo se registran resultados de competencias publicadas y no finalizadas');
      if(new Date(comp.fechaHora).getTime()>Date.now())
        throw new BadRequestException('La prueba todavía no se ha disputado');
      const marcaAnterior=await this.repo.marcaAnterior(tx,dto.inscripcionId);
      const id=await this.repo.guardarResultado(tx,dto,usuario.id,ms);
      await this.repo.recalcularPuestos(tx,ins.pruebaId);
      await this.auditoria.registrar(tx,{modulo:'M4',tabla:'resultado',registroId:id,accion:'REGISTRAR_RESULTADO',
        valorNuevo:{...dto,tiempoMs:ms},usuarioId:usuario.id});
      const marcaActual=ms===null?null:await this.repo.marcaActual(tx,marcaAnterior.patinadorId,marcaAnterior.modalidad,marcaAnterior.distancia);
      const nuevoRecord=marcaActual!==null && (marcaAnterior.marcaAnteriorMs===null || marcaActual<marcaAnterior.marcaAnteriorMs);
      return {resultadoId:id,tabla:await this.repo.tablaResultados(tx,ins.pruebaId),
        recordPersonal:marcaActual===null?null:{nuevoRecord,mejorTiempoMs:marcaActual,
          marcaAnteriorMs:marcaAnterior.marcaAnteriorMs,
          diferenciaMs:nuevoRecord&&marcaAnterior.marcaAnteriorMs!==null?marcaAnterior.marcaAnteriorMs-marcaActual:null}};

    });
  }

  async tablaResultados(usuario:UsuarioAutenticado,pruebaId:number) {
    this.gestor(usuario);
    return this.repo.tablaResultados(this.db.consultor,pruebaId);
  }
  async ranking(usuario:UsuarioAutenticado,categoriaId?:number,nivelId?:number) {
    const restringido=this.tiene(usuario,Rol.PATINADOR,Rol.ACUDIENTE);
    const permitidas=restringido
      ? await this.repo.categoriasVisiblesUsuario(this.db.consultor,usuario.id,this.tiene(usuario,Rol.ACUDIENTE))
      : undefined;
    if(restringido && categoriaId!==undefined && !permitidas?.includes(categoriaId))
      throw new ForbiddenException('Solo puedes consultar rankings de tu categoría');
    return this.repo.ranking(this.db.consultor,categoriaId,nivelId,permitidas);
  }

  async rendimiento(usuario:UsuarioAutenticado,patinadorId:number) {
    const permitido=this.tiene(usuario,Rol.ADMINISTRADOR,Rol.PROFESOR) ||
      await this.repo.puedeSolicitar(this.db.consultor,usuario.id,patinadorId);
    if(!permitido) throw new ForbiddenException('Solo puedes consultar tu historial o el de los patinadores a tu cargo');
    return this.repo.rendimiento(this.db.consultor,patinadorId);
  }

  async corregir(usuario:UsuarioAutenticado,id:number,dto:any) {
    this.admin(usuario);
    if(!dto.noFinalizo&&!dto.tiempo) throw new BadRequestException('Ingresa el tiempo corregido o marca No finalizó');
    if(dto.noFinalizo&&dto.tiempo) throw new BadRequestException('No ingreses tiempo cuando marcas No finalizó');
    const ms=this.tiempoMs(dto.tiempo,dto.noFinalizo);
    return this.db.transaccion(async(tx)=>{
      const anterior=await this.repo.inscripcionResultado(tx,id);
      if(!anterior) throw new NotFoundException('El resultado no existe');
      await this.repo.corregir(tx,id,{...dto,usuarioId:usuario.id},ms);
      await this.repo.recalcularPuestos(tx,anterior.pruebaId);
      await this.auditoria.registrar(tx,{modulo:'M4',tabla:'resultado',registroId:id,accion:'CORREGIR_RESULTADO',
        valorAnterior:anterior,valorNuevo:{tiempoMs:ms,noFinalizo:dto.noFinalizo},motivo:dto.motivo,usuarioId:usuario.id});
      return {resultadoId:id,tabla:await this.repo.tablaResultados(tx,anterior.pruebaId)};
    });
  }

  async historialCorrecciones(usuario:UsuarioAutenticado,resultadoId:number) {
    this.admin(usuario);
    const resultado=await this.repo.inscripcionResultado(this.db.consultor,resultadoId);
    if(!resultado) throw new NotFoundException('El resultado no existe');
    return this.repo.historialCorrecciones(this.db.consultor,resultadoId);
  }

  async publicarResultados(usuario:UsuarioAutenticado,competenciaId:number) {
    if(!this.tiene(usuario,Rol.ADMINISTRADOR,Rol.PROFESOR)) throw new ForbiddenException('Solo Administrador o Profesor');
    return this.db.transaccion(async(tx)=>{
      const c=await this.repo.competencia(tx,competenciaId,true);
      if(!c||c.estado!=='PUBLICADA') throw new BadRequestException('La competencia debe estar publicada y no finalizada');
      const {rows}=await tx.query(
        `SELECT count(r.id)::int AS total_resultados,
          count(*) FILTER (WHERE i.estado='APROBADA' AND r.id IS NULL)::int AS pendientes
         FROM inscripcion i JOIN prueba p ON p.id=i.prueba_id
         LEFT JOIN resultado r ON r.inscripcion_id=i.id WHERE p.competencia_id=$1`,[competenciaId]);
      if(!rows[0].total_resultados) throw new BadRequestException('No hay resultados registrados para publicar');
      if(rows[0].pendientes>0) throw new BadRequestException('Registra un tiempo o marca No finalizó para todos los patinadores aprobados antes de publicar');
      await this.repo.publicarResultados(tx,competenciaId);
      await this.auditoria.registrar(tx,{modulo:'M4',tabla:'competencia',registroId:competenciaId,
        accion:'PUBLICAR_RESULTADOS',valorAnterior:{estado:c.estado},valorNuevo:{estado:'FINALIZADA'},usuarioId:usuario.id});
      await tx.query(
        `INSERT INTO notificacion (usuario_id,modulo,titulo,mensaje,entidad,entidad_id)
         SELECT DISTINCT destinatario.usuario_id,'M4','Resultados publicados',$2,'competencia',$1
         FROM (
           SELECT i.solicitada_por AS usuario_id FROM inscripcion i JOIN prueba p ON p.id=i.prueba_id WHERE p.competencia_id=$1
           UNION SELECT pt.usuario_id FROM inscripcion i JOIN prueba p ON p.id=i.prueba_id
             JOIN patinador pt ON pt.id=i.patinador_id WHERE p.competencia_id=$1 AND pt.usuario_id IS NOT NULL
           UNION SELECT aa.acudiente_id FROM inscripcion i JOIN prueba p ON p.id=i.prueba_id
             JOIN acudiente_patinador aa ON aa.patinador_id=i.patinador_id AND aa.desvinculado_en IS NULL WHERE p.competencia_id=$1
         ) destinatario WHERE destinatario.usuario_id IS NOT NULL`,
        [competenciaId,`Los resultados de ${c.nombre} ya están publicados.`]);
      return {competenciaId,estado:'FINALIZADA',mensaje:'Resultados publicados correctamente'};
    });
  }
}
