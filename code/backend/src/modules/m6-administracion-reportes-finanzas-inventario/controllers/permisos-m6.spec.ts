import 'reflect-metadata';
import { PERMISOS_KEY } from '../../../common/auth/decoradores.js';
import { PermisoM6 } from '../enums/permiso-m6.enum.js';
import { PersonalController } from './personal.controller.js';
import { PrestamosController } from './prestamos.controller.js';
import { ProveedoresController } from './proveedores.controller.js';
import { ReportesController } from './reportes.controller.js';
import { UniformesController } from './uniformes.controller.js';
import { VentasController } from './ventas.controller.js';

// HU-6.3: los permisos se validan en el servidor en cada petición. Cada ruta del
// M6 debe declarar su permiso (en el método o en la clase); así el Contador,
// que no tiene permisos de inventario ni de personal, recibe 403.
const CONTROLADORES = [
  { controlador: UniformesController, permiso: PermisoM6.INVENTARIO_GESTIONAR },
  { controlador: ProveedoresController, permiso: PermisoM6.INVENTARIO_GESTIONAR },
  { controlador: PrestamosController, permiso: PermisoM6.INVENTARIO_GESTIONAR },
  { controlador: VentasController, permiso: PermisoM6.INVENTARIO_GESTIONAR },
  { controlador: PersonalController, permiso: PermisoM6.PERSONAL_GESTIONAR },
  // HU-6.4: el Contador sí tiene este permiso; consulta reportes pero no modifica nada.
  { controlador: ReportesController, permiso: PermisoM6.REPORTE_FINANCIERO },
];

describe('control de acceso de las rutas del M6', () => {
  it.each(CONTROLADORES)('$controlador.name exige $permiso en todas sus rutas', ({ controlador, permiso }) => {
    const prototipo = controlador.prototype as unknown as Record<string, unknown>;
    const metodos = Object.getOwnPropertyNames(prototipo).filter(
      (nombre) => nombre !== 'constructor' && typeof prototipo[nombre] === 'function',
    );
    expect(metodos.length).toBeGreaterThan(0);
    const deClase = Reflect.getMetadata(PERMISOS_KEY, controlador) as string[] | undefined;
    for (const metodo of metodos) {
      const deMetodo = Reflect.getMetadata(PERMISOS_KEY, prototipo[metodo] as object) as
        | string[]
        | undefined;
      expect({ metodo, permisos: deMetodo ?? deClase }).toEqual({ metodo, permisos: [permiso] });
    }
  });
});
