import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { BaseDatosService } from './../src/common/database/base-datos.service.js';
import { Rol } from './../src/common/auth/usuario-autenticado.js';
import { PermisoM4 } from './../src/modules/m4-competencias-resultados/enums/permiso-m4.enum.js';
import { M4Service } from './../src/modules/m4-competencias-resultados/services/m4.service.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('protege M4 con sesión y permisos', async () => {
    const consultar = vi.spyOn(app.get(BaseDatosService), 'consultar');
    const listar = vi.spyOn(app.get(M4Service), 'listar').mockResolvedValue([]);

    await request(app.getHttpServer()).get('/m4/competencias').expect(401);

    consultar.mockResolvedValue([{ id: 1, roles: [Rol.ADMINISTRADOR], permisos: [] }]);
    await request(app.getHttpServer())
      .get('/m4/competencias')
      .set('Cookie', 'velora_sesion=token-prueba')
      .expect(403);

    consultar.mockResolvedValue([{ id: 1, roles: [Rol.ADMINISTRADOR], permisos: [PermisoM4.CONSULTAR] }]);
    await request(app.getHttpServer())
      .get('/m4/competencias')
      .set('Cookie', 'velora_sesion=token-prueba')
      .expect(200)
      .expect([]);
    expect(listar).toHaveBeenCalledOnce();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });
});
