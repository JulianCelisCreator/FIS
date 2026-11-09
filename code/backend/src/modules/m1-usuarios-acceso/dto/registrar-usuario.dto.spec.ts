import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RegistrarUsuarioDto } from './registrar-usuario.dto.js';

const valido = {
  nombres: '  Sofía ',
  apellidos: 'Ramírez',
  correo: '  Sofia.Ramirez@Example.COM ',
  contrasena: 'Patines2026',
  rol: 'PATINADOR',
};

function validar(datos: Record<string, unknown>) {
  const dto = plainToInstance(RegistrarUsuarioDto, datos);
  const errores = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true, stopAtFirstError: true });
  return { dto, campos: errores.map((e) => e.property) };
}

describe('RegistrarUsuarioDto', () => {
  it('acepta un registro válido y normaliza nombres y correo', () => {
    const { dto, campos } = validar(valido);
    expect(campos).toEqual([]);
    expect(dto.nombres).toBe('Sofía');
    expect(dto.correo).toBe('sofia.ramirez@example.com');
  });

  it.each(['ADMINISTRADOR', 'CONTADOR', 'FISIOTERAPEUTA', 'otro'])('no permite autorregistrarse como %s', (rol) => {
    expect(validar({ ...valido, rol }).campos).toEqual(['rol']);
  });

  it.each(['PATINADOR', 'ACUDIENTE', 'PROFESOR', 'VISITANTE'])('permite autorregistrarse como %s', (rol) => {
    expect(validar({ ...valido, rol }).campos).toEqual([]);
  });

  it('exige correo válido, contraseña de 8+ con letra y número y nombres no vacíos', () => {
    expect(validar({ ...valido, correo: 'sofia@' }).campos).toEqual(['correo']);
    expect(validar({ ...valido, contrasena: 'abc12' }).campos).toEqual(['contrasena']);
    expect(validar({ ...valido, contrasena: 'solamenteletras' }).campos).toEqual(['contrasena']);
    expect(validar({ ...valido, nombres: '   ' }).campos).toEqual(['nombres']);
  });

  it('rechaza campos no declarados, como un rol de administrador colado', () => {
    expect(validar({ ...valido, estado: 'ACTIVA' }).campos).toEqual(['estado']);
  });
});
