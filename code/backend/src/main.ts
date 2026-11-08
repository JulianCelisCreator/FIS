import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configurarAplicacion } from './configurar-aplicacion.js';

async function bootstrap() {
  const app = configurarAplicacion(await NestFactory.create(AppModule));
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
