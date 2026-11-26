import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configurarAplicacion } from './configurar-aplicacion.js';

// Variables locales de code/backend/.env (ver .env.example); si no existe, se usan los valores por defecto.
try {
  process.loadEnvFile();
} catch {
  // Sin .env: rigen las variables del entorno y los valores por defecto.
}

async function bootstrap() {
  const app = configurarAplicacion(await NestFactory.create(AppModule));
  await app.listen(process.env.PORT ?? 3000);
}
// Sin top-level await: en Vercel, app.listen() queda interceptado y su promesa no
// se resuelve; si el módulo la esperara, la función nunca terminaría de iniciar.
void bootstrap();
