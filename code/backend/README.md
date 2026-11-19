# Backend

API de la plataforma de gestión de la escuela de patinaje, desarrollada con NestJS y TypeScript. Su arquitectura objetivo es **modular por dominio**: cada módulo agrupa las capacidades y reglas de negocio que le corresponden y expone únicamente lo que otros módulos necesitan.

> **Estado actual:** está implementada una parte de M5 (asignación y cambio de plan, generación de mensualidades y registro de pagos; ver [su README](src/modules/m5-planes-tarifas-pagos/README.md)) y la infraestructura transversal que usa: conexión a PostgreSQL, auditoría y la sesión de M1 (registro e inicio de sesión, ver `src/modules/m1-usuarios-acceso/`). Los demás módulos de esta guía son la estructura acordada para el desarrollo futuro.

## Puesta en marcha

Requisitos: Node.js 22.12 o superior y pnpm 10 o superior. Desde `code/backend`:

```bash
cp .env.example .env                                              # configuración local (git la ignora)
docker compose --env-file .env -f db/compose.yaml up -d --wait    # base de datos (ver db/README.md)
pnpm install
pnpm start:dev
```

La API carga `.env` al arrancar. Toma el puerto de `PORT` (3000 por defecto) y la base de `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`, que por defecto coinciden con el contenedor de `db/compose.yaml`. Si ya tienes un PostgreSQL local en el 5432, cambia `DB_PORT` (p. ej. a `5433`) en `.env`: el contenedor y la API usan el mismo valor. Otros comandos disponibles:

```bash
pnpm start       # Iniciar sin modo observación
pnpm build       # Compilar
pnpm start:prod  # Ejecutar la compilación
pnpm lint        # Analizar el código
pnpm test        # Pruebas unitarias
pnpm test:watch  # Pruebas en modo observación
pnpm test:cov    # Cobertura
pnpm test:e2e    # Pruebas de extremo a extremo
```

Ejecuta `pnpm build` antes de `pnpm start:prod`.

## Organización por módulos

La carpeta `src/modules/` contendrá un directorio por módulo funcional. Usa el mismo identificador y nombre en ambos frentes para facilitar la trazabilidad con los requisitos:

| Dominio | Carpeta |
| --- | --- |
| M1: Usuarios y Acceso | `m1-usuarios-acceso` |
| M2: Gestión deportiva de patinadores | `m2-gestion-deportiva` |
| M3: Grupos, horarios y programación | `m3-grupos-horarios` |
| M4: Competencias y Resultados | `m4-competencias-resultados` |
| M5: Planes, Tarifas y Pagos | `m5-planes-tarifas-pagos` |
| M6: Administración, Reportes, Finanzas e Inventario | `m6-administracion-reportes-finanzas-inventario` |

El identificador `m1` a `m6` identifica el dominio, no una historia de usuario ni un rol. Las capacidades relacionadas se organizan dentro de ese dominio; no se crea un módulo de primer nivel por cada pantalla o HU. Consulta [el contexto del proyecto](../../docs/CONTEXT.md) y [los requisitos](../../docs/REQUIREMENTS.md) para delimitar responsabilidades y dependencias.

### Estructura objetivo

Ejemplo ilustrativo para M1; las carpetas se agregan cuando sean necesarias:

```text
src/
├── main.ts                          # Arranque de NestJS
├── app.module.ts                    # Composición de módulos de la aplicación
├── modules/
│   └── m1-usuarios-acceso/
│       ├── controllers/
│       │   └── usuarios.controller.ts
│       ├── dto/
│       │   ├── crear-usuario.dto.ts
│       │   └── actualizar-usuario.dto.ts
│       ├── entities/
│       │   └── usuario.entity.ts
│       ├── enums/
│       │   └── rol-usuario.enum.ts
│       ├── services/
│       │   ├── usuarios.service.ts
│       │   └── usuarios.service.spec.ts
│       ├── validators/
│       │   └── documento-unico.validator.ts
│       └── m1-usuarios-acceso.module.ts
└── common/                          # Solo elementos realmente transversales
test/
└── ...                              # Pruebas e2e
```

Los nombres del ejemplo ilustran la convención, no definen campos, endpoints, reglas ni funcionalidades ya disponibles. `common/` también es una ubicación propuesta: no debe convertirse en un depósito de código de un solo dominio.

### Responsabilidades

| Elemento | Responsabilidad |
| --- | --- |
| `controllers/` | Recibir solicitudes HTTP, declarar rutas, delegar en servicios y devolver respuestas. No concentrar reglas de negocio ni acceso a datos. |
| `dto/` | Definir los contratos de entrada y salida de los casos de uso. Separar, por ejemplo, creación, actualización y respuesta cuando sus datos difieran. Un DTO no sustituye la validación en ejecución. |
| `entities/` | Representar conceptos y datos del dominio. No exponer automáticamente una entidad persistida como respuesta pública ni asumir un ORM que aún no está configurado. |
| `enums/` | Definir conjuntos cerrados de valores propios del módulo, con nombres expresivos. Evitar duplicar catálogos compartidos entre dominios. |
| `services/` | Implementar casos de uso, orquestar reglas de negocio y colaborar con los componentes de acceso a datos o integraciones necesarios. No depender de detalles de presentación HTTP. |
| `validators/` | Reunir validaciones específicas y reutilizables del dominio. La validación de datos externos debe ejecutarse realmente en la frontera de entrada; definir un tipo o DTO por sí solo no valida una solicitud. |
| `<nombre-modulo>.module.ts` | Declarar el módulo NestJS con `@Module`: registrar controladores y proveedores, importar dependencias y exportar solo los proveedores que otros módulos deban utilizar. |

Si una capacidad necesita repositorios, políticas u otras carpetas, agrégalas dentro del módulo con una responsabilidad clara. No se requiere crear archivos vacíos para completar el árbol. Si se introduce una biblioteca de persistencia o validación, debe configurarse y documentarse al implementarla.

### Persistencia y validación

- **Base de datos:** PostgreSQL con el esquema de [`db/schema.sql`](db/schema.sql), sin ORM. `common/database/BaseDatosService` expone el pool (`consultor`) y `transaccion()`. Cada módulo escribe su SQL en `repositories/`, con parámetros (`$1`, `$2`…) y nunca concatenando datos del usuario. Las fechas `DATE` llegan como texto `AAAA-MM-DD`, y `BIGINT` y `NUMERIC` como `number`.
- **Validación:** `class-validator` en los DTO, con un `ValidationPipe` global (`src/configurar-aplicacion.ts`) que rechaza campos no declarados y devuelve un mensaje por campo.
- **Autenticación:** sesión con cookie `httpOnly` que crea M1 al ingresar (`POST /m1/acceso/ingreso`). En la base solo se guarda el hash del token. Los controladores usan `@UseGuards(AutenticacionGuard, PermisosGuard)`, `@RequierePermiso(...)` y `@UsuarioActual()`; el usuario llega con sus roles y los permisos de esos roles.
- **Auditoría:** `common/auditoria/AuditoriaRepository.registrar()` dentro de la misma transacción del cambio.
- **Tareas programadas:** `@nestjs/schedule`, con la zona horaria del club (`America/Bogota`).

### Flujo y dependencias

1. Una solicitud llega al controlador del dominio; se comprueba y transforma la entrada en la frontera correspondiente.
2. El controlador delega el caso de uso al servicio, que aplica las reglas y accede a los colaboradores necesarios.
3. El resultado se adapta al contrato de respuesta; los errores se comunican con una respuesta apropiada, sin ocultarlos.
4. `AppModule` importa cada módulo de dominio que deba formar parte de la aplicación.

Un módulo que necesita a otro importa su módulo NestJS y utiliza los proveedores que este exporta, en lugar de acceder directamente a sus detalles internos. Evita las dependencias circulares; cuando dos dominios se necesiten mutuamente, acuerda una interfaz o una reorganización de responsabilidades en vez de acoplar sus implementaciones. El código transversal solo se extrae a `common/` cuando realmente se comparte y no pertenece a un dominio específico.

## Nomenclatura

| Elemento | Convención | Ejemplo |
| --- | --- | --- |
| Carpetas de dominio | `m<numero>-<dominio>` en `kebab-case`, minúsculas y sin tildes | `m1-usuarios-acceso/` |
| Archivos TypeScript | `kebab-case` y sufijo según responsabilidad | `usuarios.controller.ts` |
| Módulo NestJS | Nombre de carpeta seguido de `.module.ts` | `m1-usuarios-acceso.module.ts` |
| Clases | `PascalCase` y sufijo descriptivo | `UsuariosController`, `UsuariosService`, `M1UsuariosAccesoModule` |
| DTO, entidad, enum y validador | Nombre de concepto o acción más su tipo | `CrearUsuarioDto`, `Usuario`, `RolUsuario`, `DocumentoUnicoValidator` |
| Variables, funciones y métodos | `camelCase`, descriptivo | `buscarUsuario`, `usuarioActivo` |
| Constantes | `UPPER_SNAKE_CASE` para valores constantes compartidos | `MAX_INTENTOS` |
| Pruebas unitarias | Archivo probado con `.spec.ts` | `usuarios.service.spec.ts` |
| Pruebas e2e | En `test/`, con `.e2e-spec.ts` | `usuarios.e2e-spec.ts` |

Usa nombres de dominio en español de forma consistente y conserva los términos técnicos de NestJS (`controller`, `service`, `module`, etc.). Los identificadores y nombres de archivo no llevan tildes ni `ñ`; los textos visibles y la documentación pueden emplearlas. En los imports relativos del backend conserva la extensión `.js`, como hace el código existente, por su configuración de módulos ES.

## Desarrollo y pruebas

Para una nueva funcionalidad: identifica el dominio y la HU, crea solo las piezas necesarias dentro de su módulo, registra controladores y proveedores en el archivo de módulo y conecta el módulo con `AppModule` cuando corresponda. Documenta el contrato HTTP y las decisiones relevantes junto con su implementación.

Prueba los servicios y validadores con casos exitosos y de error; verifica los controladores y contratos HTTP con pruebas e2e cuando corresponda. Antes de integrar cambios ejecuta `pnpm lint`, `pnpm build`, `pnpm test` y, si aplica, `pnpm test:e2e`. Consulta también la [guía del frontend](../frontend/README.md) y el [README general](../../README.MD).
