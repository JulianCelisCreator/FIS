import { hashContrasena, verificarContrasena } from './contrasena.js';

describe('hashContrasena / verificarContrasena', () => {
  it('no guarda la contraseña en claro y la verifica', async () => {
    const hash = await hashContrasena('Patines2026');
    expect(hash).not.toContain('Patines2026');
    expect(hash.startsWith('scrypt$')).toBe(true);
    await expect(verificarContrasena('Patines2026', hash)).resolves.toBe(true);
  });

  it('rechaza una contraseña distinta', async () => {
    const hash = await hashContrasena('Patines2026');
    await expect(verificarContrasena('patines2026', hash)).resolves.toBe(false);
  });

  it('usa una sal distinta en cada hash', async () => {
    const [a, b] = await Promise.all([hashContrasena('igual'), hashContrasena('igual')]);
    expect(a).not.toBe(b);
  });

  it('nunca coincide con un hash de formato desconocido', async () => {
    await expect(verificarContrasena('x', 'texto-plano')).resolves.toBe(false);
    await expect(verificarContrasena('x', 'bcrypt$1$1$1$a$b')).resolves.toBe(false);
    await expect(verificarContrasena('x', 'scrypt$0$8$1$YQ==$Yg==')).resolves.toBe(false);
  });
});
