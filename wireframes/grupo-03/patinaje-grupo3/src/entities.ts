import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
@Entity('acudientes')
export class Acudiente {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({unique:true}) documento!: string;
  @Column() nombres!: string;
  @Column() apellidos!: string;
  @Column() telefono!: string;
  @Column() correo!: string;
}
@Entity('estudiantes')
export class Estudiante {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({unique:true}) documento!: string;
  @Column() nombres!: string;
  @Column() apellidos!: string;
  @Column({type:'date'}) fechaNacimiento!: string;
  @Column() telefono!: string;
  @Column() direccion!: string;
  @ManyToMany(()=>Acudiente, {eager:true})
  @JoinTable({name:'estudiantes_acudientes'}) acudientes!: Acudiente[];
}
@Entity('niveles')
export class Nivel {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({unique:true}) nombre!: string;
  @Column() descripcion!: string;
  @Column({type:'int',unique:true}) orden!: number;
}
export const entities = [Estudiante, Acudiente, Nivel];
