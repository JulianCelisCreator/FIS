import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import ExcelJS from 'exceljs';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configurarAplicacion } from './../src/configurar-aplicacion.js';
import { BaseDatosService } from './../src/common/database/base-datos.service.js';
import { hoyEnClub } from './../src/common/utils/fecha-club.js';
import { ConsultasPagosRepository } from './../src/modules/m5-planes-tarifas-pagos/repositories/consultas-pagos.repository.js';
import {
  primerDiaDelMes,
  sumarDias,
} from './../src/modules/m5-planes-tarifas-pagos/utils/calculo-cobros.js';
import { abrirSesionDePrueba } from './utils/sesion-prueba.js';

/** Respuesta binaria completa (PDF o XLSX) como Buffer. */
function binario(res: request.Response, callback: (error: Error | null, cuerpo: Buffer) => void) {
  const partes: Buffer[] = [];
  res.on('data', (parte: Buffer) => partes.push(parte));
  res.on('end', () => callback(null, Buffer.concat(partes)));
}

// Necesita la base de db/compose.yaml (o DB_HOST apuntando a otra). Sin DB_HOST se omite.
describe.skipIf(!process.env.DB_HOST)('M5 consultas, comprobantes y acceso por rol (e2e)', () => {
  let app: INestApplication<App>;
  let baseDatos: BaseDatosService;
  // Único por archivo y ejecución: los archivos e2e corren en paralelo sobre la misma base.
  const sufijo = `cq${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
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

  async function crearPatinador(
    clave: string,
    fechaNacimiento: string,
    opciones: { usuarioId?: number; acudienteId?: number } = {},
  ): Promise<number> {
    const [{ id }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO patinador (usuario_id, nombres, apellidos, tipo_documento, numero_documento,
                              fecha_nacimiento, genero)
       VALUES ($1, $2, $3, 'TI', $4, $5, 'FEMENINO') RETURNING id`,
      [opciones.usuarioId ?? null, clave, `Prueba ${sufijo}`, `${clave}-${sufijo}`, fechaNacimiento],
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

  /**
   * Asignación desde el día 1 de este mes y su mensualidad, pendiente y ya en
   * mora (fecha límite hace 10 días). Es la mensualidad del mes actual a
   * propósito: si otro archivo e2e lanza la generación del mes en paralelo,
   * la reconoce como existente y no le agrega otro cobro a estos patinadores.
   */
  async function mensualidadPendiente(patinador: string): Promise<number> {
    const [{ id: asignacion }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO asignacion_plan (patinador_id, plan_id, fecha_inicio, asignado_por)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [ids[patinador], ids.plan, mesActual, ids.admin],
    );
    const [{ id }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO cobro (patinador_id, asignacion_plan_id, concepto, periodo, descripcion, valor, fecha_limite)
       VALUES ($1, $2, 'MENSUALIDAD', $3, 'Mensualidad', 180000, $4) RETURNING id`,
      [ids[patinador], asignacion, mesActual, sumarDias(hoy, -10)],
    );
    return id;
  }

  async function pagar(cobro: number, monto: number, medioPago = 'EFECTIVO'): Promise<number> {
    const res = await http()
      .post('/m5/pagos/cobro')
      .set(como('contador'))
      .send({ cobroId: cobro, monto, fechaPago: hoy, medioPago, referencia: medioPago === 'EFECTIVO' ? undefined : 'TRX-9' })
      .expect(201);
    return res.body.pagoId as number;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configurarAplicacion(moduleFixture.createNestApplication());
    await app.init();
    baseDatos = app.get(BaseDatosService);

    await crearUsuario('admin', ['ADMINISTRADOR']);
    await crearUsuario('contador', ['CONTADOR']);
    await crearUsuario('profesor', ['PROFESOR']);
    const acudiente = await crearUsuario('acudiente', ['ACUDIENTE']);
    const otroAcudiente = await crearUsuario('otroAcudiente', ['ACUDIENTE']);
    const usuarioMayor = await crearUsuario('usuarioMayor', ['PATINADOR']);
    const usuarioMenor = await crearUsuario('usuarioMenor', ['PATINADOR']);

    await crearPatinador('menor', '2016-03-01', { usuarioId: usuarioMenor, acudienteId: acudiente });
    await crearPatinador('mayor', '2000-03-01', { usuarioId: usuarioMayor });
    await crearPatinador('ajeno', '2015-03-01', { acudienteId: otroAcudiente });

    const [{ id: plan }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO plan (nombre, tipo, dias_por_semana, periodicidad, dia_limite_pago)
       VALUES ($1, 'TRES_DIAS', 3, 'MENSUAL', 5) RETURNING id`,
      [`Formación ${sufijo}`],
    );
    ids.plan = plan;
    await baseDatos.consultar(
      `INSERT INTO tarifa (plan_id, valor, vigente_desde, registrado_por) VALUES ($1, 180000, '2020-01-01', $2)`,
      [plan, ids.admin],
    );

    // Menor: mensualidad del mes pasado (vencida), con dos abonos; el segundo se anula.
    ids.cobroMenor = await mensualidadPendiente('menor');
    ids.pago1 = await pagar(ids.cobroMenor, 50000);
    ids.pago2 = await pagar(ids.cobroMenor, 30000, 'TRANSFERENCIA');
    await baseDatos.consultar(
      `UPDATE pago SET estado = 'ANULADO', anulado_por = $2, anulado_en = now(), motivo_anulacion = 'Valor mal digitado'
       WHERE id = $1`,
      [ids.pago2, ids.admin],
    );
    await baseDatos.consultar(
      `UPDATE comprobante SET estado = 'ANULADO', anulado_en = now() WHERE pago_id = $1`,
      [ids.pago2],
    );
    ids.pago3 = await pagar(ids.cobroMenor, 20000);

    // Mayor: mensualidad pagada completa. Ajeno: un abono.
    ids.pagoMayor = await pagar(await mensualidadPendiente('mayor'), 180000, 'CONSIGNACION');
    ids.pagoAjeno = await pagar(await mensualidadPendiente('ajeno'), 10000);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('RF-M5-13 consulta de cartera', () => {
    it('muestra el resumen y la cartera de cada patinador', async () => {
      const res = await http().get('/m5/cartera').query({ patinador: sufijo }).set(como('admin')).expect(200);
      expect(res.body.resumen).toMatchObject({ alDia: expect.any(Number), vencido: expect.any(Number) });
      const menor = res.body.patinadores.find((p: { patinadorId: number }) => p.patinadorId === ids.menor);
      // 180.000 − 50.000 − 20.000 (el abono de 30.000 se anuló y no cuenta).
      expect(menor).toMatchObject({ estado: 'VENCIDO', saldoPendiente: 110000, cobrosVencidos: 1, esMenor: true });
      expect(menor.acudientes).toContain('acudiente');
      expect(menor.plan).toBe(`Formación ${sufijo}`);
      expect(res.body.patinadores[0].estado).toBe('VENCIDO');
    });

    it('combina filtros por estado, plan, acudiente y vencimiento', async () => {
      const vencidos = await http()
        .get('/m5/cartera')
        .query({ patinador: sufijo, estado: 'VENCIDO', planId: ids.plan })
        .set(como('contador'))
        .expect(200);
      expect(vencidos.body.patinadores.map((p: { patinadorId: number }) => p.patinadorId)).toEqual(
        expect.arrayContaining([ids.menor, ids.ajeno]),
      );
      expect(vencidos.body.patinadores).toHaveLength(2);

      const porAcudiente = await http()
        .get('/m5/cartera')
        .query({ acudiente: `otroAcudiente Prueba ${sufijo}` })
        .set(como('admin'))
        .expect(200);
      expect(porAcudiente.body.patinadores.map((p: { patinadorId: number }) => p.patinadorId)).toEqual([ids.ajeno]);

      const alDia = await http()
        .get('/m5/cartera')
        .query({ patinador: sufijo, estado: 'AL_DIA' })
        .set(como('admin'))
        .expect(200);
      expect(alDia.body.patinadores.map((p: { patinadorId: number }) => p.patinadorId)).toEqual([ids.mayor]);

      const fueraDeRango = await http()
        .get('/m5/cartera')
        .query({ patinador: sufijo, venceDesde: sumarDias(hoy, 1) })
        .set(como('admin'))
        .expect(200);
      expect(fueraDeRango.body.patinadores).toEqual([]);
    });

    it('valida los filtros', async () => {
      await http().get('/m5/cartera').query({ estado: 'MOROSO' }).set(como('admin')).expect(400);
      await http()
        .get('/m5/cartera')
        .query({ venceDesde: '2026-12-01', venceHasta: '2026-11-01' })
        .set(como('admin'))
        .expect(400);
    });
  });

  describe('RF-M5-16 historial de pagos', () => {
    it('lista los pagos con los anulados, que no suman al total', async () => {
      const res = await http().get('/m5/pagos').query({ buscar: `menor-${sufijo}` }).set(como('contador')).expect(200);
      expect(res.body.pagos.map((p: { pagoId: number }) => p.pagoId)).toEqual([ids.pago3, ids.pago2, ids.pago1]);
      expect(res.body.total).toBe(70000);
      expect(res.body.registrados).toBe(2);
      const anulado = res.body.pagos.find((p: { pagoId: number }) => p.pagoId === ids.pago2);
      expect(anulado).toMatchObject({
        estado: 'ANULADO',
        estadoComprobante: 'ANULADO',
        motivoAnulacion: 'Valor mal digitado',
        anuladoPor: `admin Prueba ${sufijo}`,
      });
      expect(anulado.cobros[0]).toMatchObject({ concepto: 'MENSUALIDAD', periodo: mesActual });
      expect(anulado.comprobante).toMatch(/^CP-\d{6}$/);
    });

    it('filtra por estado, medio, fechas y acudiente', async () => {
      const anulados = await http()
        .get('/m5/pagos')
        .query({ buscar: sufijo, estado: 'ANULADO' })
        .set(como('admin'))
        .expect(200);
      expect(anulados.body.pagos.map((p: { pagoId: number }) => p.pagoId)).toEqual([ids.pago2]);

      const consignacion = await http()
        .get('/m5/pagos')
        .query({ buscar: sufijo, medio: 'CONSIGNACION' })
        .set(como('admin'))
        .expect(200);
      expect(consignacion.body.pagos.map((p: { pagoId: number }) => p.pagoId)).toEqual([ids.pagoMayor]);

      const futuro = await http()
        .get('/m5/pagos')
        .query({ buscar: sufijo, desde: sumarDias(hoy, 1) })
        .set(como('admin'))
        .expect(200);
      expect(futuro.body.pagos).toEqual([]);

      const porAcudiente = await http()
        .get('/m5/pagos')
        .query({ buscar: `otroAcudiente Prueba ${sufijo}` })
        .set(como('admin'))
        .expect(200);
      expect(porAcudiente.body.pagos.map((p: { pagoId: number }) => p.pagoId)).toEqual([ids.pagoAjeno]);

      const [{ numero }] = await baseDatos.consultar<{ numero: string }>(
        'SELECT numero FROM comprobante WHERE pago_id = $1',
        [ids.pagoMayor],
      );
      const porComprobante = await http()
        .get('/m5/pagos')
        .query({ buscar: numero })
        .set(como('contador'))
        .expect(200);
      expect(porComprobante.body.pagos.map((p: { pagoId: number }) => p.pagoId)).toEqual([ids.pagoMayor]);

      await http().get('/m5/pagos').query({ desde: '2026-12-01', hasta: '2026-11-01' }).set(como('admin')).expect(400);
      await http().get('/m5/pagos').query({ medio: 'CHEQUE' }).set(como('admin')).expect(400);
    });

    it('exporta el historial filtrado en PDF', async () => {
      const res = await http()
        .get('/m5/pagos/exportar')
        .query({ buscar: sufijo, formato: 'pdf' })
        .set(como('admin'))
        .buffer(true)
        .parse(binario)
        .expect(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toMatch(/^attachment; filename="historial-pagos-.*\.pdf"$/);
      expect((res.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
    });

    it('exporta el historial filtrado en XLSX, con montos y total sin anulados', async () => {
      const res = await http()
        .get('/m5/pagos/exportar')
        .query({ buscar: `menor-${sufijo}`, formato: 'xlsx' })
        .set(como('contador'))
        .buffer(true)
        .parse(binario)
        .expect(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
      const libro = new ExcelJS.Workbook();
      await libro.xlsx.load(res.body as Buffer);
      const hoja = libro.getWorksheet('Historial de pagos')!;
      expect(hoja.getCell('A4').value).toBe('Comprobante');
      expect(hoja.rowCount).toBe(4 + 3 + 1);
      const total = hoja.getRow(hoja.rowCount);
      expect(total.getCell(5).value).toBe('Total sin anulados');
      expect(total.getCell(6).value).toBe(70000);
      expect(hoja.getCell('B5').value).toBeInstanceOf(Date);
      await http().get('/m5/pagos/exportar').query({ formato: 'docx' }).set(como('admin')).expect(400);
    });
  });

  describe('RF-M5-15 comprobante de pago', () => {
    it('calcula los valores al momento de cada pago', async () => {
      const repositorio = app.get(ConsultasPagosRepository);
      const tercero = await repositorio.datosComprobante(baseDatos.consultor, ids.pago3);
      // Antes del tercer pago solo cuenta el primero (el segundo está anulado).
      expect(tercero?.cobros[0]).toMatchObject({ valor: 180000, pagosAnteriores: 50000, estePago: 20000, saldoRestante: 110000 });
      const anulado = await repositorio.datosComprobante(baseDatos.consultor, ids.pago2);
      expect(anulado).toMatchObject({ estado: 'ANULADO', motivoAnulacion: 'Valor mal digitado' });
    });

    it('descarga el PDF en menos de 5 segundos', async () => {
      const inicio = Date.now();
      const res = await http()
        .get(`/m5/pagos/${ids.pago3}/comprobante.pdf`)
        .set(como('admin'))
        .buffer(true)
        .parse(binario)
        .expect(200);
      expect(Date.now() - inicio).toBeLessThan(5000);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toMatch(/^inline; filename="comprobante-CP-\d{6}\.pdf"$/);
      expect((res.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
    });

    it('el acudiente y el patinador mayor solo descargan los de sus propios pagos', async () => {
      await http().get(`/m5/pagos/${ids.pago1}/comprobante.pdf`).set(como('acudiente')).expect(200);
      await http().get(`/m5/pagos/${ids.pagoAjeno}/comprobante.pdf`).set(como('acudiente')).expect(403);
      await http().get(`/m5/pagos/${ids.pagoMayor}/comprobante.pdf`).set(como('usuarioMayor')).expect(200);
      await http().get(`/m5/pagos/${ids.pago1}/comprobante.pdf`).set(como('usuarioMayor')).expect(403);
      await http().get(`/m5/pagos/${ids.pago1}/comprobante.pdf`).set(como('usuarioMenor')).expect(403);
      await http().get(`/m5/pagos/${ids.pago1}/comprobante.pdf`).set(como('profesor')).expect(403);
      await http().get('/m5/pagos/999999999/comprobante.pdf').set(como('admin')).expect(404);
    });
  });

  describe('RF-M5-17/18 estado de cuenta (Mis pagos)', () => {
    it('el acudiente ve cartera, plan, cobros y pagos de su patinador', async () => {
      const res = await http().get(`/m5/patinadores/${ids.menor}/estado-cuenta`).set(como('acudiente')).expect(200);
      expect(res.body.patinador).toMatchObject({ id: ids.menor, esMenor: true });
      expect(res.body.cartera).toMatchObject({ estado: 'VENCIDO', saldoPendiente: 110000 });
      expect(res.body.plan).toMatchObject({ nombre: `Formación ${sufijo}`, periodicidad: 'MENSUAL', tarifa: 180000 });
      expect(res.body.cobros[0]).toMatchObject({ valor: 180000, pagado: 70000, saldo: 110000, vencido: true });
      expect(res.body.pagos).toHaveLength(3);
    });

    it('el patinador mayor ve lo suyo; el menor y los ajenos no', async () => {
      const mayor = await http().get(`/m5/patinadores/${ids.mayor}/estado-cuenta`).set(como('usuarioMayor')).expect(200);
      expect(mayor.body.cartera).toMatchObject({ estado: 'AL_DIA', saldoPendiente: 0 });
      expect(mayor.body.cobros[0]).toMatchObject({ saldo: 0, vencido: false });

      await http().get(`/m5/patinadores/${ids.menor}/estado-cuenta`).set(como('usuarioMenor')).expect(403);
      await http().get(`/m5/patinadores/${ids.menor}/estado-cuenta`).set(como('otroAcudiente')).expect(403);
      await http().get(`/m5/patinadores/${ids.menor}/estado-cuenta`).set(como('usuarioMayor')).expect(403);
      await http().get(`/m5/patinadores/${ids.menor}/estado-cuenta`).set(como('profesor')).expect(403);
      await http().get(`/m5/patinadores/${ids.menor}/estado-cuenta`).set(como('contador')).expect(200);
    });
  });

  describe('control de acceso por rol en todo M5', () => {
    // [método, ruta] de cada endpoint del módulo.
    const rutas = (): [string, string][] => [
      ['GET', '/m5/planes'],
      ['GET', '/m5/planes/oferta'],
      ['GET', '/m5/patinadores'],
      ['GET', '/m5/cartera'],
      ['GET', '/m5/pagos'],
      ['GET', '/m5/pagos/exportar?formato=pdf'],
      ['POST', '/m5/planes'],
      ['POST', '/m5/asignaciones'],
      ['POST', '/m5/cobros/generacion'],
      ['POST', '/m5/pagos/cobro'],
    ];
    const llamar = (metodo: string, ruta: string, usuario?: string) => {
      const solicitud = metodo === 'GET' ? http().get(ruta) : http().post(ruta).send({});
      return usuario ? solicitud.set(como(usuario)) : solicitud;
    };

    it('sin sesión todo responde 401', async () => {
      for (const [metodo, ruta] of rutas()) {
        await llamar(metodo, ruta).expect(401);
      }
      await http().get(`/m5/patinadores/${ids.menor}/estado-cuenta`).expect(401);
    });

    it('el profesor no tiene acceso a ninguna pantalla de pagos', async () => {
      for (const [metodo, ruta] of rutas()) {
        await llamar(metodo, ruta, 'profesor').expect(403);
      }
    });

    it('cada rol entra solo a lo que le corresponde', async () => {
      // [usuario, método, ruta, estado esperado]
      const casos: [string, string, string, number][] = [
        ['contador', 'GET', '/m5/cartera', 200],
        ['contador', 'GET', '/m5/pagos', 200],
        ['contador', 'GET', '/m5/planes', 403],
        ['contador', 'POST', '/m5/asignaciones', 403],
        ['contador', 'POST', '/m5/cobros/generacion', 403],
        ['acudiente', 'GET', '/m5/cartera', 403],
        ['acudiente', 'GET', '/m5/pagos', 403],
        ['acudiente', 'GET', '/m5/pagos/exportar?formato=pdf', 403],
        ['acudiente', 'POST', '/m5/pagos/cobro', 403],
        ['acudiente', 'GET', '/m5/planes/oferta', 200],
        ['usuarioMayor', 'GET', '/m5/cartera', 403],
        ['usuarioMayor', 'GET', '/m5/pagos', 403],
        ['usuarioMayor', 'POST', '/m5/planes', 403],
      ];
      for (const [usuario, metodo, ruta, estado] of casos) {
        const res = await llamar(metodo, ruta, usuario);
        expect({ usuario, ruta, estado: res.status }).toEqual({ usuario, ruta, estado });
      }
    });
  });
});
