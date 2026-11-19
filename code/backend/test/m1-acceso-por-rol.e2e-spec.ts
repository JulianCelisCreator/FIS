import { Test } from '@nestjs/testing';
import { ValidationPipe, type CanActivate, type ExecutionContext, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AutenticacionGuard } from '../src/common/auth/autenticacion.guard.js';
import { Rol, type SolicitudAutenticada } from '../src/common/auth/usuario-autenticado.js';
import { CuentasController } from '../src/modules/m1-usuarios-acceso/controllers/cuentas.controller.js';
import { CuentasService } from '../src/modules/m1-usuarios-acceso/services/cuentas.service.js';

/** Sustituye la autenticación: toma el rol del encabezado x-rol, sin base de datos. */
class AutenticacionFalsa implements CanActivate {
  canActivate(contexto: ExecutionContext): boolean {
    const solicitud = contexto.switchToHttp().getRequest<SolicitudAutenticada>();
    const rol = solicitud.headers['x-rol'] as Rol | undefined;
    solicitud.usuario = { id: 1, roles: rol ? [rol] : [], permisos: [] };
    return true;
  }
}

const cuenta = {
  nombres: 'Ana',
  apellidos: 'Pérez',
  correo: 'ana@example.com',
  rol: Rol.PROFESOR,
};

describe('Acceso por rol: POST /m1/cuentas (HU-M1-07)', () => {
  let app: INestApplication;
  const crear = vi.fn().mockResolvedValue({ id: 10 });

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [CuentasController],
      providers: [{ provide: CuentasService, useValue: { crear } }],
    })
      .overrideGuard(AutenticacionGuard)
      .useClass(AutenticacionFalsa)
      .compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  beforeEach(() => crear.mockClear());
  afterAll(() => app.close());

  it('el Administrador llega al servicio', async () => {
    const respuesta = await request(app.getHttpServer())
      .post('/m1/cuentas')
      .set('x-rol', Rol.ADMINISTRADOR)
      .send(cuenta);

    expect(respuesta.status).toBe(201);
    expect(crear).toHaveBeenCalledOnce();
  });

  it.each([Rol.PROFESOR, Rol.PATINADOR])('el rol %s recibe 403 y no llega al servicio', async (rol) => {
    const respuesta = await request(app.getHttpServer())
      .post('/m1/cuentas')
      .set('x-rol', rol)
      .send(cuenta);

    expect(respuesta.status).toBe(403);
    expect(crear).not.toHaveBeenCalled();
  });
});