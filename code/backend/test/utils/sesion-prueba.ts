import { BaseDatosService } from './../../src/common/database/base-datos.service.js';
import { COOKIE_SESION, crearTokenSesion } from './../../src/common/auth/token-sesion.js';

/**
 * Abre una sesión real (HU-M1-02) para un usuario de prueba y devuelve la
 * cabecera Cookie con la que las pruebas e2e se autentican, igual que el
 * navegador tras iniciar sesión.
 */
export async function abrirSesionDePrueba(baseDatos: BaseDatosService, usuarioId: number): Promise<string> {
  const { token, hash } = crearTokenSesion();
  await baseDatos.consultar(
    `INSERT INTO sesion (usuario_id, refresh_token_hash, expira_en)
     VALUES ($1, $2, now() + interval '1 hour')`,
    [usuarioId, hash],
  );
  return `${COOKIE_SESION}=${token}`;
}
