import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { BaseDatosService } from './../src/common/database/base-datos.service.js';
import { Rol } from './../src/common/auth/usuario-autenticado.js';
import { PolizasService } from './../src/modules/m1-usuarios-acceso/services/polizas.service.js';
import { AutorizacionesRepository } from './../src/modules/m1-usuarios-acceso/repositories/autorizaciones.repository.js';

const patinador = {
  id: 100,
  nombre: 'Sofía Ramírez',
  tipoDocumento: 'TI',
  numeroDocumento: '1023456789',
  edad: 9,
  esMenor: true,
  activo: true,
  acudientes: [
    { id: 10, nombre: 'Carolina Ramírez', parentesco: 'madre', esPrincipal: true },
  ],
  autorizacion: null,
  perfil: {
    estado: 'BLOQUEADO',
    tienePolizaVigente: false,
    requisitosFaltantes: ['AUTORIZACION', 'POLIZA'],
  },
};

describe('M1 · Póliza médica (e2e, HU-M1-10)', () => {
  let app: INestApplication<App>;
  let consultar: ReturnType<typeof vi.spyOn>;
  let polizasService: PolizasService;

  const sesion = (roles: Rol[]) => {
    consultar.mockResolvedValue([{ id: 10, roles, permisos: [] }]);
    return 'velora_sesion=token-prueba';
  };

  beforeEach(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = modulo.createNestApplication();
    await app.init();
    consultar = vi.spyOn(app.get(BaseDatosService), 'consultar');
    polizasService = app.get(PolizasService);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  it('exige sesión para consultar la póliza', async () => {
    const detalle = vi.spyOn(polizasService, 'detalle');

    await request(app.getHttpServer()).get('/m1/polizas/100').expect(401);
    expect(detalle).not.toHaveBeenCalled();
  });

  it('rechaza a un rol sin acceso a la póliza', async () => {
    vi.spyOn(app.get(AutorizacionesRepository), 'obtenerDetalle').mockResolvedValue(
      patinador as never,
    );

    const respuesta = await request(app.getHttpServer())
      .get('/m1/polizas/100')
      .set('Cookie', sesion([Rol.PROFESOR]))
      .expect(403);

    expect(respuesta.body.message).toBe('No puedes consultar la póliza de este patinador.');
  });

  it('devuelve el detalle al acudiente vinculado', async () => {
    vi.spyOn(polizasService, 'detalle').mockResolvedValue({
      id: 100,
      polizaActual: null,
      historial: [],
      puedeRegistrar: true,
      motivoNoRegistra: null,
    } as never);

    const respuesta = await request(app.getHttpServer())
      .get('/m1/polizas/100')
      .set('Cookie', sesion([Rol.ACUDIENTE]))
      .expect(200);

    expect(respuesta.body.puedeRegistrar).toBe(true);
  });

  it('rechaza el formulario multipart con un tipo de archivo inválido', async () => {
    const registrar = vi.spyOn(polizasService, 'registrar');

    const respuesta = await request(app.getHttpServer())
      .post('/m1/polizas/100')
      .set('Cookie', sesion([Rol.ACUDIENTE]))
      .field('aseguradora', 'Sura')
      .field('numeroPoliza', 'POL-882341')
      .field('vigenteDesde', '2026-01-01')
      .field('vigenteHasta', '2026-12-31')
      .attach('archivo', Buffer.from('no es una póliza'), {
        filename: 'poliza.txt',
        contentType: 'text/plain',
      })
      .expect(400);

    expect(respuesta.body.message).toBe('El archivo debe ser PDF, JPG o PNG.');
    expect(registrar).not.toHaveBeenCalled();
  });

  it('registra la póliza con el documento adjunto', async () => {
    const registrar = vi
      .spyOn(polizasService, 'registrar')
      .mockResolvedValue({ id: 100 } as never);

    await request(app.getHttpServer())
      .post('/m1/polizas/100')
      .set('Cookie', sesion([Rol.ACUDIENTE]))
      .field('aseguradora', 'Sura')
      .field('numeroPoliza', 'POL-882341')
      .field('vigenteDesde', '2026-01-01')
      .field('vigenteHasta', '2026-12-31')
      .attach('archivo', Buffer.from('%PDF-1.7\n%EOF'), {
        filename: 'poliza.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(registrar).toHaveBeenCalledOnce();
    const [, patinadorId, dto, archivo] = registrar.mock.calls[0];
    expect(patinadorId).toBe(100);
    expect(dto).toMatchObject({
      aseguradora: 'Sura',
      numeroPoliza: 'POL-882341',
      vigenteDesde: '2026-01-01',
      vigenteHasta: '2026-12-31',
    });
    expect(archivo).toMatchObject({
      originalname: 'poliza.pdf',
      mimetype: 'application/pdf',
    });
  });

  it('sirve el adjunto privado con sesión autorizada', async () => {
    vi.spyOn(polizasService, 'obtenerArchivo').mockResolvedValue({
      contenido: Buffer.from('%PDF-1.7\n%EOF'),
      tipo: 'application/pdf',
      nombre: 'poliza-POL-882341.pdf',
    });

    const respuesta = await request(app.getHttpServer())
      .get('/m1/polizas/100/archivo/7')
      .set('Cookie', sesion([Rol.ACUDIENTE]))
      .expect(200);

    expect(respuesta.headers['content-type']).toContain('application/pdf');
    expect(respuesta.headers['content-disposition']).toContain('poliza-POL-882341.pdf');
  });
});
