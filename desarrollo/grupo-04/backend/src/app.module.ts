
import 'dotenv/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PlanesModule } from './modules/planes/planes.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5434,
      username: 'grupo04_app',
      password: process.env.POSTGRES_PASSWORD,
      database: 'grupo04_planes',
      autoLoadEntities: true,
      synchronize: false,
    }),
    PlanesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
