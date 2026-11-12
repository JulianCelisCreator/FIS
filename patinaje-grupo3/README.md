# Grupo 3 · Módulo 2 · Escuela de patinaje

Backend independiente en NestJS + TypeORM + PostgreSQL. Entrega inicial para compartir e integrar con el proyecto de los compañeros. No requiere instalar Nest CLI globalmente.

## Alcance

Se cubren los primeros tres renglones de la tabla enviada, equivalentes a cuatro historias del PDF:

| Tabla | Historia en el PDF | Implementación |
|---|---|---|
| HU-2.1 + HU-2.2 | HU-4.2-01 y HU-4.2-02 | Registrar y actualizar estudiante; consultar cambios en su perfil |
| HU-2.3 | HU-4.2-03 | Asociar estudiante y acudiente ya registrados; ver ambos perfiles juntos |
| HU-2.4 | HU-4.2-04 | Crear y actualizar niveles de patinaje |

Se agrega registro/listado mínimo de acudientes para probar la asociación sin depender de otro módulo. Los campos obligatorios y la relación de varios acudientes por estudiante son decisiones de esta implementación que deben confirmar con el equipo: el PDF no fija un esquema detallado.

## Ejecutar con Docker (opción principal)

1. Descomprimir el ZIP y abrir una terminal dentro de `patinaje-grupo3`.
2. Copiar `.env.example` como `.env` (`cp .env.example .env` en Linux/macOS; `Copy-Item .env.example .env` en PowerShell).
3. Editar `.env`: cambiar `ADMIN_API_KEY` por una clave larga aleatoria y `DB_PASSWORD` por una contraseña local.
4. Con Docker Desktop iniciado, ejecutar:

```sh
docker compose up --build -d
docker compose logs -f api
```

Aplicación React: http://localhost:3000. API: http://localhost:3000/api. PostgreSQL: localhost:5433. La API ejecuta la migración inicial al arrancar. `synchronize` está desactivado. Los datos quedan en un volumen. Detener sin borrar datos: `docker compose down`.

Interfaz React incluida: abrir http://localhost:3000 en el navegador. Ingresar la misma ADMIN_API_KEY configurada en .env. El botón «Ver demostración» permite explorar con datos ficticios sin guardar cambios al salir.

## Ejecutar API con Node y base en Docker

Node.js 22 o superior y npm. Preparar `.env` como arriba.

```sh
docker compose up -d db
npm ci
npm run build
cd frontend
npm ci
npm run build
cd ..
npm start
```

Para desarrollo: `npm run dev`. Para probar: `npm ci` y `npm test` (no requiere Docker).

## Probar manualmente

Abrir `pruebas.http` en VS Code con REST Client y sustituir la clave y los UUID donde se indica. También puede importar o copiar las peticiones a Postman. Orden sugerido: crear estudiante, consultar perfil, modificar dirección, crear acudiente, asociarlo, consultar perfil con acudiente, crear nivel y modificarlo.

Todas las rutas exigen `x-admin-key: <ADMIN_API_KEY>`. Es una credencial técnica temporal para una demostración aislada. No implementa sesiones de usuarios: para cumplir íntegramente la precondición de sesión de administrador del PDF, integrar el guard con la autenticación del proyecto general. No distribuir esta clave a estudiantes ni incluirla en código frontend.

## Contrato HTTP

| Método | Ruta bajo /api | Resultado |
|---|---|---|
| POST | /estudiantes | Crea estudiante (201) |
| GET | /estudiantes | Lista estudiantes con acudientes (200) |
| GET | /estudiantes/:id | Perfil y acudientes (200) |
| PATCH | /estudiantes/:id | Cambia solamente campos enviados (200) |
| POST | /acudientes | Registra acudiente de apoyo (201) |
| GET | /acudientes | Lista acudientes (200) |
| POST | /estudiantes/:id/acudientes | Body `{ "acudienteId": "uuid" }`; devuelve perfil asociado (201) |
| GET | /niveles | Lista por orden (200) |
| POST | /niveles | Crea nivel (201) |
| PATCH | /niveles/:id | Actualiza nivel (200) |

Errores: 400 datos inválidos/campos extra/UUID inválido; 401 credencial ausente o incorrecta; 404 perfil o nivel inexistente; 409 documento duplicado, asociación repetida o nombre/orden de nivel duplicados. Se rechaza fecha de nacimiento futura y campos obligatorios vacíos o nulos. No hay rutas de borrado.

## Integración para el compañero

- `src/deportivo.module.ts` agrupa el módulo. Puede importarse en el AppModule del proyecto general.
- Registrar las entidades de `src/entities.ts` y la migración en la conexión TypeORM del proyecto. Revisar nombres de tablas existentes antes de aplicarla.
- Reutilizar el módulo de acudientes del equipo si ya existe; adaptar la relación en lugar de duplicar sus perfiles.
- Reemplazar `AdminGuard` por la verificación de sesión/JWT y rol administrador del proyecto. La clave temporal NO equivale a una sesión personal.
- Ajustar prefijo y CORS al frontend concreto; no se habilita CORS abierto.
- Este alcance no asigna niveles a estudiantes ni calcula su nivel actual: esa consulta pertenece al siguiente renglón de la tabla.
- No se implementan categorías, evaluaciones ni historias posteriores.

## Verificación y límites

`npm test` compila TypeScript y realiza pruebas HTTP sobre Nest real y repositorios TypeORM con pg-mem. Se ejecuta la migración SQL inicial en ese motor en memoria; no se simula la lógica del servicio. Cubre registro, duplicados, actualización parcial, asociación, referencias inexistentes, niveles y control de acceso.

pg-mem no sustituye PostgreSQL real. En el entorno de elaboración no hay Docker ni servidor PostgreSQL: queda pendiente ejecutar `docker compose up --build` y repetir `pruebas.http` en el equipo receptor. Se incluye package-lock.json para una instalación reproducible.


## Interfaz React · Velora

Diseño adaptable a escritorio, tablet y móvil. Incluye acceso, resumen de registros, búsqueda, registro y edición de estudiantes, perfil lateral con acudientes, registro de acudientes, asociación entre perfiles y creación/edición de niveles.

- Modo conectado: ingresar la clave de administración; consume la API real bajo `/api`, en el mismo origen, sin exponer la clave en el código fuente. La clave permanece en memoria y se elimina al salir o recargar.
- Demostración: datos ficticios en memoria; permite ensayar formularios y cambios, que se pierden al salir o recargar. No toca PostgreSQL ni pretende representar datos reales.
- Se incluyen fuentes React en `frontend/src` y compilación en `frontend/dist`.
- Para trabajar solo en el diseño: `cd frontend`, `npm ci`, `npm run dev`. Abrir la dirección que muestra Vite y elegir «Ver demostración». Para usar datos reales, mantener la API en localhost:3000; Vite redirige `/api` al backend.
- Docker construye React automáticamente y Nest sirve la interfaz en la raíz. No hace falta un segundo servidor web.
- Las fuentes tipográficas se solicitan a Google Fonts; sin internet se usan las fuentes sans-serif del sistema.
- El nombre Velora es una identidad visual propuesta, editable por el equipo.

La clave temporal es adecuada para esta entrega aislada; el inicio de sesión individual y los roles siguen pendientes de integración con el equipo. Las pruebas del backend no sustituyen la validación final con Docker y PostgreSQL real.

## Vista inmediata sin instalación

Abrir `Velora_Demo.html` en un navegador y pulsar «Ver demostración». El archivo incluye React compilado y estilos. Esta copia autónoma sirve para explorar los flujos con datos ficticios; para datos reales usar la aplicación servida por Nest.
