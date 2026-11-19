import { hashTokenSesion } from '../../../common/auth/token-sesion.js';
import type { BaseDatosService, Consultor } from '../../../common/database/base-datos.service.js';
import type { SesionesRepository } from '../repositories/sesiones.repository.js';
import { CierreSesionService } from './cierre-sesion.service.js';

const consultor = {} as Consultor;
const baseDatos = { consultor } as unknown as BaseDatosService;

function crearServicio(habiaSesionAbierta: boolean) {
  const cerrar = vi.fn().mockResolvedValue(habiaSesionAbierta);
  const sesiones = { cerrar } as unknown as SesionesRepository;
  return { servicio: new CierreSesionService(baseDatos, sesiones), cerrar };
}

describe('CierreSesionService.cerrar (HU-M1-03)', () => {
  it('CA-01 y CA-03: invalida en la base la sesión del token, buscándola por su hash', async () => {
    const { servicio, cerrar } = crearServicio(true);

    await expect(servicio.cerrar('token-de-la-cookie')).resolves.toBe(true);
    expect(cerrar).toHaveBeenCalledWith(consultor, hashTokenSesion('token-de-la-cookie'));
  });

  it('es idempotente: una sesión ya cerrada o vencida no es un error', async () => {
    const { servicio } = crearServicio(false);
    await expect(servicio.cerrar('token-ya-cerrado')).resolves.toBe(false);
  });

  it('sin cookie no consulta la base', async () => {
    const { servicio, cerrar } = crearServicio(true);

    await expect(servicio.cerrar(null)).resolves.toBe(false);
    expect(cerrar).not.toHaveBeenCalled();
  });
});
