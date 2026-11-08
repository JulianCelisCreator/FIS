import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configurarAplicacion } from './../src/configurar-aplicacion.js';
import { BaseDatosService } from './../src/common/database/base-datos.service.js';
import { hoyEnClub } from './../src/common/utils/fecha-club.js';
import {
  primerDiaMesSiguiente,
  sumarDias,
} from './../src/modules/m5-planes-tarifas-pagos/utils/calculo-cobros.js';

// Necesita la base de db/compose.yaml (o DB_HOST apuntando a otra). Sin DB_HOST se omite.
describe.skipIf(!process.env.DB_HOST)('M5 planes y tarifas (e2e)', () => {
  let app: INestApplication<App>;
  let baseDatos: BaseDatosService;
  const sufijo = String(Date.now());
  const hoy = hoyEnClub();
  const ids: Record<string, number> = {};

  const como = (usuario: string) => ({ 'x-usuario-id': String(ids[usuario]) });
  const http = () => request(app.getHttpServer());
  const nombre = (base: string) => `${base} ${sufijo}`;

  async function crearUsuario(clave: string, rol: string): Promise<void> {
    const [{ id }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO usuario (nombres, apellidos, correo, contrasena_hash)
       VALUES ($1, 'Prueba', $2, 'x') RETURNING id`,
      [clave, `${clave}.planes.${sufijo}@example.com`],
    );
    await baseDatos.consultar(
      `INSERT INTO usuario_rol (usuario_id, rol_id) SELECT $1, id FROM rol WHERE codigo = $2`,
      [id, rol],
    );
    ids[clave] = id;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configurarAplicacion(moduleFixture.createNestApplication());
    await app.init();
    baseDatos = app.get(BaseDatosService);

    await crearUsuario('admin', 'ADMINISTRADOR');
    await crearUsuario('contador', 'CONTADOR');
    await crearUsuario('acudiente', 'ACUDIENTE');
    await crearUsuario('profesor', 'PROFESOR');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('RF-M5-01 crear plan', () => {
    it('crea un plan mensual activo, aún sin tarifa ni posibilidad de asignarse', async () => {
      const res = await http()
        .post('/m5/planes')
        .set(como('admin'))
        .send({ nombre: nombre('Formación 3 días'), tipo: 'TRES_DIAS', diaLimitePago: 5 })
        .expect(201);
      expect(res.body).toMatchObject({
        tipo: 'TRES_DIAS',
        periodicidad: 'MENSUAL',
        diasPorSemana: 3,
        incluyeGimnasio: false,
        diaLimitePago: 5,
        estado: 'ACTIVO',
        tarifaVigente: null,
        asignable: false,
        patinadores: 0,
        tarifas: [],
      });
      expect(res.body.ultimaModificacion.por).toBe('admin Prueba');
      ids.mensual = res.body.id;
    });

    it('deriva periodicidad y gimnasio del tipo', async () => {
      const diaUnico = await http()
        .post('/m5/planes')
        .set(como('admin'))
        .send({ nombre: nombre('Clase suelta'), tipo: 'DIA_UNICO', descripcion: 'Pagas cada vez que vienes.' })
        .expect(201);
      expect(diaUnico.body).toMatchObject({ periodicidad: 'POR_SESION', diaLimitePago: null });
      ids.diaUnico = diaUnico.body.id;

      const gimnasio = await http()
        .post('/m5/planes')
        .set(como('admin'))
        .send({ nombre: nombre('Alto rendimiento'), tipo: 'SEIS_DIAS_GIMNASIO', diaLimitePago: 10 })
        .expect(201);
      expect(gimnasio.body).toMatchObject({ diasPorSemana: 6, incluyeGimnasio: true });
      ids.gimnasio = gimnasio.body.id;
    });

    it('valida día límite, nombre repetido y permisos', async () => {
      await http()
        .post('/m5/planes')
        .set(como('admin'))
        .send({ nombre: nombre('Sin día'), tipo: 'SEIS_DIAS' })
        .expect(400);
      await http()
        .post('/m5/planes')
        .set(como('admin'))
        .send({ nombre: nombre('Día raro'), tipo: 'SEIS_DIAS', diaLimitePago: 7 })
        .expect(400);
      await http()
        .post('/m5/planes')
        .set(como('admin'))
        .send({ nombre: nombre('Sesión con día'), tipo: 'DIA_UNICO', diaLimitePago: 5 })
        .expect(400);

      const repetido = await http()
        .post('/m5/planes')
        .set(como('admin'))
        .send({ nombre: nombre('FORMACIÓN 3 DÍAS'), tipo: 'TRES_DIAS', diaLimitePago: 5 })
        .expect(409);
      expect(repetido.body.message).toBe('Ya existe un plan con ese nombre');

      await http()
        .post('/m5/planes')
        .set(como('contador'))
        .send({ nombre: nombre('Del contador'), tipo: 'TRES_DIAS', diaLimitePago: 5 })
        .expect(403);
    });
  });

  describe('RF-M5-04 tarifas', () => {
    it('registra la tarifa vigente desde hoy y el plan pasa a ser asignable', async () => {
      const res = await http()
        .post(`/m5/planes/${ids.mensual}/tarifas`)
        .set(como('admin'))
        .send({ valor: 180000, vigenteDesde: hoy })
        .expect(201);
      expect(res.body.tarifaVigente).toEqual({ valor: 180000, vigenteDesde: hoy });
      expect(res.body.asignable).toBe(true);
    });

    it('programa una tarifa futura sin cambiar la vigente', async () => {
      const desde = primerDiaMesSiguiente(hoy);
      const res = await http()
        .post(`/m5/planes/${ids.mensual}/tarifas`)
        .set(como('admin'))
        .send({ valor: 195000, vigenteDesde: desde })
        .expect(201);
      expect(res.body.tarifaVigente.valor).toBe(180000);
      expect(res.body.tarifaProgramada).toEqual({ valor: 195000, vigenteDesde: desde });
      expect(res.body.tarifas.map((t: { estado: string }) => t.estado)).toEqual([
        'PROGRAMADA',
        'VIGENTE',
      ]);
      expect(res.body.tarifas[1].vigenteHasta).toBe(sumarDias(desde, -1));
      expect(res.body.tarifas[0].registradoPor).toBe('admin Prueba');
    });

    it('no acepta tarifas retroactivas, repetidas ni sin valor', async () => {
      await http()
        .post(`/m5/planes/${ids.mensual}/tarifas`)
        .set(como('admin'))
        .send({ valor: 1, vigenteDesde: sumarDias(hoy, -1) })
        .expect(400);
      await http()
        .post(`/m5/planes/${ids.mensual}/tarifas`)
        .set(como('admin'))
        .send({ valor: 1, vigenteDesde: hoy })
        .expect(409);
      await http()
        .post(`/m5/planes/${ids.mensual}/tarifas`)
        .set(como('admin'))
        .send({ valor: 0, vigenteDesde: hoy })
        .expect(400);
    });

    it('deja la tarifa en la auditoría con la anterior', async () => {
      const filas = await baseDatos.consultar<{ accion: string; valor_anterior: unknown }>(
        `SELECT accion, valor_anterior FROM auditoria
         WHERE tabla = 'tarifa' AND (valor_nuevo->>'planId')::bigint = $1
         ORDER BY id`,
        [ids.mensual],
      );
      expect(filas.map((f) => f.accion)).toEqual(['REGISTRAR_TARIFA', 'REGISTRAR_TARIFA']);
      expect(filas[0].valor_anterior).toBeNull();
      expect(filas[1].valor_anterior).toMatchObject({ valor: 180000 });
    });
  });

  describe('RF-M5-02 editar plan', () => {
    it('edita nombre, día límite y descripción, y registra la modificación', async () => {
      const res = await http()
        .patch(`/m5/planes/${ids.mensual}`)
        .set(como('admin'))
        .send({ nombre: nombre('Formación tres días'), diaLimitePago: 10, descripcion: '3 días por semana' })
        .expect(200);
      expect(res.body).toMatchObject({ diaLimitePago: 10, descripcion: '3 días por semana' });
      expect(res.body.nombre).toBe(nombre('Formación tres días'));
    });

    it('no permite cambiar tipo, periodicidad ni precio', async () => {
      await http()
        .patch(`/m5/planes/${ids.mensual}`)
        .set(como('admin'))
        .send({ tipo: 'SEIS_DIAS' })
        .expect(400);
      await http()
        .patch(`/m5/planes/${ids.mensual}`)
        .set(como('admin'))
        .send({ valor: 1 })
        .expect(400);
      await http()
        .patch(`/m5/planes/${ids.diaUnico}`)
        .set(como('admin'))
        .send({ diaLimitePago: 5 })
        .expect(400);
      await http().patch(`/m5/planes/${ids.mensual}`).set(como('admin')).send({}).expect(400);
    });
  });

  describe('RF-M5-05 consulta por rol', () => {
    it('la oferta muestra solo planes activos con tarifa vigente y sin datos internos', async () => {
      const res = await http().get('/m5/planes/oferta').set(como('acudiente')).expect(200);
      const nuestros = res.body.planes.filter((p: { id: number }) =>
        [ids.mensual, ids.diaUnico, ids.gimnasio].includes(p.id),
      );
      expect(nuestros.map((p: { id: number }) => p.id)).toEqual([ids.mensual]);
      expect(nuestros[0].tarifa).toEqual({ valor: 180000, vigenteDesde: hoy });
      expect(nuestros[0]).not.toHaveProperty('patinadores');
      expect(res.body.fecha).toBe(hoy);
    });

    it('la ven el contador y el acudiente, pero no el profesor', async () => {
      await http().get('/m5/planes/oferta').set(como('contador')).expect(200);
      await http().get('/m5/planes/oferta').set(como('profesor')).expect(403);
    });

    it('el administrador lista todos y filtra por tipo, estado y nombre', async () => {
      const porNombre = await http()
        .get('/m5/planes')
        .query({ buscar: sufijo })
        .set(como('admin'))
        .expect(200);
      expect(porNombre.body).toHaveLength(3);

      const porTipo = await http()
        .get('/m5/planes')
        .query({ buscar: sufijo, tipo: 'DIA_UNICO' })
        .set(como('admin'))
        .expect(200);
      expect(porTipo.body.map((p: { id: number }) => p.id)).toEqual([ids.diaUnico]);

      // Los comodines de LIKE se buscan como texto, no como patrón.
      const comodin = await http()
        .get('/m5/planes')
        .query({ buscar: `%${sufijo}` })
        .set(como('admin'))
        .expect(200);
      expect(comodin.body).toHaveLength(0);

      await http().get('/m5/planes').query({ estado: 'BORRADO' }).set(como('admin')).expect(400);
      await http().get('/m5/planes').set(como('acudiente')).expect(403);
    });
  });

  describe('RF-M5-03 desactivar plan', () => {
    it('desactiva, conserva el plan y lo saca de la oferta', async () => {
      const res = await http()
        .post(`/m5/planes/${ids.mensual}/desactivar`)
        .set(como('admin'))
        .send({ motivo: 'Se reemplaza por el plan 2027' })
        .expect(200);
      expect(res.body).toMatchObject({ estado: 'INACTIVO', asignable: false });

      const oferta = await http().get('/m5/planes/oferta').set(como('acudiente')).expect(200);
      expect(oferta.body.planes.map((p: { id: number }) => p.id)).not.toContain(ids.mensual);

      const inactivos = await http()
        .get('/m5/planes')
        .query({ buscar: sufijo, estado: 'INACTIVO' })
        .set(como('admin'))
        .expect(200);
      expect(inactivos.body.map((p: { id: number }) => p.id)).toEqual([ids.mensual]);
    });

    it('no desactiva dos veces ni registra tarifas en un plan inactivo', async () => {
      await http().post(`/m5/planes/${ids.mensual}/desactivar`).set(como('admin')).send({}).expect(409);
      await http()
        .post(`/m5/planes/${ids.mensual}/tarifas`)
        .set(como('admin'))
        .send({ valor: 200000, vigenteDesde: sumarDias(hoy, 40) })
        .expect(409);
    });

    it('no existe la eliminación de planes', () =>
      http().delete(`/m5/planes/${ids.mensual}`).set(como('admin')).expect(404));

    it('responde 404 con planes inexistentes', () =>
      http().get('/m5/planes/999999999').set(como('admin')).expect(404));
  });
});
