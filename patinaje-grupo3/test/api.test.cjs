const {test}=require('node:test');
const assert=require('node:assert/strict');
require('reflect-metadata');
const {newDb,DataType}=require('pg-mem');
const {randomUUID}=require('node:crypto');
const {Module,ValidationPipe}=require('@nestjs/common');
const {NestFactory}=require('@nestjs/core');
const {TypeOrmModule}=require('@nestjs/typeorm');
const request=require('supertest');
const {entities}=require('../dist/entities');
const {DeportivoModule}=require('../dist/deportivo.module');
const {Inicial1793836800000}=require('../dist/migration');
test('Historias 01–04 y validaciones mediante HTTP',async(t)=>{
 process.env.ADMIN_API_KEY='clave-aislada-de-pruebas';
 const db=newDb();
 db.public.registerFunction({name:'current_database',implementation:()=> 'test'});
 db.public.registerFunction({name:'version',implementation:()=> 'PostgreSQL 16'});
 db.public.registerFunction({name:'gen_random_uuid',returns:DataType.uuid,implementation:randomUUID,impure:true});
 const ds=db.adapters.createTypeormDataSource({type:'postgres',entities,synchronize:false});
 await ds.initialize();
 await new Inicial1793836800000().up(ds.createQueryRunner());
 class TestModule {}
 Module({imports:[TypeOrmModule.forRootAsync({useFactory:()=>({type:'postgres',entities}),dataSourceFactory:async()=>ds}),DeportivoModule]})(TestModule);
 const app=await NestFactory.create(TestModule,{logger:false});
 app.setGlobalPrefix('api');
 app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
 await app.init();
 const http=request(app.getHttpServer());
 const call=(method,url)=>http[method]('/api'+url).set('x-admin-key',process.env.ADMIN_API_KEY);
 const alumno={documento:'TI-100',nombres:'Ana',apellidos:'Prueba',fechaNacimiento:'2012-03-15',telefono:'3001234567',direccion:'Calle de prueba 1'};
 try {
 await t.test('Requiere credencial',async()=>{await http.get('/api/estudiantes').expect(401);});
 let id,acudienteId,nivelId;
 await t.test('Registra estudiante y persiste perfil',async()=>{const r=await call('post','/estudiantes').send(alumno).expect(201);id=r.body.id;const p=await call('get','/estudiantes/'+id).expect(200);assert.equal(p.body.nombres,'Ana');assert.deepEqual(p.body.acudientes,[]);});
 await t.test('Rechaza duplicados y datos inválidos',async()=>{
 await call('post','/estudiantes').send(alumno).expect(409);
 await call('post','/estudiantes').send({nombres:' '}).expect(400);
 await call('patch','/estudiantes/'+id).send({nombres:null}).expect(400);
 await call('patch','/estudiantes/'+id).send({fechaNacimiento:'2999-01-01'}).expect(400);
 await call('patch','/estudiantes/'+id).send({rol:'admin'}).expect(400);
 await call('get','/estudiantes/no-uuid').expect(400);
 });
 await t.test('Actualización parcial visible sin perder datos',async()=>{await call('patch','/estudiantes/'+id).send({direccion:'Nueva dirección'}).expect(200);const r=await call('get','/estudiantes/'+id).expect(200);assert.equal(r.body.direccion,'Nueva dirección');assert.equal(r.body.nombres,'Ana');});
 await t.test('Asocia perfiles previamente registrados',async()=>{const a=await call('post','/acudientes').send({documento:'CC-200',nombres:'Luis',apellidos:'Prueba',telefono:'3007654321',correo:'luis@example.com'}).expect(201);acudienteId=a.body.id;const r=await call('post',`/estudiantes/${id}/acudientes`).send({acudienteId}).expect(201);assert.equal(r.body.acudientes[0].id,acudienteId);await call('post',`/estudiantes/${id}/acudientes`).send({acudienteId}).expect(409);});
 await t.test('Impide asociaciones inexistentes',async()=>{await call('post',`/estudiantes/${id}/acudientes`).send({acudienteId:randomUUID()}).expect(404);await call('post',`/estudiantes/${randomUUID()}/acudientes`).send({acudienteId}).expect(404);});
 await t.test('Crea y actualiza niveles',async()=>{const r=await call('post','/niveles').send({nombre:'Iniciación',descripcion:'Equilibrio y frenado',orden:1}).expect(201);nivelId=r.body.id;await call('patch','/niveles/'+nivelId).send({descripcion:'Equilibrio, frenado y postura'}).expect(200);const lista=await call('get','/niveles').expect(200);assert.equal(lista.body[0].descripcion,'Equilibrio, frenado y postura');await call('post','/niveles').send({nombre:'Otro',descripcion:'Prueba',orden:1}).expect(409);await call('patch','/niveles/'+nivelId).send({orden:0}).expect(400);});
 await t.test('Responde 404 para recursos ausentes',async()=>{await call('patch','/niveles/'+randomUUID()).send({orden:2}).expect(404);await call('patch','/estudiantes/'+randomUUID()).send({nombres:'Otro'}).expect(404);});
 } finally {await app.close();}
});
