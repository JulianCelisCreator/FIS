import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estudiante, Acudiente, Nivel } from './entities';
import { EstudianteDto, ActualizarEstudianteDto, AcudienteDto, NivelDto, ActualizarNivelDto } from './dto';
@Injectable()
export class DeportivoService {
 constructor(@InjectRepository(Estudiante) private estudiantes:Repository<Estudiante>,
 @InjectRepository(Acudiente) private acudientes:Repository<Acudiente>,
 @InjectRepository(Nivel) private niveles:Repository<Nivel>) {}
 private async guardar<T>(operacion:()=>Promise<T>):Promise<T> {
  try { return await operacion(); } catch(e:any) {
   if(e.code==='23505' || e.driverError?.code==='23505') throw new ConflictException('Ya existe el documento, nombre u orden indicado');
   throw e;
  }
 }
 private fecha(fecha?:string) {
  if(fecha && fecha > new Date().toISOString().slice(0,10)) throw new BadRequestException('La fecha de nacimiento no puede ser futura');
 }
 listarEstudiantes() { return this.estudiantes.find({order:{apellidos:'ASC'}}); }
 async perfil(id:string) {
  const estudiante=await this.estudiantes.findOneBy({id});
  if(!estudiante) throw new NotFoundException('Estudiante no registrado');
  return estudiante;
 }
 crearEstudiante(dto:EstudianteDto) {
  this.fecha(dto.fechaNacimiento);
  return this.guardar(()=>this.estudiantes.save(this.estudiantes.create({...dto,acudientes:[]})));
 }
 async actualizarEstudiante(id:string,dto:ActualizarEstudianteDto) {
  this.fecha(dto.fechaNacimiento);
  const estudiante=await this.perfil(id);
  return this.guardar(()=>this.estudiantes.save(Object.assign(estudiante,dto)));
 }
 crearAcudiente(dto:AcudienteDto) { return this.guardar(()=>this.acudientes.save(this.acudientes.create(dto))); }
 listarAcudientes() { return this.acudientes.find({order:{apellidos:'ASC'}}); }
 async asociar(id:string,acudienteId:string) {
  await this.perfil(id);
  if(!await this.acudientes.existsBy({id:acudienteId})) throw new NotFoundException('Acudiente no registrado');
  // Inserción sobre la relación: no sobrescribe otras asociaciones concurrentes.
  await this.guardar(()=>this.estudiantes.createQueryBuilder().relation(Estudiante,'acudientes').of(id).add(acudienteId));
  return this.perfil(id);
 }
 listarNiveles() { return this.niveles.find({order:{orden:'ASC'}}); }
 crearNivel(dto:NivelDto) { return this.guardar(()=>this.niveles.save(this.niveles.create(dto))); }
 async actualizarNivel(id:string,dto:ActualizarNivelDto) {
  const nivel=await this.niveles.findOneBy({id});
  if(!nivel) throw new NotFoundException('Nivel no registrado');
  return this.guardar(()=>this.niveles.save(Object.assign(nivel,dto)));
 }
}
