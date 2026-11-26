import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validarAsignacionContador, validarRetiroContador } from './reglas-contador.js';

const activa = { estado: 'ACTIVO' as const, usuarioId: 9 };
const cuenta = { estado: 'ACTIVA', roles: ['PROFESOR'] };

describe('validarAsignacionContador', () => {
  it('permite asignar a personal activo con cuenta vinculada', () => {
    expect(() => validarAsignacionContador(activa, cuenta)).not.toThrow();
  });

  it('acepta una cuenta «Por registrar» (contraseña temporal)', () => {
    expect(() =>
      validarAsignacionContador(activa, { estado: 'POR_REGISTRAR', roles: [] }),
    ).not.toThrow();
  });

  it('rechaza personal inactivo', () => {
    expect(() =>
      validarAsignacionContador({ ...activa, estado: 'INACTIVO' }, cuenta),
    ).toThrow(/personal activo/);
  });

  it('exige una cuenta vinculada', () => {
    expect(() => validarAsignacionContador({ ...activa, usuarioId: null }, null)).toThrow(
      /cuenta de usuario vinculada/,
    );
  });

  it('rechaza cuentas desactivadas', () => {
    expect(() =>
      validarAsignacionContador(activa, { estado: 'DESACTIVADA', roles: [] }),
    ).toThrow(/desactivada/);
  });

  it('no asigna dos veces el rol', () => {
    expect(() =>
      validarAsignacionContador(activa, { estado: 'ACTIVA', roles: ['CONTADOR'] }),
    ).toThrow(/ya tiene el rol/);
  });
});

describe('validarRetiroContador', () => {
  it('solo retira el rol a quien lo tiene', () => {
    expect(() => validarRetiroContador(activa, cuenta)).toThrow(/no tiene el rol/);
    expect(() =>
      validarRetiroContador(activa, { estado: 'ACTIVA', roles: ['CONTADOR'] }),
    ).not.toThrow();
  });
});

describe('permisos sembrados para el rol Contador (schema.sql)', () => {
  const esquema = readFileSync(join(process.cwd(), 'db', 'schema.sql'), 'utf8');
  const bloque = /p\.codigo IN\s*\(([^)]*)\)\s*WHERE r\.codigo = 'CONTADOR'/.exec(esquema);
  const permisos = (bloque?.[1] ?? '').match(/'[A-Z0-9_]+'/g)?.map((p) => p.slice(1, -1)) ?? [];

  it('consulta y exporta reportes y registra pagos (cambio #5)', () => {
    expect(permisos).toEqual(
      expect.arrayContaining(['M6_REPORTE_FINANCIERO', 'M5_PAGO_REGISTRAR', 'M5_CARTERA_CONSULTAR']),
    );
  });

  it('no anula pagos ni gestiona inventario, ventas, préstamos ni personal', () => {
    for (const prohibido of [
      'M5_PAGO_ANULAR',
      'M5_PLAN_GESTIONAR',
      'M6_INVENTARIO_GESTIONAR',
      'M6_PERSONAL_GESTIONAR',
    ]) {
      expect(permisos).not.toContain(prohibido);
    }
  });
});
