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

/** Primer día del mes que está `meses` antes del mes de `fecha`. */
function mesesAtras(fecha: string, meses: number): string {
  let periodo = primerDiaDelMes(fecha);
  for (let i = 0; i < meses; i++) periodo = primerDiaDelMes(sumarDias(periodo, -1));
  return periodo;
}

// Reglas de la reunión con el cliente del 19/11/2026 (valores provisionales en parametro_sistema).
// Necesita la base de db/compose.yaml (o DB_HOST apuntando a otra). Sin DB_HOST se omite.
describe.skipIf(!process.env.DB_HOST)('M5 reglas del cliente: mora, día de gracia y valoración (e2e)', () => {
  let app: INestApplication<App>;
  let baseDatos: BaseDatosService;
  // Único por archivo y ejecución: los archivos e2e corren en paralelo sobre la misma base.
  const sufijo = `rc${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const hoy = hoyEnClub();
  const mesActual = primerDiaDelMes(hoy);
  const ids: Record<string, number> = {};
  const cookies: Record<string, string> = {};
  const como = (usuario: string) => ({ Cookie: cookies[usuario] });
  const http = () => request(app.getHttpServer());
  const datosPago = { fechaPago: hoy, medioPago: 'EFECTIVO' };

  async function crearUsuario(clave: string, roles: string[]): Promise<void> {
    const [{ id }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO usuario (nombres, apellidos, correo, contrasena_hash) VALUES ($1, $2, $3, 'x') RETURNING id`,
      [clave, `Prueba ${sufijo}`, `${clave}.${sufijo}@example.com`],
    );
    await baseDatos.consultar(
      `INSERT INTO usuario_rol (usuario_id, rol_id) SELECT $1, id FROM rol WHERE codigo = ANY($2)`,
      [id, roles],
    );
    ids[clave] = id;
    cookies[clave] = await abrirSesionDePrueba(baseDatos, id);
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

  async function crearPlan(clave: string, tipo: 'TRES_DIAS' | 'DIA_UNICO', valor: number): Promise<void> {
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
  }

  async function asignar(patinador: string, plan: string, desde: string): Promise<number> {
    const [{ id }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO asignacion_plan (patinador_id, plan_id, fecha_inicio, asignado_por)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [ids[patinador], ids[plan], desde, ids.admin],
    );
    return id;
  }

  /** Mensualidad de `periodo` (180.000, límite el día 5), sin pagar. */
  async function mensualidad(patinador: string, asignacion: number, periodo: string): Promise<number> {
    const [{ id }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO cobro (patinador_id, asignacion_plan_id, concepto, periodo, descripcion, valor, fecha_limite)
       VALUES ($1, $2, 'MENSUALIDAD', $3, 'Mensualidad', 180000, $4) RETURNING id`,
      [ids[patinador], asignacion, periodo, sumarDias(periodo, 4)],
    );
    return id;
  }

  const recargosDe = (cobroId: number) =>
    baseDatos.consultar<{ valor: number; estado: string; fechaLimite: string }>(
      `SELECT valor, estado, fecha_limite AS "fechaLimite" FROM cobro
       WHERE concepto = 'RECARGO_MORA' AND cobro_origen_id = $1`,
      [cobroId],
    );

  const asignacion = async (id: number) =>
    (
      await baseDatos.consultar<{ fechaFin: string | null; motivoFin: string | null }>(
        'SELECT fecha_fin AS "fechaFin", motivo_fin AS "motivoFin" FROM asignacion_plan WHERE id = $1',
        [id],
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
    await crearPlan('diario', 'DIA_UNICO', 35000);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('plan mensual: recargo el segundo mes y cancelación el tercero', () => {
    beforeAll(async () => {
      // Debe el mes pasado: sigue entrenando, con recargo.
      await crearPatinador('debeUnMes');
      ids.asigUnMes = await asignar('debeUnMes', 'mensual', mesesAtras(hoy, 1));
      ids.cobroUnMes = await mensualidad('debeUnMes', ids.asigUnMes, mesesAtras(hoy, 1));

      // Debe desde hace dos meses: al empezar el tercer mes se cancela su plan.
      await crearPatinador('debeDosMeses');
      ids.asigDosMeses = await asignar('debeDosMeses', 'mensual', mesesAtras(hoy, 2));
      ids.cobroDosMeses = await mensualidad('debeDosMeses', ids.asigDosMeses, mesesAtras(hoy, 2));
      ids.cobroDosMesesB = await mensualidad('debeDosMeses', ids.asigDosMeses, mesesAtras(hoy, 1));

      // Al día: pagó el mes pasado.
      await crearPatinador('alDia');
      ids.asigAlDia = await asignar('alDia', 'mensual', mesesAtras(hoy, 1));
      ids.cobroAlDia = await mensualidad('alDia', ids.asigAlDia, mesesAtras(hoy, 1));
      await http()
        .post('/m5/pagos/cobro')
        .set(como('contador'))
        .send({ cobroId: ids.cobroAlDia, monto: 180000, ...datosPago })
        .expect(201);

      const res = await http().post('/m5/cobros/generacion').set(como('admin')).send({}).expect(200);
      expect(res.body.recargosMora).toBeGreaterThanOrEqual(3);
      expect(res.body.cancelacionesPorMora).toBeGreaterThanOrEqual(1);
    });

    it('cobra un recargo del 10 % por cada mensualidad atrasada, que vence el día 5', async () => {
      expect(await recargosDe(ids.cobroUnMes)).toEqual([
        { valor: 18000, estado: 'PENDIENTE', fechaLimite: sumarDias(mesActual, 4) },
      ]);
      expect(await recargosDe(ids.cobroDosMeses)).toHaveLength(1);
      expect(await recargosDe(ids.cobroDosMesesB)).toHaveLength(1);
      expect(await recargosDe(ids.cobroAlDia)).toEqual([]);
    });

    it('no repite el recargo si el proceso vuelve a correr', async () => {
      await http().post('/m5/cobros/generacion').set(como('admin')).send({}).expect(200);
      expect(await recargosDe(ids.cobroUnMes)).toHaveLength(1);
    });

    it('el primer mes sin pagar se sigue entrenando: el plan no se cancela y recibe la mensualidad', async () => {
      expect(await asignacion(ids.asigUnMes)).toEqual({ fechaFin: null, motivoFin: null });
      const [{ cantidad }] = await baseDatos.consultar<{ cantidad: number }>(
        `SELECT count(*)::int AS cantidad FROM cobro WHERE asignacion_plan_id = $1 AND periodo = $2`,
        [ids.asigUnMes, mesActual],
      );
      expect(cantidad).toBe(1);
    });

    it('al tercer mes sin pagar cancela el plan, conserva la deuda y lo deja en la auditoría', async () => {
      expect(await asignacion(ids.asigDosMeses)).toEqual({
        fechaFin: sumarDias(mesActual, -1),
        motivoFin: 'Cancelado por no pago: mensualidad pendiente desde hace tres meses',
      });
      const [{ cantidad }] = await baseDatos.consultar<{ cantidad: number }>(
        `SELECT count(*)::int AS cantidad FROM cobro WHERE asignacion_plan_id = $1 AND periodo = $2`,
        [ids.asigDosMeses, mesActual],
      );
      expect(cantidad).toBe(0);

      const cuenta = await http()
        .get(`/m5/patinadores/${ids.debeDosMeses}/estado-cuenta`)
        .set(como('contador'))
        .expect(200);
      expect(cuenta.body.plan).toBeNull();
      expect(cuenta.body.cartera).toMatchObject({ estado: 'VENCIDO', saldoPendiente: 180000 * 2 + 18000 * 2 });

      const auditoria = await baseDatos.consultar<{ accion: string; usuarioId: number | null }>(
        `SELECT accion, usuario_id AS "usuarioId" FROM auditoria WHERE tabla = 'asignacion_plan' AND registro_id = $1`,
        [ids.asigDosMeses],
      );
      expect(auditoria).toEqual([{ accion: 'CANCELAR_POR_MORA', usuarioId: null }]);
    });
  });

  describe('plan diario: día de gracia con recargo', () => {
    beforeAll(async () => {
      await crearPatinador('porSesion');
      await asignar('porSesion', 'diario', mesesAtras(hoy, 1));
    });

    const pagarSesion = (fechaClase: string | undefined, numeroSesiones = 2) =>
      http()
        .post('/m5/pagos/sesion')
        .set(como('contador'))
        .send({ patinadorId: ids.porSesion, numeroSesiones, fechaClase, ...datosPago });

    it('el día de la clase se paga sin recargo', async () => {
      const res = await pagarSesion(undefined).expect(201);
      expect(res.body).toMatchObject({ fechaClase: hoy, recargo: 0, monto: 70000 });
    });

    it('se puede pagar por adelantado sin recargo', async () => {
      const res = await pagarSesion(sumarDias(hoy, 3), 1).expect(201);
      expect(res.body).toMatchObject({ recargo: 0, monto: 35000 });
    });

    it('al día siguiente de la clase cobra el 10 % de recargo', async () => {
      const res = await pagarSesion(sumarDias(hoy, -1)).expect(201);
      expect(res.body).toMatchObject({ fechaClase: sumarDias(hoy, -1), recargo: 7000, monto: 77000 });
      ids.pagoGracia = res.body.pagoId;
    });

    it('después del día de gracia ya no acepta el pago', async () => {
      const res = await pagarSesion(sumarDias(hoy, -2)).expect(409);
      expect(res.body.message).toContain('hasta el día siguiente a la clase');
    });

    it('al anular el pago con recargo se anulan sus dos cobros', async () => {
      const res = await http()
        .patch(`/m5/pagos/${ids.pagoGracia}/anular`)
        .set(como('admin'))
        .send({ motivo: 'Se registró al patinador equivocado' })
        .expect(200);
      expect(res.body.cobros.map((c: { estado: string }) => c.estado)).toEqual(['ANULADO', 'ANULADO']);
      expect(res.body.estadoCartera.saldoPendiente).toBe(0);
    });
  });

  describe('clase de valoración', () => {
    beforeAll(async () => {
      await crearPatinador('nuevo');
      await crearPatinador('sinValoracion');
    });

    it('la registra el Administrador o el Contador, no el acudiente', async () => {
      await http()
        .post('/m5/pagos/valoracion')
        .set(como('acudiente'))
        .send({ patinadorId: ids.nuevo, ...datosPago })
        .expect(403);
      const res = await http()
        .post('/m5/pagos/valoracion')
        .set(como('contador'))
        .send({ patinadorId: ids.nuevo, ...datosPago })
        .expect(201);
      expect(res.body).toMatchObject({ monto: 10000 });
      expect(res.body.comprobante.numero).toMatch(/^CP-\d{6}$/);
      ids.pagoValoracion = res.body.pagoId;
    });

    it('el buscador de patinadores muestra la valoración pagada y la pantalla conoce los valores', async () => {
      const busqueda = await http().get('/m5/patinadores').query({ patinadorId: ids.nuevo }).set(como('contador')).expect(200);
      expect(busqueda.body[0]).toMatchObject({ valoracionPagada: 10000, matriculaPagada: false });
      const parametros = await http().get('/m5/pagos/parametros').set(como('contador')).expect(200);
      expect(parametros.body).toEqual({ valorValoracion: 10000, recargoSesionPct: 10, recargoMoraMensualPct: 10 });
      await http().get('/m5/pagos/parametros').set(como('acudiente')).expect(403);
    });

    it('se paga una sola vez', async () => {
      await http()
        .post('/m5/pagos/valoracion')
        .set(como('contador'))
        .send({ patinadorId: ids.nuevo, ...datosPago })
        .expect(409);
    });

    it('se abona a la matrícula al inscribirse', async () => {
      const res = await http()
        .post('/m5/pagos/matricula')
        .set(como('contador'))
        .send({ patinadorId: ids.nuevo, valorMatricula: 120000, valorGastosAdministrativos: 45000, ...datosPago })
        .expect(201);
      expect(res.body).toMatchObject({ abonoValoracion: 10000, monto: 155000 });
      const [matricula] = await baseDatos.consultar<{ valor: number; descripcion: string }>(
        `SELECT valor, descripcion FROM cobro WHERE patinador_id = $1 AND concepto = 'MATRICULA'`,
        [ids.nuevo],
      );
      expect(matricula.valor).toBe(110000);
      expect(matricula.descripcion).toContain('abono de la valoración');
    });

    it('sin valoración la matrícula se cobra completa', async () => {
      const res = await http()
        .post('/m5/pagos/matricula')
        .set(como('contador'))
        .send({ patinadorId: ids.sinValoracion, valorMatricula: 120000, valorGastosAdministrativos: 45000, ...datosPago })
        .expect(201);
      expect(res.body).toMatchObject({ abonoValoracion: 0, monto: 165000 });
    });

    it('no se registra ni se anula después de la matrícula', async () => {
      await http()
        .post('/m5/pagos/valoracion')
        .set(como('contador'))
        .send({ patinadorId: ids.sinValoracion, ...datosPago })
        .expect(409);
      const res = await http()
        .patch(`/m5/pagos/${ids.pagoValoracion}/anular`)
        .set(como('admin'))
        .send({ motivo: 'No asistió a la valoración' })
        .expect(409);
      expect(res.body.message).toContain('ya se abonó a la matrícula');
    });
  });
});
