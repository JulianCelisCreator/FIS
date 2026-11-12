import { MigrationInterface, QueryRunner } from 'typeorm';
export class Inicial1793836800000 implements MigrationInterface {
 async up(q:QueryRunner):Promise<void> {
  await q.query(`CREATE TABLE estudiantes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), documento varchar NOT NULL UNIQUE, nombres varchar NOT NULL, apellidos varchar NOT NULL, "fechaNacimiento" date NOT NULL, telefono varchar NOT NULL, direccion varchar NOT NULL)`);
  await q.query(`CREATE TABLE acudientes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), documento varchar NOT NULL UNIQUE, nombres varchar NOT NULL, apellidos varchar NOT NULL, telefono varchar NOT NULL, correo varchar NOT NULL)`);
  await q.query(`CREATE TABLE niveles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre varchar NOT NULL UNIQUE, descripcion varchar NOT NULL, orden integer NOT NULL UNIQUE CHECK (orden > 0))`);
  await q.query(`CREATE TABLE estudiantes_acudientes ("estudiantesId" uuid REFERENCES estudiantes(id) ON DELETE CASCADE, "acudientesId" uuid REFERENCES acudientes(id) ON DELETE CASCADE, PRIMARY KEY ("estudiantesId", "acudientesId"))`);
 }
 async down(q:QueryRunner):Promise<void> {
  for(const tabla of ['estudiantes_acudientes','niveles','acudientes','estudiantes']) await q.query('DROP TABLE '+tabla);
 }
}
