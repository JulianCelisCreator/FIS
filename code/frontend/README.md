# Frontend

Aplicación de la plataforma de gestión de la escuela de patinaje. El cliente actual usa React, TypeScript y Vite. El desarrollo se organizará **por módulos de dominio** y seguirá una arquitectura objetivo **BFF (Backend for Frontend)**.

> **Estado actual:** hay dos páginas. La landing pública (`/`) y la aplicación interna por roles (`/app/`), que por ahora tiene las pantallas de M5 «Asignar o cambiar plan» y «Registrar pago» y llama directo a la API NestJS (sin BFF todavía). Ver [Aplicación interna](#aplicación-interna-app).

## Puesta en marcha

Requisitos: Node.js 22.12 o superior y pnpm 10 o superior. Desde `code/frontend`:

```bash
pnpm install
pnpm dev
```

Otros comandos disponibles:

```bash
pnpm lint     # Analizar el código
pnpm build    # Comprobar TypeScript y generar la compilación de producción
pnpm preview  # Previsualizar una compilación existente
```

Ejecuta `pnpm build` antes de `pnpm preview`. Actualmente no hay un comando de pruebas configurado en este proyecto.

## Aplicación interna (`/app/`)

Para usarla hace falta la API y su base de datos (ver [la guía del backend](../backend/README.md)). Desde `code/backend`:

```bash
cp .env.example .env
docker compose --env-file .env -f db/compose.yaml up -d --wait
docker exec -i patinaje-db psql -U patinaje -d patinaje < db/datos-demo.sql   # datos de prueba, opcional
pnpm start:dev
```

Después, `pnpm dev` en `code/frontend` y abre `http://localhost:5173/app/`. Vite redirige `/api/*` a `http://localhost:3000` (cámbialo con la variable `API_URL`). Mientras M1 implementa el inicio de sesión, en la barra superior se elige un **usuario de prueba**: el menú y las pantallas cambian según sus permisos.

Decisiones:

- **Dos entradas de Vite.** La landing (`index.html`) y la aplicación (`app/index.html`) se compilan por separado (`vite.config.ts`), así sus estilos no se mezclan.
- **Design system del repositorio.** La aplicación importa `design-system/ps.css` con el alias `@ds`. De los web components carga solo los «hoja» (`ps-status-badge`, `ps-avatar`, `ps-icon`). Los contenedores (shell, campos, pestañas, diálogos) se generan como componentes React en `src/shared/design-system/componentes.tsx`, con el mismo marcado y las mismas clases, porque sus scripts originales mueven los nodos que maneja React.
- **Navegación por hash** (`#/registrar-pago?pestana=matricula`): funciona en desarrollo y en cualquier hosting estático sin configurar redirecciones.
- **Cliente HTTP único** en `src/shared/services/cliente-api.ts`: cuando exista el BFF, solo cambia ahí.

## Arquitectura objetivo: cliente + BFF

Un BFF es una **capa de servidor específica para las necesidades del frontend**. No es simplemente un servicio React, un `fetch` desde el navegador ni el servidor de desarrollo de Vite. La organización por módulos aplica tanto al cliente como a esa futura capa de servidor:

```text
Navegador / React
    → servicio del módulo en el cliente
    → endpoint del BFF
    → servicio o adaptador del BFF
    → API modular de NestJS
```

El navegador gestiona la interacción y el estado de interfaz. El BFF recibe solicitudes del cliente y puede adaptar contratos, agregar información de varias llamadas o gestionar datos de sesión que deban permanecer en el servidor. La API NestJS sigue siendo responsable de las reglas de negocio, la autorización y la integridad de los datos; el BFF no reemplaza esas verificaciones.

La implementación del BFF, su tecnología, despliegue, configuración de rutas y estrategia de sesión aún deben definirse e incorporarse al proyecto. Hasta entonces, `pnpm dev` solo inicia Vite y **no** inicia un BFF. Los secretos y credenciales de servidor nunca deben incluirse en código entregado al navegador ni en variables `VITE_`, que son accesibles desde el cliente. No se debe confiar en las validaciones de la interfaz para proteger la API.

## Organización por módulos

Cliente y BFF usarán el mismo identificador y nombre de dominio que el backend:

| Dominio | Carpeta |
| --- | --- |
| M1: Usuarios y Acceso | `m1-usuarios-acceso` |
| M2: Gestión deportiva de patinadores | `m2-gestion-deportiva` |
| M3: Grupos, horarios y programación | `m3-grupos-horarios` |
| M4: Competencias y Resultados | `m4-competencias-resultados` |
| M5: Planes, Tarifas y Pagos | `m5-planes-tarifas-pagos` |
| M6: Administración, Reportes, Finanzas e Inventario | `m6-administracion-reportes-finanzas-inventario` |

Cada carpeta agrupa capacidades de un dominio, no una sola pantalla o HU. Consulta [el contexto](../../docs/CONTEXT.md) y [los requisitos](../../docs/REQUIREMENTS.md) para decidir a qué módulo pertenece cada funcionalidad.

### Estructura objetivo

La siguiente estructura separa físicamente el código del navegador y el futuro código de servidor. Es ilustrativa: las carpetas, herramientas y archivos del BFF deberán crearse y configurarse al implementarlo.

```text
code/frontend/
├── src/                                # Cliente React existente
│   ├── main.tsx                        # Punto de entrada
│   ├── App.tsx                         # Composición principal
│   ├── modules/
│   │   └── m1-usuarios-acceso/
│   │       ├── components/
│   │       │   ├── formulario-ingreso.tsx
│   │       │   └── formulario-ingreso.css
│   │       ├── services/
│   │       │   └── acceso.service.ts
│   │       ├── utils/
│   │       │   └── formato-usuario.ts
│   │       └── types/
│   │           └── usuario.types.ts
│   └── shared/                         # Elementos de cliente realmente compartidos
└── bff/                                # Servidor BFF propuesto, aún inexistente
    └── src/
        ├── modules/
        │   └── m1-usuarios-acceso/
        │       ├── controllers/        # Endpoints para el cliente
        │       ├── services/           # Orquestación y llamadas a la API
        │       └── utils/              # Adaptaciones propias del módulo
        └── shared/                     # Infraestructura de servidor compartida
```

El árbol no exige archivos vacíos y no prescribe un framework para el BFF. `types/`, `shared/` y cualquier carpeta adicional se crean solo cuando sean útiles. El código del servidor no debe importarse desde `src/` ni empaquetarse en el navegador; al implementarlo se necesitarán sus propios puntos de entrada, configuración, comandos y despliegue.

### Responsabilidades en el cliente

| Carpeta | Responsabilidad |
| --- | --- |
| `components/` | Componentes React y estilos propios del dominio: presentación, interacción y accesibilidad. Pueden componerse para formar pantallas. |
| `services/` | Comunicación del cliente con los endpoints del BFF y adaptación de sus respuestas a las necesidades de la interfaz. Los componentes consumen estos servicios en vez de repetir llamadas HTTP. |
| `utils/` | Funciones auxiliares del dominio, preferiblemente puras, como formateo o transformación de datos para mostrar. No contienen secretos ni sustituyen reglas de negocio del backend. |
| `types/` | Tipos e interfaces usados por el módulo para describir datos del cliente y contratos con el BFF. Los tipos de TypeScript no validan por sí solos datos recibidos en ejecución. |
| `shared/` | Componentes, utilidades y servicios transversales de cliente que se usen realmente en varios dominios; no mover allí código solo para evitar decidir su propietario. |

Si son necesarios, se pueden agregar `hooks/`, `pages/` u otras carpetas dentro del dominio, con responsabilidades claras. Reutiliza el [design system del proyecto](../../docs/EXPLANATION.md) y sus pautas de accesibilidad en vez de duplicar componentes y estilos.

### Responsabilidades en el BFF

Los controladores o manejadores reciben solicitudes específicas de la interfaz; los servicios llaman a la API NestJS y adaptan o agregan los resultados necesarios; las utilidades realizan transformaciones propias del BFF. El acceso a credenciales, la configuración privada y la gestión de sesión pertenecen exclusivamente al entorno servidor. Los contratos, manejo de errores, autenticación, protección de sesión y validación de entrada se deberán definir y probar cuando se implemente esta capa.

No dupliques reglas de negocio del backend en el BFF. Mantén explícitas las dependencias entre dominios y extrae a `shared/` únicamente infraestructura compartida. Los datos no deben cruzar del servidor al navegador si no forman parte del contrato que necesita la interfaz.

### Flujo de una funcionalidad

1. Un componente recoge la interacción y aplica validaciones de presentación cuando corresponda.
2. El componente utiliza un servicio de su módulo, que llama al endpoint correspondiente del BFF.
3. El BFF valida la solicitud, invoca la API NestJS y adapta la respuesta al contrato de la interfaz.
4. El servicio entrega el resultado o un error identificable; el componente muestra el estado de carga, éxito o error según corresponda.

Este flujo es objetivo: los endpoints, la configuración de red y la gestión de errores aún no existen en la plantilla actual.

## Nomenclatura

| Elemento | Convención | Ejemplo |
| --- | --- | --- |
| Carpetas de dominio | `m<numero>-<dominio>` en `kebab-case`, minúsculas y sin tildes | `m1-usuarios-acceso/` |
| Archivos nuevos de componentes | `kebab-case.tsx` | `formulario-ingreso.tsx` |
| Componentes y tipos React | `PascalCase` | `FormularioIngreso`, `Usuario` |
| Estilos del componente | Mismo nombre base que el componente | `formulario-ingreso.css` |
| Servicios de dominio | `kebab-case.service.ts` | `acceso.service.ts` |
| Utilidades y tipos | `kebab-case.ts` y `kebab-case.types.ts` | `formato-usuario.ts`, `usuario.types.ts` |
| Hooks | Archivo `use-<nombre>.ts`; función `use` + `PascalCase` | `use-usuario.ts`, `useUsuario` |
| Variables y funciones | `camelCase`, descriptivo | `usuarioActivo`, `obtenerUsuario` |
| Constantes | `UPPER_SNAKE_CASE` para valores constantes compartidos | `MAX_INTENTOS` |
| Pruebas futuras | Mismo nombre base y sufijo `.test.ts` o `.test.tsx` | `acceso.service.test.ts`, `formulario-ingreso.test.tsx` |

Usa nombres de dominio en español de forma consistente; conserva términos técnicos como `components`, `services` y `utils`. Los identificadores y archivos no llevan tildes ni `ñ`; los textos visibles y la documentación pueden emplearlas. `App.tsx` y los demás archivos existentes de la plantilla se conservan con sus nombres actuales.

## Desarrollo y pruebas

Para una funcionalidad nueva, identifica el dominio y la HU; crea sus componentes, servicios y utilidades solo cuando hagan falta; define el contrato con el BFF antes de conectarlo y evita que los componentes dependan de detalles de la API NestJS. Mantén los estados de carga y error visibles y reutiliza los componentes del sistema de diseño.

Al incorporar pruebas, cubre interacciones y estados de los componentes, transformaciones de utilidades y contratos y errores en las llamadas. El BFF deberá contar además con pruebas de sus endpoints y adaptadores. La herramienta de pruebas y sus comandos aún no están configurados; documenta e incorpora ambos al introducirlos. Antes de integrar cambios ejecuta al menos `pnpm lint` y `pnpm build`. Consulta también la [guía del backend](../backend/README.md) y el [README general](../../README.MD).
