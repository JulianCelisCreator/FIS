import 'reflect-metadata';
import 'dotenv/config';
import { Module, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { entities } from './entities';
import { Inicial1793836800000 } from './migration';
import { DeportivoModule } from './deportivo.module';
@Module({imports:[TypeOrmModule.forRoot({type:'postgres',host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||5433),username:process.env.DB_USER||'patinaje',password:process.env.DB_PASSWORD,database:process.env.DB_NAME||'patinaje',entities,synchronize:false,migrations:[Inicial1793836800000],migrationsRun:true}),DeportivoModule]})
class AppModule {}
async function bootstrap() {
 if(!process.env.ADMIN_API_KEY || process.env.ADMIN_API_KEY==='reemplazar-por-clave-larga-aleatoria') throw new Error('Configura ADMIN_API_KEY en .env');
 const app=await NestFactory.create<NestExpressApplication>(AppModule);
 app.setGlobalPrefix('api');
 app.useStaticAssets(join(__dirname,'../frontend/dist')); 
 app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
 await app.listen(Number(process.env.PORT||3000),'0.0.0.0');
}
bootstrap().catch(e=>{console.error(e);process.exit(1);});
