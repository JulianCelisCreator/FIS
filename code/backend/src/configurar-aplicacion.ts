import { type INestApplication, ValidationPipe } from '@nestjs/common';

/** Configuración común de la aplicación; la usan main.ts y las pruebas e2e. */
export function configurarAplicacion(app: INestApplication): INestApplication {
  // Valida los DTO en la frontera de entrada, rechaza campos que no declaran y
  // devuelve un solo mensaje por campo.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );
  // Cierra el pool de la base al detener el servidor.
  app.enableShutdownHooks();
  return app;
}
