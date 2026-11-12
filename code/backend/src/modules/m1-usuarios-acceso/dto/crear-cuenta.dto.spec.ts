import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CrearCuentaDto } from './crear-cuenta.dto.js';

const valido = {
  nombres: '  Laura ',
  apellidos: 'Cubillos',
  correo: '  Laura.Cubillos@Example.COM ',
  rol: 'PROFESOR',
};

function validar(datos: Record<string, unknown>) {
  const dto = plainToInstance(CrearCuentaDto, datos);
  const errores = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true, stopAtFirstError: true });
  return { dto, campos: errores.map((e) => e.property) };
}

describe('CrearCuentaDto (HU-M1-01)', () => {
  it('acepta una cuenta válida y normaliza nombres y correo', () => {
    const { dto, campos } = validar(valido);
    expect(campos).toEqual([]);
    expect(dto.nombres).toBe('Laura');
    expect(dto.correo).toBe('laura.cubillos@example.com');
  });

  it.each(['PROFESOR', 'PATINADOR', 'ACUDIENTE', 'CONTADOR', 'FISIOTERAPEUTA'])('permite el rol %s', (rol) => {
    expect(validar({ ...valido, rol }).campos).toEqual([]);
  });

  it.each(['ADMINISTRADOR', 'VISITANTE', 'JEFE'])('rechaza el rol %s', (rol) => {
    expect(validar({ ...valido, rol }).campos).toEqual(['rol']);
  });

  it('CA-03 y CA-04: señala cada campo faltante o inválido, incluido el rol', () => {
    const { campos } = validar({ nombres: '', apellidos: ' ', correo: 'laura@' });
    expect(campos.sort()).toEqual(['apellidos', 'correo', 'nombres', 'rol']);
  });

  it('rechaza campos no declarados, como una contraseña o un estado', () => {
    expect(validar({ ...valido, contrasena: 'x' }).campos).toEqual(['contrasena']);
    expect(validar({ ...valido, estado: 'ACTIVA' }).campos).toEqual(['estado']);
  });
});
