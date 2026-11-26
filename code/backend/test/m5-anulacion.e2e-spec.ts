import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configurarAplicacion } from './../src/configurar-aplicacion.js';
import { BaseDatosService } from './../src/common/database/base-datos.service.js';
import { hoyEnClub } from './../src/common/utils/fecha-club.js';
import { primerDiaDelMes, sumarDias } from './../src/modules/m5-planes-tarifas-pagos/utils/calculo-cobros.js';
import { abrirSesionDePrueba } from './utils/sesion-prueba.js';

// RF-M5-11. Necesita la base de db/compose.yaml (o DB_HOST apuntando a otra). Sin DB_HOST se omite.
describe.skipIf(!process.env.DB_HOST)('M5 anulación de pagos (e2e)', () => {
  let app: INestApplication<App>;
  let baseDatos: BaseDatosService;
  // Único por archivo y ejecución: los archivos e2e corren en paralelo sobre la misma base.
  const sufijo = `an${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const hoy = hoyEnClub();
  const mesActual = primerDiaDelMes(hoy);
  const ids: Record<string, number> = {};
  const cookies: Record<string, string> = {};
  const como = (usuario: string) => ({ Cookie: cookies[usuario] });
  const http = () => request(app.getHttpServer());

  async function crearUsuario(clave: string, roles: string[]): Promise<number> {
    const [{ id }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO usuario (nombres, apellidos, correo, contrasena_hash)
       VALUES ($1, $2, $3, 'x') RETURNING id`,
      [clave, `Prueba ${sufijo}`, `${clave}.${sufijo}@example.com`],
    );
    await baseDatos.consultar(
      `INSERT INTO usuario_rol (usuario_id, rol_id) SELECT $1, id FROM rol WHERE codigo = ANY($2)`,
      [id, roles],
    );
    ids[clave] = id;
    cookies[clave] = await abrirSesionDePrueba(baseDatos, id);
    return id;
  }

  async function crearPatinador(clave: string): Promise<number> {
    const [{ id }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO patinador (nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento, genero)
       VALUES ($1, $2, 'CC', $3, '2000-03-01', 'FEMENINO') RETURNING id`,
      [clave, `Prueba ${sufijo}`, `${clave}-${sufijo}`],
    );
    ids[clave] = id;
    return id;
  }

  async function crearPlan(clave: string, tipo: 'TRES_DIAS' | 'DIA_UNICO', valor: number): Promise<number> {
    const mensual = tipo === 'TRES_DIAS';
    const [{ id }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO plan (nombre, tipo, dias_por_semana, periodicidad, dia_limite_pago)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`${clave} ${sufijo}`, tipo, mensual ? 3 : 1, mensual ? 'MENSUAL' : 'POR_SESION', mensual ? 5 : null],
    );
    await baseDatos.consultar(
      `INSERT INTO tarifa (plan_id, valor, vigente_desde, registrado_por) VALUES ($1, $2, '2020-01-01', $3)`,
      [id, valor, ids.admin],
    );
    ids[clave] = id;
    return id;
  }

  async function asignar(patinador: string, plan: string): Promise<number> {
    const [{ id }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO asignacion_plan (patinador_id, plan_id, fecha_inicio, asignado_por)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [ids[patinador], ids[plan], mesActual, ids.admin],
    );
    return id;
  }

  /** Mensualidad de este mes con fecha límite de hace 10 días: con saldo queda en mora. */
  async function mensualidad(patinador: string, asignacion: number): Promise<number> {
    const [{ id }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO cobro (patinador_id, asignacion_plan_id, concepto, periodo, descripcion, valor, fecha_limite)
       VALUES ($1, $2, 'MENSUALIDAD', $3, 'Mensualidad', 180000, $4) RETURNING id`,
      [ids[patinador], asignacion, mesActual, sumarDias(hoy, -10)],
    );
    return id;
  }

  async function pagarCobro(cobroId: number, monto: number): Promise<number> {
    const res = await http()
      .post('/m5/pagos/cobro')
      .set(como('contador'))
      .send({ cobroId, monto, fechaPago: hoy, medioPago: 'EFECTIVO' })
      .expect(201);
    return res.body.pagoId as number;
  }

  const anular = (pagoId: number, motivo: unknown, usuario = 'admin') =>
    http().patch(`/m5/pagos/${pagoId}/anular`).set(como(usuario)).send({ motivo });

  const estadoCobro = async (cobroId: number) =>
    (
      await baseDatos.consultar<{ estado: string; saldo: number }>(
        `SELECT c.estado, s.saldo FROM cobro c JOIN v_saldo_cobro s ON s.cobro_id = c.id WHERE c.id = $1`,
        [cobroId],
      )
    )[0];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configurarAplicacion(moduleFixture.createNestApplication());
    await app.init();
    baseDatos = app.get(BaseDatosService);

    await crearUsuario('admin', ['ADMINISTRADOR']);
    await crearUsuario('contador', ['CONTADOR']);
    await crearUsuario('acudiente', ['ACUDIENTE']);
    await crearPlan('mensual', 'TRES_DIAS', 180000);
    await crearPlan('sesiones', 'DIA_UNICO', 35000);

    await crearPatinador('total');
    ids.cobroTotal = await mensualidad('total', await asignar('total', 'mensual'));
    ids.pagoTotal = await pagarCobro(ids.cobroTotal, 180000);

    await crearPatinador('parcial');
    ids.cobroParcial = await mensualidad('parcial', await asignar('parcial', 'mensual'));
    ids.abono1 = await pagarCobro(ids.cobroParcial, 100000);
    ids.abono2 = await pagarCobro(ids.cobroParcial, 80000);

    await crearPatinador('porSesion');
    await asignar('porSesion', 'sesiones');
    const sesion = await http()
      .post('/m5/pagos/sesion')
      .set(como('contador'))
      .send({ patinadorId: ids.porSesion, numeroSesiones: 2, fechaPago: hoy, medioPago: 'EFECTIVO' })
      .expect(201);
    ids.pagoSesion = sesion.body.pagoId;
    ids.cobroSesion = sesion.body.cobroId;
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('acceso y validaciones', () => {
    it('solo el Administrador anula: sin sesión 401; Contador y Acudiente 403', async () => {
      await http().patch(`/m5/pagos/${ids.pagoTotal}/anular`).send({ motivo: 'Valor mal digitado' }).expect(401);
      await anular(ids.pagoTotal, 'Valor mal digitado', 'contador').expect(403);
      await anular(ids.pagoTotal, 'Valor mal digitado', 'acudiente').expect(403);
    });

    it('exige un motivo de al menos 5 caracteres y como máximo 500', async () => {
      await anular(ids.pagoTotal, undefined).expect(400);
      await anular(ids.pagoTotal, '   ').expect(400);
      await anular(ids.pagoTotal, 'mal').expect(400);
      await anular(ids.pagoTotal, 'x'.repeat(501)).expect(400);
    });

    it('responde 404 si el pago no existe', async () => {
      await anular(999999999, 'Valor mal digitado').expect(404);
    });

    it('no anula pagos de cobros de M6 (ventas y préstamos)', async () => {
      const [{ id: cobro }] = await baseDatos.consultar<{ id: number }>(
        `INSERT INTO cobro (patinador_id, concepto, descripcion, valor, fecha_limite)
         VALUES ($1, 'PRESTAMO_IMPLEMENTO', 'Préstamo de prueba', 15000, $2) RETURNING id`,
        [await crearPatinador('prestamo'), hoy],
      );
      const pago = await pagarCobro(cobro, 15000);
      await anular(pago, 'Intento desde M5').expect(409);
    });
  });

  describe('pago total de una mensualidad', () => {
    it('anula el pago y el comprobante, devuelve el saldo y recalcula la cartera', async () => {
      const res = await anular(ids.pagoTotal, '  Se registró dos veces  ').expect(200);
      expect(res.body).toMatchObject({
        pagoId: ids.pagoTotal,
        estado: 'ANULADO',
        motivo: 'Se registró dos veces',
        cobros: [{ cobroId: ids.cobroTotal, montoDevuelto: 180000, estado: 'PENDIENTE' }],
        estadoCartera: { estado: 'VENCIDO', saldoPendiente: 180000 },
      });
      expect(res.body.comprobante).toMatch(/^CP-\d{6}$/);

      expect(await estadoCobro(ids.cobroTotal)).toEqual({ estado: 'PENDIENTE', saldo: 180000 });
      const [pago] = await baseDatos.consultar<{ estado: string; anuladoPor: number; motivo: string; comprobante: string }>(
        `SELECT p.estado, p.anulado_por AS "anuladoPor", p.motivo_anulacion AS motivo, c.estado AS comprobante
         FROM pago p JOIN comprobante c ON c.pago_id = p.id WHERE p.id = $1`,
        [ids.pagoTotal],
      );
      expect(pago).toEqual({ estado: 'ANULADO', anuladoPor: ids.admin, motivo: 'Se registró dos veces', comprobante: 'ANULADO' });
    });

    it('deja la anulación en la auditoría con usuario, motivo y valores', async () => {
      const auditoria = await baseDatos.consultar<{ accion: string; motivo: string; usuarioId: number; anterior: { estado: string; monto: number } }>(
        `SELECT accion, motivo, usuario_id AS "usuarioId", valor_anterior AS anterior
         FROM auditoria WHERE modulo = 'M5' AND tabla = 'pago' AND registro_id = $1`,
        [ids.pagoTotal],
      );
      expect(auditoria).toHaveLength(1);
      expect(auditoria[0]).toMatchObject({
        accion: 'ANULAR',
        motivo: 'Se registró dos veces',
        usuarioId: ids.admin,
        anterior: { estado: 'REGISTRADO', monto: 180000 },
      });
    });

    it('no anula dos veces el mismo pago', async () => {
      await anular(ids.pagoTotal, 'Otro motivo cualquiera').expect(409);
    });

    it('el historial lo muestra anulado con su motivo y el comprobante se sigue descargando', async () => {
      const historial = await http().get('/m5/pagos').query({ buscar: `total-${sufijo}` }).set(como('contador')).expect(200);
      expect(historial.body.pagos[0]).toMatchObject({ pagoId: ids.pagoTotal, estado: 'ANULADO', motivoAnulacion: 'Se registró dos veces' });
      expect(historial.body.total).toBe(0);
      const pdf = await http().get(`/m5/pagos/${ids.pagoTotal}/comprobante.pdf`).set(como('contador')).expect(200);
      expect(pdf.headers['content-type']).toContain('application/pdf');
    });

    it('el cobro vuelve a quedar disponible para pagarse', async () => {
      await pagarCobro(ids.cobroTotal, 180000);
      expect(await estadoCobro(ids.cobroTotal)).toEqual({ estado: 'PAGADO', saldo: 0 });
    });
  });

  describe('abono parcial', () => {
    it('solo devuelve el monto del abono anulado; el otro sigue aplicado', async () => {
      expect(await estadoCobro(ids.cobroParcial)).toEqual({ estado: 'PAGADO', saldo: 0 });
      const res = await anular(ids.abono2, 'Transferencia rechazada').expect(200);
      expect(res.body.cobros).toEqual([{ cobroId: ids.cobroParcial, montoDevuelto: 80000, estado: 'PENDIENTE' }]);
      expect(await estadoCobro(ids.cobroParcial)).toEqual({ estado: 'PENDIENTE', saldo: 80000 });
    });
  });

  describe('pago por sesión', () => {
    it('anula también el cobro de las sesiones, sin dejar deuda nueva', async () => {
      const res = await anular(ids.pagoSesion, 'Las clases no se dictaron').expect(200);
      expect(res.body.cobros).toEqual([{ cobroId: ids.cobroSesion, montoDevuelto: 70000, estado: 'ANULADO' }]);
      expect(res.body.estadoCartera).toEqual({ estado: 'AL_DIA', saldoPendiente: 0 });
      const [cobro] = await baseDatos.consultar<{ estado: string; motivo: string }>(
        'SELECT estado, motivo_anulacion AS motivo FROM cobro WHERE id = $1',
        [ids.cobroSesion],
      );
      expect(cobro).toEqual({ estado: 'ANULADO', motivo: 'Pago anulado: Las clases no se dictaron' });
    });
  });
});
