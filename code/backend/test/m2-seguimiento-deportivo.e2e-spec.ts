import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configurarAplicacion } from './../src/configurar-aplicacion.js';
import { BaseDatosService } from './../src/common/database/base-datos.service.js';
import { abrirSesionDePrueba } from './utils/sesion-prueba.js';

// Necesita la base de db/compose.yaml con db/m2-permisos-seguimiento.sql aplicado
// (o DB_HOST apuntando a otra). Sin DB_HOST se omite.
describe.skipIf(!process.env.DB_HOST)('M2 seguimiento deportivo (e2e): RF-M2-07 a RF-M2-23', () => {
  let app: INestApplication<App>;
  let baseDatos: BaseDatosService;
  // Único por archivo y ejecución: los archivos e2e corren en paralelo sobre la misma base.
  const sufijo = `m2${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  const base = 20000 + Math.floor(Math.random() * 9000);
  const ids: Record<string, number> = {};
  const cookies: Record<string, string> = {};
  const como = (usuario: string) => ({ Cookie: cookies[usuario] });
  const http = () => request(app.getHttpServer());
  let observacionesOriginal = 'false';

  async function crearUsuario(clave: string, roles: string[]): Promise<number> {
    const [{ id }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO usuario (nombres, apellidos, correo, contrasena_hash) VALUES ($1, $2, $3, 'x') RETURNING id`,
      [clave, `Prueba ${sufijo}`, `${clave}.${sufijo}@example.com`],
    );
    await baseDatos.consultar(
      `INSERT INTO usuario_rol (usuario_id, rol_id) SELECT $1, id FROM rol WHERE codigo = ANY($2)`, [id, roles],
    );
    ids[clave] = id;
    cookies[clave] = await abrirSesionDePrueba(baseDatos, id);
    return id;
  }

  async function crearPatinador(clave: string, fechaNacimiento: string, genero: string, usuarioId?: number): Promise<number> {
    const [{ id }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO patinador (usuario_id, nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento, genero)
       VALUES ($1, $2, $3, 'TI', $4, $5, $6) RETURNING id`,
      [usuarioId ?? null, clave, `Prueba ${sufijo}`, `${clave}-${sufijo}`, fechaNacimiento, genero],
    );
    ids[clave] = id;
    return id;
  }

  async function matricular(patinador: string, grupo: string) {
    await baseDatos.consultar('INSERT INTO patinador_grupo (patinador_id, grupo_id) VALUES ($1, $2)', [ids[patinador], ids[grupo]]);
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configurarAplicacion(moduleFixture.createNestApplication());
    await app.init();
    baseDatos = app.get(BaseDatosService);

    await crearUsuario('admin', ['ADMINISTRADOR']);
    await crearUsuario('profe', ['PROFESOR']);
    await crearUsuario('profeAjeno', ['PROFESOR']);
    await crearUsuario('acudiente', ['ACUDIENTE']);
    await crearUsuario('usuarioAna', ['PATINADOR']);
    await crearUsuario('usuarioLuis', ['PATINADOR']);

    // Niveles, habilidades y grupos
    for (const [clave, desplazamiento] of [['nivel1', 0], ['nivel2', 1], ['nivel3', 2]] as const) {
      const [{ id }] = await baseDatos.consultar<{ id: number }>(
        'INSERT INTO nivel (nombre, orden) VALUES ($1, $2) RETURNING id', [`${clave} ${sufijo}`, base + desplazamiento],
      );
      ids[clave] = id;
    }
    for (const [clave, nivel] of [['habilidadA', 'nivel1'], ['habilidadB', 'nivel1']] as const) {
      const [{ id }] = await baseDatos.consultar<{ id: number }>(
        'INSERT INTO habilidad (nivel_id, nombre) VALUES ($1, $2) RETURNING id', [ids[nivel], `${clave} ${sufijo}`],
      );
      ids[clave] = id;
    }
    const [{ id: sede }] = await baseDatos.consultar<{ id: number }>(
      `INSERT INTO sede (nombre, direccion) VALUES ($1, 'Calle 1') RETURNING id`, [`Sede ${sufijo}`],
    );
    for (const clave of ['grupoPropio', 'grupoAjeno']) {
      const [{ id }] = await baseDatos.consultar<{ id: number }>(
        `INSERT INTO grupo (nombre, sede_id, frecuencia_semanal, cupo_maximo) VALUES ($1, $2, 2, 20) RETURNING id`,
        [`${clave} ${sufijo}`, sede],
      );
      ids[clave] = id;
    }
    await baseDatos.consultar('INSERT INTO grupo_profesor (grupo_id, profesor_id) VALUES ($1, $2), ($3, $4)',
      [ids.grupoPropio, ids.profe, ids.grupoAjeno, ids.profeAjeno]);

    // Patinadores: Ana (cuenta propia, hija del acudiente), Luis (cuenta propia, otro grupo)
    await crearPatinador('ana', '2014-03-10', 'FEMENINO', ids.usuarioAna);
    await crearPatinador('luis', '2014-05-20', 'MASCULINO', ids.usuarioLuis);
    await baseDatos.consultar(`INSERT INTO acudiente_patinador (acudiente_id, patinador_id, parentesco) VALUES ($1, $2, 'madre')`, [ids.acudiente, ids.ana]);
    await matricular('ana', 'grupoPropio');
    await matricular('luis', 'grupoAjeno');

    const [{ valor }] = await baseDatos.consultar<{ valor: string }>(`SELECT valor FROM parametro_sistema WHERE clave = 'observaciones_visibles_patinador'`);
    observacionesOriginal = valor;
    await baseDatos.consultar(`UPDATE parametro_sistema SET valor = 'false' WHERE clave = 'observaciones_visibles_patinador'`);
  });

  afterAll(async () => {
    await baseDatos.consultar(`UPDATE parametro_sistema SET valor = $1 WHERE clave = 'observaciones_visibles_patinador'`, [observacionesOriginal]);
    await app.close();
  });

  describe('Categorías (RF-M2-07, 17 y 19)', () => {
    it('el administrador crea una categoría con nivel mínimo y no admite nombres repetidos', async () => {
      const res = await http().post('/m2/categorias').set(como('admin'))
        .send({ nombre: `Infantil ${sufijo}`, edadMinima: 8, edadMaxima: 13, nivelMinimoId: ids.nivel1, genero: 'MIXTO' }).expect(201);
      ids.catInfantil = res.body.id;
      expect(res.body.nivelMinimo.nombre).toContain('nivel1');
      await http().post('/m2/categorias').set(como('admin'))
        .send({ nombre: `Infantil ${sufijo}`, edadMinima: 8 }).expect(409);
    });

    it('rechaza una edad máxima menor que la mínima y un nivel inexistente', async () => {
      await http().post('/m2/categorias').set(como('admin')).send({ nombre: `Mala ${sufijo}`, edadMinima: 10, edadMaxima: 5 }).expect(400);
      await http().post('/m2/categorias').set(como('admin')).send({ nombre: `Mala2 ${sufijo}`, edadMinima: 10, nivelMinimoId: 999999999 }).expect(400);
    });

    it('crea las categorías restantes y actualiza una', async () => {
      const juvenil = await http().post('/m2/categorias').set(como('admin'))
        .send({ nombre: `Juvenil ${sufijo}`, edadMinima: 8, edadMaxima: 17, nivelMinimoId: ids.nivel3 }).expect(201);
      ids.catJuvenil = juvenil.body.id;
      const solo = await http().post('/m2/categorias').set(como('admin'))
        .send({ nombre: `Masculina ${sufijo}`, edadMinima: 8, genero: 'MASCULINO' }).expect(201);
      ids.catMasculina = solo.body.id;
      const res = await http().patch(`/m2/categorias/${ids.catJuvenil}`).set(como('admin')).send({ edadMaxima: 18 }).expect(200);
      expect(res.body.edadMaxima).toBe(18);
    });

    it('el profesor y el acudiente ven solo las activas y sin conteos; solo el profesor ve los niveles', async () => {
      const profe = await http().get('/m2/catalogo-club').set(como('profe')).expect(200);
      expect(profe.body.niveles.length).toBeGreaterThan(0);
      expect(profe.body.categorias[0]).not.toHaveProperty('patinadoresAsignados');
      const acudiente = await http().get('/m2/catalogo-club').set(como('acudiente')).expect(200);
      expect(acudiente.body).not.toHaveProperty('niveles');
      const admin = await http().get('/m2/categorias').set(como('admin')).expect(200);
      expect(admin.body[0]).toHaveProperty('patinadoresAsignados');
    });

    it('el profesor no gestiona categorías y el patinador no consulta el catálogo', async () => {
      await http().post('/m2/categorias').set(como('profe')).send({ nombre: `X ${sufijo}`, edadMinima: 1 }).expect(403);
      await http().get('/m2/categorias').set(como('usuarioAna')).expect(403);
      await http().get('/m2/categorias').expect(401);
    });
  });

  describe('Evaluación, asignación y cambio de categoría (RF-M2-08, 09, 12 y 13)', () => {
    it('no asigna a un patinador sin nivel registrado', async () => {
      const res = await http().post(`/m2/patinadores/${ids.ana}/categoria`).set(como('admin')).send({ categoriaId: ids.catInfantil }).expect(400);
      expect(res.body.message).toContain('nivel');
    });

    it('el profesor evalúa a Ana: una evaluación aprobada fija su nivel actual', async () => {
      const res = await http().post(`/m2/patinadores/${ids.ana}/evaluaciones`).set(como('profe'))
        .send({ nivelEvaluadoId: ids.nivel1, resultado: 'APROBADO', observacion: 'Buena postura' }).expect(201);
      expect(res.body.nivelActualizado).toBe(true);
      const [{ nivel }] = await baseDatos.consultar<{ nivel: string }>(
        `SELECT n.nombre AS nivel FROM patinador_nivel pn JOIN nivel n ON n.id = pn.nivel_id WHERE pn.patinador_id = $1 AND pn.hasta IS NULL`, [ids.ana]);
      expect(nivel).toContain('nivel1');
    });

    it('una evaluación no aprobada se guarda sin cambiar el nivel', async () => {
      const res = await http().post(`/m2/patinadores/${ids.ana}/evaluaciones`).set(como('profe'))
        .send({ nivelEvaluadoId: ids.nivel2, resultado: 'EN_PROCESO' }).expect(201);
      expect(res.body.nivelActualizado).toBe(false);
    });

    it('el profesor no evalúa a un patinador de otro grupo ni con un nivel inexistente', async () => {
      await http().post(`/m2/patinadores/${ids.luis}/evaluaciones`).set(como('profe')).send({ nivelEvaluadoId: ids.nivel1, resultado: 'APROBADO' }).expect(403);
      await http().post(`/m2/patinadores/${ids.ana}/evaluaciones`).set(como('profe')).send({ nivelEvaluadoId: 999999999, resultado: 'APROBADO' }).expect(400);
      await http().post(`/m2/patinadores/${ids.ana}/evaluaciones`).set(como('profe')).send({ nivelEvaluadoId: ids.nivel1, resultado: 'EXCELENTE' }).expect(400);
    });

    it('asigna a Ana a la categoría Infantil y no repite la asignación', async () => {
      const res = await http().post(`/m2/patinadores/${ids.ana}/categoria`).set(como('admin')).send({ categoriaId: ids.catInfantil }).expect(201);
      expect(res.body.categoria).toContain('Infantil');
      await http().post(`/m2/patinadores/${ids.ana}/categoria`).set(como('admin')).send({ categoriaId: ids.catJuvenil }).expect(409);
    });

    it('valida género y nivel mínimo al asignar', async () => {
      await baseDatos.consultar('INSERT INTO patinador_nivel (patinador_id, nivel_id) VALUES ($1, $2)', [ids.luis, ids.nivel1]);
      const genero = await http().post(`/m2/patinadores/${ids.ana}/categoria/cambio`).set(como('admin')).send({ categoriaId: ids.catMasculina }).expect(400);
      expect(genero.body.message).toContain('masculina');
      const nivel = await http().post(`/m2/patinadores/${ids.luis}/categoria`).set(como('admin')).send({ categoriaId: ids.catJuvenil }).expect(400);
      expect(nivel.body.message).toContain('exige el nivel');
    });

    it('no cambia la categoría sin un avance de nivel aprobado desde que entró a la actual', async () => {
      await baseDatos.consultar(`UPDATE patinador_categoria SET desde = current_date + 1 WHERE patinador_id = $1 AND hasta IS NULL`, [ids.ana]);
      await baseDatos.consultar('UPDATE patinador_nivel SET hasta = NULL WHERE patinador_id = $1 AND hasta IS NULL', [ids.ana]);
      // La evaluación aprobada de hoy es anterior al inicio ficticio de la categoría (mañana)
      const res = await http().post(`/m2/patinadores/${ids.ana}/categoria/cambio`).set(como('admin')).send({ categoriaId: ids.catJuvenil }).expect(400);
      expect(res.body.message).toMatch(/nivel|avance/);
      await baseDatos.consultar(`UPDATE patinador_categoria SET desde = current_date WHERE patinador_id = $1 AND hasta IS NULL`, [ids.ana]);
    });

    it('con una evaluación aprobada de nivel superior el administrador cambia la categoría y queda el historial', async () => {
      await http().post(`/m2/patinadores/${ids.ana}/evaluaciones`).set(como('profe')).send({ nivelEvaluadoId: ids.nivel3, resultado: 'APROBADO' }).expect(201);
      const res = await http().post(`/m2/patinadores/${ids.ana}/categoria/cambio`).set(como('admin'))
        .send({ categoriaId: ids.catJuvenil, motivo: 'Subió a nivel 3' }).expect(201);
      expect(res.body.categoriaAnterior).toContain('Infantil');
      expect(res.body.categoria).toContain('Juvenil');
      await http().post(`/m2/patinadores/${ids.ana}/categoria/cambio`).set(como('admin')).send({ categoriaId: ids.catJuvenil }).expect(409);
    });

    it('no inactiva una categoría con patinadores asignados', async () => {
      await http().patch(`/m2/categorias/${ids.catJuvenil}`).set(como('admin')).send({ activo: false }).expect(409);
    });

    it('el profesor marca habilidades adquiridas y pendientes; rechaza ids inválidos y repetidos', async () => {
      await http().put(`/m2/patinadores/${ids.ana}/habilidades`).set(como('profe'))
        .send({ habilidades: [{ habilidadId: ids.habilidadA, estado: 'ADQUIRIDA' }, { habilidadId: ids.habilidadB, estado: 'PENDIENTE' }] }).expect(200);
      const res = await http().get(`/m2/patinadores/${ids.ana}/habilidades`).set(como('profe')).expect(200);
      const propias = res.body.filter((h: { nombre: string }) => h.nombre.endsWith(sufijo));
      expect(propias.find((h: { nombre: string }) => h.nombre.startsWith('habilidadA')).estado).toBe('ADQUIRIDA');
      expect(propias.find((h: { nombre: string }) => h.nombre.startsWith('habilidadB')).estado).toBe('PENDIENTE');
      await http().put(`/m2/patinadores/${ids.ana}/habilidades`).set(como('profe')).send({ habilidades: [{ habilidadId: 999999999, estado: 'ADQUIRIDA' }] }).expect(400);
      await http().put(`/m2/patinadores/${ids.ana}/habilidades`).set(como('profe'))
        .send({ habilidades: [{ habilidadId: ids.habilidadA, estado: 'ADQUIRIDA' }, { habilidadId: ids.habilidadA, estado: 'PENDIENTE' }] }).expect(400);
      await http().put(`/m2/patinadores/${ids.ana}/habilidades`).set(como('profeAjeno'))
        .send({ habilidades: [{ habilidadId: ids.habilidadA, estado: 'PENDIENTE' }] }).expect(403);
    });
  });

  describe('Propuestas de cambio de categoría (RF-M2-16)', () => {
    let propuestaId: number;

    beforeAll(async () => {
      // Ana vuelve a Infantil para poder proponer el regreso al Juvenil con un avance aprobado posterior
      await baseDatos.consultar(`UPDATE patinador_categoria SET hasta = current_date WHERE patinador_id = $1 AND hasta IS NULL`, [ids.ana]);
      await baseDatos.consultar(`INSERT INTO patinador_categoria (patinador_id, categoria_id) VALUES ($1, $2)`, [ids.ana, ids.catInfantil]);
    });

    it('el profesor propone y el administrador la ve pendiente; no admite una segunda propuesta', async () => {
      const res = await http().post('/m2/propuestas-categoria').set(como('profe'))
        .send({ patinadorId: ids.ana, categoriaId: ids.catJuvenil, justificacion: 'Superó el nivel 3' }).expect(201);
      expect(res.body.modo).toBe('PROPUESTA');
      propuestaId = res.body.propuestaId;
      await http().post('/m2/propuestas-categoria').set(como('profe'))
        .send({ patinadorId: ids.ana, categoriaId: ids.catJuvenil, justificacion: 'Otra vez' }).expect(409);
      const admin = await http().get('/m2/propuestas-categoria?estado=PROPUESTA').set(como('admin')).expect(200);
      expect(admin.body.some((p: { id: number }) => p.id === propuestaId)).toBe(true);
      const ajeno = await http().get('/m2/propuestas-categoria').set(como('profeAjeno')).expect(200);
      expect(ajeno.body.some((p: { id: number }) => p.id === propuestaId)).toBe(false);
    });

    it('el profesor no propone para un patinador ajeno ni sin justificación', async () => {
      await http().post('/m2/propuestas-categoria').set(como('profe')).send({ patinadorId: ids.luis, categoriaId: ids.catInfantil, justificacion: 'x' }).expect(403);
      await http().post('/m2/propuestas-categoria').set(como('profe')).send({ patinadorId: ids.ana, categoriaId: ids.catJuvenil, justificacion: '  ' }).expect(400);
    });

    it('el profesor no puede aprobar su propia propuesta', async () => {
      await http().post(`/m2/propuestas-categoria/${propuestaId}/aprobar`).set(como('profe')).expect(403);
    });

    it('el administrador aprueba: se ejecuta el cambio y no se puede resolver dos veces', async () => {
      const res = await http().post(`/m2/propuestas-categoria/${propuestaId}/aprobar`).set(como('admin')).expect(201);
      expect(res.body.categoria).toContain('Juvenil');
      await http().post(`/m2/propuestas-categoria/${propuestaId}/aprobar`).set(como('admin')).expect(409);
      await http().post(`/m2/propuestas-categoria/${propuestaId}/rechazar`).set(como('admin')).send({}).expect(409);
      const [{ estado }] = await baseDatos.consultar<{ estado: string }>('SELECT estado FROM propuesta_cambio_categoria WHERE id = $1', [propuestaId]);
      expect(estado).toBe('APROBADA');
    });

    it('el administrador rechaza una propuesta y la categoría no cambia', async () => {
      await baseDatos.consultar(`UPDATE patinador_categoria SET hasta = current_date WHERE patinador_id = $1 AND hasta IS NULL`, [ids.ana]);
      await baseDatos.consultar(`INSERT INTO patinador_categoria (patinador_id, categoria_id) VALUES ($1, $2)`, [ids.ana, ids.catInfantil]);
      const propuesta = await http().post('/m2/propuestas-categoria').set(como('profe'))
        .send({ patinadorId: ids.ana, categoriaId: ids.catJuvenil, justificacion: 'Intento 2' }).expect(201);
      await http().post(`/m2/propuestas-categoria/${propuesta.body.propuestaId}/rechazar`).set(como('admin')).send({ motivo: 'Aún no' }).expect(201);
      const [{ categoria }] = await baseDatos.consultar<{ categoria: string }>(
        `SELECT c.nombre AS categoria FROM patinador_categoria pc JOIN categoria c ON c.id = pc.categoria_id WHERE pc.patinador_id = $1 AND pc.hasta IS NULL`, [ids.ana]);
      expect(categoria).toContain('Infantil');
    });

    it('con el permiso de promoción directa concedido al rol Profesor el cambio se ejecuta de inmediato', async () => {
      await baseDatos.consultar(
        `INSERT INTO rol_permiso (rol_id, permiso_id)
         SELECT r.id, p.id FROM rol r, permiso p WHERE r.codigo = 'PROFESOR' AND p.codigo = 'M2_CATEGORIA_PROMOVER_DIRECTO' ON CONFLICT DO NOTHING`);
      try {
        const res = await http().post('/m2/propuestas-categoria').set(como('profe'))
          .send({ patinadorId: ids.ana, categoriaId: ids.catJuvenil, justificacion: 'Promoción directa' }).expect(201);
        expect(res.body.modo).toBe('EJECUTADO');
        expect(res.body.categoria).toContain('Juvenil');
      } finally {
        await baseDatos.consultar(
          `DELETE FROM rol_permiso WHERE rol_id = (SELECT id FROM rol WHERE codigo = 'PROFESOR')
             AND permiso_id = (SELECT id FROM permiso WHERE codigo = 'M2_CATEGORIA_PROMOVER_DIRECTO')`);
      }
    });
  });

  describe('Historial y consultas por rol (RF-M2-10, 11, 15, 18, 21 y 22)', () => {
    it('el administrador y el profesor ven trayectoria cronológica y evaluaciones; el patinador solo su trayectoria', async () => {
      const admin = await http().get(`/m2/patinadores/${ids.ana}/historial`).set(como('admin')).expect(200);
      expect(admin.body.trayectoria.filter((e: { tipo: string }) => e.tipo === 'CATEGORIA').length).toBeGreaterThanOrEqual(3);
      expect(admin.body.evaluaciones.length).toBeGreaterThanOrEqual(3);
      const fechas = admin.body.trayectoria.map((e: { desde: string }) => e.desde);
      expect([...fechas].sort((a: string, b: string) => a.localeCompare(b))).toEqual(fechas);
      await http().get(`/m2/patinadores/${ids.ana}/historial`).set(como('profe')).expect(200);
      const propio = await http().get(`/m2/patinadores/${ids.ana}/historial`).set(como('usuarioAna')).expect(200);
      expect(propio.body).not.toHaveProperty('evaluaciones');
    });

    it('nadie ve el historial de un patinador ajeno', async () => {
      await http().get(`/m2/patinadores/${ids.luis}/historial`).set(como('profe')).expect(403);
      await http().get(`/m2/patinadores/${ids.ana}/historial`).set(como('usuarioLuis')).expect(403);
      await http().get(`/m2/patinadores/${ids.ana}/historial`).set(como('acudiente')).expect(403);
    });

    it('el profesor ve solo a sus patinadores y la ficha no expone documento ni teléfono', async () => {
      const lista = await http().get('/m2/entrenamiento/patinadores').set(como('profe')).expect(200);
      const propios = lista.body.filter((p: { nombre: string }) => p.nombre.endsWith(sufijo) || p.nombre.includes(sufijo));
      expect(propios.map((p: { id: number }) => p.id)).toEqual([ids.ana]);
      const ficha = await http().get(`/m2/entrenamiento/patinadores/${ids.ana}`).set(como('profe')).expect(200);
      expect(ficha.body.categoria).toContain('Juvenil');
      expect(ficha.body).not.toHaveProperty('numeroDocumento');
      expect(ficha.body).not.toHaveProperty('telefonoContacto');
      await http().get(`/m2/entrenamiento/patinadores/${ids.luis}`).set(como('profe')).expect(403);
      await http().get('/m2/entrenamiento/patinadores').set(como('acudiente')).expect(403);
    });

    it('el patinador y el acudiente consultan la categoría actual de los patinadores a su cargo', async () => {
      const patinador = await http().get('/m2/categoria-actual').set(como('usuarioAna')).expect(200);
      expect(patinador.body).toHaveLength(1);
      expect(patinador.body[0].categoria.nombre).toContain('Juvenil');
      const acudiente = await http().get('/m2/categoria-actual').set(como('acudiente')).expect(200);
      expect(acudiente.body.map((p: { patinadorId: number }) => p.patinadorId)).toEqual([ids.ana]);
      const sinCategoria = await http().get('/m2/categoria-actual').set(como('usuarioLuis')).expect(200);
      expect(sinCategoria.body[0].categoria).toBeNull();
      await http().get('/m2/categoria-actual').set(como('profe')).expect(403);
    });
  });

  describe('Observaciones (RF-M2-14 y RF-M2-23)', () => {
    it('el profesor registra observaciones de su patinador, no de otro grupo ni vacías', async () => {
      await http().post(`/m2/patinadores/${ids.ana}/observaciones`).set(como('profe')).send({ texto: 'Mejora en curvas', visibleParaPatinador: true }).expect(201);
      await http().post(`/m2/patinadores/${ids.ana}/observaciones`).set(como('profe')).send({ texto: 'Nota interna' }).expect(201);
      await http().post(`/m2/patinadores/${ids.luis}/observaciones`).set(como('profe')).send({ texto: 'No es mío' }).expect(403);
      await http().post(`/m2/patinadores/${ids.ana}/observaciones`).set(como('profe')).send({ texto: '   ' }).expect(400);
      const lista = await http().get(`/m2/patinadores/${ids.ana}/observaciones`).set(como('profe')).expect(200);
      expect(lista.body).toHaveLength(2);
    });

    it('el patinador no ve observaciones mientras el club no las habilite', async () => {
      const res = await http().get('/m2/mis-observaciones').set(como('usuarioAna')).expect(403);
      expect(res.body.message).toContain('habilit');
    });

    it('solo el administrador habilita la consulta; después el patinador ve solo las visibles', async () => {
      await http().put('/m2/parametros/observaciones-visibles').set(como('profe')).send({ habilitada: true }).expect(403);
      await http().put('/m2/parametros/observaciones-visibles').set(como('admin')).send({ habilitada: true }).expect(200);
      await http().put('/m2/parametros/observaciones-visibles').set(como('admin')).send({ habilitada: true }).expect(409);
      const res = await http().get('/m2/mis-observaciones').set(como('usuarioAna')).expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].texto).toBe('Mejora en curvas');
      await http().get('/m2/mis-observaciones').set(como('acudiente')).expect(403);
      await http().put('/m2/parametros/observaciones-visibles').set(como('admin')).send({ habilitada: false }).expect(200);
      await http().get('/m2/mis-observaciones').set(como('usuarioAna')).expect(403);
    });
  });

  it('deja auditoría de los cambios sensibles del módulo', async () => {
    const filas = await baseDatos.consultar<{ accion: string }>(
      `SELECT DISTINCT accion FROM auditoria WHERE modulo = 'M2' AND usuario_id = ANY($1)`, [[ids.admin, ids.profe]]);
    const acciones = filas.map((f) => f.accion);
    expect(acciones).toEqual(expect.arrayContaining([
      'CREAR_CATEGORIA', 'ASIGNAR_CATEGORIA', 'CAMBIAR_CATEGORIA', 'EVALUAR_NIVEL', 'PROPONER_CAMBIO_CATEGORIA',
      'APROBAR_PROPUESTA_CATEGORIA', 'RECHAZAR_PROPUESTA_CATEGORIA', 'PROMOVER_CATEGORIA_DIRECTO', 'CREAR_OBSERVACION', 'HABILITAR_OBSERVACIONES',
    ]));
  });
});
