import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configurarAplicacion } from './../src/configurar-aplicacion.js';
import { BaseDatosService } from './../src/common/database/base-datos.service.js';
import { hoyEnClub } from './../src/common/utils/fecha-club.js';
import {
  primerDiaDelMes,
  primerDiaMesSiguiente,
  sumarDias,
  valorPrimeraMensualidad,
} from './../src/modules/m5-planes-tarifas-pagos/utils/calculo-cobros.js';

// Necesita la base de db/compose.yaml (o DB_HOST apuntando a otra). Sin DB_HOST se omite.
describe.skipIf(!process.env.DB_HOST)('M5 asignación, cobros y pagos (e2e)', () => {
  let app: INestApplication<App>;
  let baseDatos: BaseDatosService;
  const sufijo = String(Date.now());
  const hoy = hoyEnClub();
  const ids: Record<string, number> = {};

  const como = (usuario: string) => ({ 'x-usuario-id': String(ids[usuario]) });
  const http = () => request(app.getHttpServer());

  async function crearUsuario(clave: string, roles: string[]): Promise<number> {
    const [{ id }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO usuario (nombres, apellidos, correo, contrasena_hash)
       VALUES ($1, 'Prueba', $2, 'x') RETURNING id`,
      [clave, `${clave}.${sufijo}@example.com`],
    );
    await baseDatos.consultar(
      `INSERT INTO usuario_rol (usuario_id, rol_id) SELECT $1, id FROM rol WHERE codigo = ANY($2)`,
      [id, roles],
    );
    ids[clave] = id;
    return id;
  }

  async function crearPatinador(
    clave: string,
    fechaNacimiento: string,
    opciones: { usuarioId?: number; acudienteId?: number } = {},
  ): Promise<number> {
    const [{ id }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO patinador (usuario_id, nombres, apellidos, tipo_documento, numero_documento,
                              fecha_nacimiento, genero)
       VALUES ($1, $2, 'Prueba', 'TI', $3, $4, 'FEMENINO') RETURNING id`,
      [opciones.usuarioId ?? null, clave, `${clave}-${sufijo}`, fechaNacimiento],
    );
    if (opciones.acudienteId) {
      await baseDatos.consultar(
        `INSERT INTO acudiente_patinador (acudiente_id, patinador_id, parentesco) VALUES ($1, $2, 'madre')`,
        [opciones.acudienteId, id],
      );
    }
    ids[clave] = id;
    return id;
  }

  async function crearPlan(
    clave: string,
    tipo: string,
    dias: number,
    tarifa: number,
    estado = 'ACTIVO',
  ): Promise<number> {
    const porSesion = tipo === 'DIA_UNICO';
    const [{ id }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO plan (nombre, tipo, dias_por_semana, periodicidad, dia_limite_pago, estado, desactivado_en)
       VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $6 = 'INACTIVO' THEN now() END) RETURNING id`,
      [
        `${clave} ${sufijo}`,
        tipo,
        dias,
        porSesion ? 'POR_SESION' : 'MENSUAL',
        porSesion ? null : 5,
        estado,
      ],
    );
    await baseDatos.consultar(
      `INSERT INTO tarifa (plan_id, valor, vigente_desde, registrado_por) VALUES ($1, $2, '2020-01-01', $3)`,
      [id, tarifa, ids.admin],
    );
    ids[clave] = id;
    return id;
  }

  const datosPago = { fechaPago: hoy, medioPago: 'TRANSFERENCIA', referencia: 'TRX-001' };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configurarAplicacion(moduleFixture.createNestApplication());
    await app.init();
    baseDatos = app.get(BaseDatosService);

    await crearUsuario('admin', ['ADMINISTRADOR']);
    await crearUsuario('contador', ['CONTADOR']);
    const acudiente = await crearUsuario('acudiente', ['ACUDIENTE']);
    await crearUsuario('otroAcudiente', ['ACUDIENTE']);
    const usuarioMenor = await crearUsuario('usuarioMenor', ['PATINADOR']);
    const usuarioMayor = await crearUsuario('usuarioMayor', ['PATINADOR']);

    await crearPatinador('menor', '2016-03-01', { usuarioId: usuarioMenor, acudienteId: acudiente });
    await crearPatinador('mayor', '2000-03-01', { usuarioId: usuarioMayor });
    await crearPatinador('menorSinAcudiente', '2017-03-01');
    await crearPatinador('sesion', '1999-03-01');
    await crearPatinador('generacion', '1998-03-01');

    await crearPlan('tresDias', 'TRES_DIAS', 3, 180000);
    await crearPlan('seisDias', 'SEIS_DIAS', 6, 300000);
    await crearPlan('diaUnico', 'DIA_UNICO', 1, 35000);
    await crearPlan('inactivo', 'TRES_DIAS', 3, 150000, 'INACTIVO');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('autenticación y permisos', () => {
    it('rechaza solicitudes sin usuario', () =>
      http().post('/m5/asignaciones').send({}).expect(401));

    it('rechaza al contador al asignar planes (no tiene M5_PLAN_ASIGNAR)', () =>
      http()
        .post('/m5/asignaciones')
        .set(como('contador'))
        .send({ patinadorId: ids.mayor, planId: ids.tresDias, fechaInicio: hoy })
        .expect(403));

    it('valida el cuerpo de la solicitud', async () => {
      const res = await http()
        .post('/m5/asignaciones')
        .set(como('admin'))
        .send({ patinadorId: ids.mayor, planId: ids.tresDias, fechaInicio: '2026-02-30' })
        .expect(400);
      expect(JSON.stringify(res.body)).toContain('fechaInicio no es una fecha válida');
    });
  });

  describe('RF-M5-06 asignación de plan', () => {
    it('exige la matrícula pagada antes del primer plan', async () => {
      const res = await http()
        .post('/m5/asignaciones')
        .set(como('admin'))
        .send({ patinadorId: ids.mayor, planId: ids.tresDias, fechaInicio: hoy })
        .expect(409);
      expect(res.body.message).toContain('matrícula');
    });

    it('registra matrícula y gastos con un solo comprobante', async () => {
      for (const patinador of ['mayor', 'menor', 'sesion']) {
        const res = await http()
          .post('/m5/pagos/matricula')
          .set(como('contador'))
          .send({
            patinadorId: ids[patinador],
            valorMatricula: 120000,
            valorGastosAdministrativos: 45000,
            ...datosPago,
          })
          .expect(201);
        expect(res.body.monto).toBe(165000);
        expect(res.body.comprobante.numero).toMatch(/^CP-\d{6}$/);
        expect(res.body.cobros).toHaveLength(2);
      }
    });

    it('no cobra dos veces la matrícula', () =>
      http()
        .post('/m5/pagos/matricula')
        .set(como('admin'))
        .send({ patinadorId: ids.mayor, valorMatricula: 1, valorGastosAdministrativos: 1, ...datosPago })
        .expect(409));

    it('el patinador mayor se asigna su plan y se crea la mensualidad prorrateada', async () => {
      const res = await http()
        .post('/m5/asignaciones')
        .set(como('usuarioMayor'))
        .send({ patinadorId: ids.mayor, planId: ids.tresDias, fechaInicio: hoy })
        .expect(201);
      expect(res.body.primerCobro.valor).toBe(valorPrimeraMensualidad(180000, hoy));
      expect(res.body.primerCobro.periodo).toBe(primerDiaDelMes(hoy));
      expect(res.body.primerCobro.fechaLimite >= hoy).toBe(true);
      ids.cobroMayor = res.body.primerCobro.id;
    });

    it('no asigna un segundo plan', () =>
      http()
        .post('/m5/asignaciones')
        .set(como('admin'))
        .send({ patinadorId: ids.mayor, planId: ids.seisDias, fechaInicio: hoy })
        .expect(409));

    it('un menor no se asigna su propio plan', async () => {
      const res = await http()
        .post('/m5/asignaciones')
        .set(como('usuarioMenor'))
        .send({ patinadorId: ids.menor, planId: ids.tresDias, fechaInicio: hoy })
        .expect(403);
      expect(res.body.message).toContain('menor de edad');
    });

    it('un acudiente no gestiona patinadores ajenos', () =>
      http()
        .post('/m5/asignaciones')
        .set(como('otroAcudiente'))
        .send({ patinadorId: ids.menor, planId: ids.tresDias, fechaInicio: hoy })
        .expect(403));

    it('un menor sin acudiente no puede recibir plan', async () => {
      const res = await http()
        .post('/m5/asignaciones')
        .set(como('admin'))
        .send({ patinadorId: ids.menorSinAcudiente, planId: ids.tresDias, fechaInicio: hoy })
        .expect(409);
      expect(res.body.message).toBe('Asocia un acudiente antes de asignar un plan');
    });

    it('no asigna planes inactivos', async () => {
      const res = await http()
        .post('/m5/asignaciones')
        .set(como('acudiente'))
        .send({ patinadorId: ids.menor, planId: ids.inactivo, fechaInicio: hoy })
        .expect(409);
      expect(res.body.message).toBe('Un plan inactivo no se puede asignar');
    });

    it('no acepta fechas de inicio de meses anteriores', () =>
      http()
        .post('/m5/asignaciones')
        .set(como('acudiente'))
        .send({ patinadorId: ids.menor, planId: ids.tresDias, fechaInicio: sumarDias(primerDiaDelMes(hoy), -1) })
        .expect(400));

    it('el acudiente asigna el plan del menor', () =>
      http()
        .post('/m5/asignaciones')
        .set(como('acudiente'))
        .send({ patinadorId: ids.menor, planId: ids.tresDias, fechaInicio: hoy })
        .expect(201));
  });

  describe('RF-M5-07 cambio de plan', () => {
    it('programa el cambio para el mes siguiente y avisa del ajuste de grupo', async () => {
      const res = await http()
        .post('/m5/asignaciones/cambios')
        .set(como('acudiente'))
        .send({ patinadorId: ids.menor, planId: ids.seisDias, motivo: 'Pasa a competencia' })
        .expect(201);
      expect(res.body.rigeDesde).toBe(primerDiaMesSiguiente(hoy));
      expect(res.body.proximoCobro).toMatchObject({ valor: 300000, periodo: primerDiaMesSiguiente(hoy) });
      expect(res.body.requiereAjusteGrupo).toBe(true);
    });

    it('no programa dos cambios', async () => {
      const res = await http()
        .post('/m5/asignaciones/cambios')
        .set(como('admin'))
        .send({ patinadorId: ids.menor, planId: ids.diaUnico })
        .expect(409);
      expect(res.body.message).toContain('Ya hay un cambio programado');
    });

    it('muestra el plan actual, el programado y el historial', async () => {
      const res = await http()
        .get(`/m5/patinadores/${ids.menor}/plan`)
        .set(como('acudiente'))
        .expect(200);
      expect(res.body.actual.planId).toBe(ids.tresDias);
      expect(res.body.actual.fechaFin).toBe(sumarDias(primerDiaMesSiguiente(hoy), -1));
      expect(res.body.programado.planId).toBe(ids.seisDias);
      expect(res.body.historial).toHaveLength(2);
    });

    it('no cambia a quien no tiene plan', () =>
      http()
        .post('/m5/asignaciones/cambios')
        .set(como('admin'))
        .send({ patinadorId: ids.generacion, planId: ids.seisDias })
        .expect(409));
  });

  describe('RF-M5-08 generación de mensualidades', () => {
    it('genera la mensualidad del mes una sola vez', async () => {
      const mesAnterior = sumarDias(primerDiaDelMes(hoy), -1);
      await baseDatos.consultar(
        `INSERT INTO asignacion_plan (patinador_id, plan_id, fecha_inicio, asignado_por)
         VALUES ($1, $2, $3, $4)`,
        [ids.generacion, ids.tresDias, primerDiaDelMes(mesAnterior), ids.admin],
      );

      const primera = await http()
        .post('/m5/cobros/generacion')
        .set(como('admin'))
        .send({})
        .expect(200);
      expect(primera.body.periodo).toBe(primerDiaDelMes(hoy));
      expect(primera.body.generados).toBeGreaterThanOrEqual(1);

      const segunda = await http()
        .post('/m5/cobros/generacion')
        .set(como('admin'))
        .send({})
        .expect(200);
      expect(segunda.body.generados).toBe(0);

      const pendientes = await http()
        .get(`/m5/patinadores/${ids.generacion}/cobros-pendientes`)
        .set(como('contador'))
        .expect(200);
      expect(pendientes.body.cobros).toHaveLength(1);
      expect(pendientes.body.cobros[0]).toMatchObject({
        concepto: 'MENSUALIDAD',
        periodo: primerDiaDelMes(hoy),
        valor: 180000,
        saldo: 180000,
        fechaLimite: sumarDias(primerDiaDelMes(hoy), 4),
      });
    });

    it('no genera meses futuros y solo lo hace el administrador', async () => {
      await http()
        .post('/m5/cobros/generacion')
        .set(como('admin'))
        .send({ periodo: primerDiaMesSiguiente(hoy).slice(0, 7) })
        .expect(400);
      await http().post('/m5/cobros/generacion').set(como('contador')).send({}).expect(403);
    });
  });

  describe('RF-M5-09 pago de un cobro', () => {
    it('registra un pago parcial y muestra el saldo restante', async () => {
      const valor = valorPrimeraMensualidad(180000, hoy);
      const res = await http()
        .post('/m5/pagos/cobro')
        .set(como('contador'))
        .send({ cobroId: ids.cobroMayor, monto: 1000, ...datosPago })
        .expect(201);
      expect(res.body).toMatchObject({
        saldoAnterior: valor,
        saldoRestante: valor - 1000,
        pagoParcial: true,
        cobro: { estado: 'PENDIENTE' },
      });
      expect(res.body.comprobante.numero).toMatch(/^CP-/);
      expect(['PENDIENTE', 'VENCIDO']).toContain(res.body.estadoCartera.estado);
    });

    it('no acepta montos mayores que el saldo', async () => {
      const res = await http()
        .post('/m5/pagos/cobro')
        .set(como('admin'))
        .send({ cobroId: ids.cobroMayor, monto: 999999999, ...datosPago })
        .expect(400);
      expect(res.body.message).toContain('no puede superar el saldo');
    });

    it('no acepta fechas futuras ni transferencias sin referencia', async () => {
      await http()
        .post('/m5/pagos/cobro')
        .set(como('admin'))
        .send({ cobroId: ids.cobroMayor, monto: 1, ...datosPago, fechaPago: sumarDias(hoy, 1) })
        .expect(400);
      const res = await http()
        .post('/m5/pagos/cobro')
        .set(como('admin'))
        .send({ cobroId: ids.cobroMayor, monto: 1, fechaPago: hoy, medioPago: 'TRANSFERENCIA', referencia: '  ' })
        .expect(400);
      expect(JSON.stringify(res.body)).toContain('referencia es obligatoria');

      const sinReferencia = await http()
        .post('/m5/pagos/cobro')
        .set(como('admin'))
        .send({ cobroId: ids.cobroMayor, monto: 1, fechaPago: hoy, medioPago: 'CONSIGNACION' })
        .expect(400);
      expect(sinReferencia.body.message).toEqual([
        'La referencia es obligatoria para transferencias y consignaciones',
      ]);
    });

    it('salda el cobro con el pago restante, en efectivo y sin referencia', async () => {
      const valor = valorPrimeraMensualidad(180000, hoy);
      const res = await http()
        .post('/m5/pagos/cobro')
        .set(como('admin'))
        .send({ cobroId: ids.cobroMayor, monto: valor - 1000, fechaPago: hoy, medioPago: 'EFECTIVO' })
        .expect(201);
      expect(res.body).toMatchObject({ saldoRestante: 0, pagoParcial: false, cobro: { estado: 'PAGADO' } });
      expect(res.body.estadoCartera).toEqual({ estado: 'AL_DIA', saldoPendiente: 0 });

      await http()
        .post('/m5/pagos/cobro')
        .set(como('admin'))
        .send({ cobroId: ids.cobroMayor, monto: 1, fechaPago: hoy, medioPago: 'EFECTIVO' })
        .expect(409);
    });

    it('el acudiente no registra pagos', () =>
      http()
        .post('/m5/pagos/cobro')
        .set(como('acudiente'))
        .send({ cobroId: ids.cobroMayor, monto: 1, fechaPago: hoy, medioPago: 'EFECTIVO' })
        .expect(403));
  });

  describe('RF-M5-10 pago por sesión', () => {
    it('exige un plan de día único', () =>
      http()
        .post('/m5/pagos/sesion')
        .set(como('admin'))
        .send({ patinadorId: ids.mayor, numeroSesiones: 1, ...datosPago })
        .expect(409));

    it('cobra sesiones × tarifa vigente y queda pagado de una vez', async () => {
      await http()
        .post('/m5/asignaciones')
        .set(como('admin'))
        .send({ patinadorId: ids.sesion, planId: ids.diaUnico, fechaInicio: hoy })
        .expect(201)
        .expect((res) => expect(res.body.primerCobro).toBeNull());

      const res = await http()
        .post('/m5/pagos/sesion')
        .set(como('contador'))
        .send({ patinadorId: ids.sesion, numeroSesiones: 4, ...datosPago })
        .expect(201);
      expect(res.body).toMatchObject({ numeroSesiones: 4, valorSesion: 35000, monto: 140000 });
      expect(res.body.estadoCartera.estado).toBe('AL_DIA');
    });
  });

  describe('consulta de cobros pendientes', () => {
    it('el acudiente ve los de su patinador y no los de otros', async () => {
      const res = await http()
        .get(`/m5/patinadores/${ids.menor}/cobros-pendientes`)
        .set(como('acudiente'))
        .expect(200);
      expect(res.body.cobros.length).toBeGreaterThanOrEqual(1);
      expect(res.body.saldoTotal).toBeGreaterThan(0);

      await http()
        .get(`/m5/patinadores/${ids.menor}/cobros-pendientes`)
        .set(como('otroAcudiente'))
        .expect(403);
    });

    it('el patinador menor no ve sus pagos', () =>
      http()
        .get(`/m5/patinadores/${ids.menor}/cobros-pendientes`)
        .set(como('usuarioMenor'))
        .expect(403));
  });
});
