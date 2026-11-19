import { IsEnum } from 'class-validator';
import { Rol } from '../../../common/auth/usuario-autenticado.js';

/**
 * Entrada de HU-M1-06: el nuevo rol de la cuenta. Se valida contra la lista
 * cerrada de roles del sistema (CA-04): uno inventado o manipulado se rechaza.
 * El Administrador puede asignar cualquiera, también Administrador (decisión
 * del equipo).
 */
export class CambiarRolDto {
  @IsEnum(Rol, { message: 'Elige uno de los roles del sistema' })
  rol: Rol;
}
