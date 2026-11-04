# Grupo 04 — Sistema de gestión de planes

Guía para descargar las herramientas, obtener el código, configurar el entorno y ejecutar el proyecto en Windows.

## 1. ¿Qué necesitas instalar?

Instala estas herramientas antes de abrir el proyecto:

| Herramienta | ¿Para qué sirve? | Descarga oficial |
|---|---|---|
| **Git** | Descargar el repositorio y compartir cambios con el grupo. | <https://git-scm.com/install/windows> |
| **Node.js LTS** | Ejecutar el frontend y el backend. npm se instala junto con Node.js. | <https://nodejs.org/es/download> |
| **Docker Desktop** | Ejecutar PostgreSQL sin instalarlo manualmente en Windows. | <https://docs.docker.com/desktop/setup/install/windows-install/> |
| **Visual Studio Code** | Abrir y editar el código. | <https://code.visualstudio.com/download> |

Después de instalar, cierra y vuelve a abrir PowerShell. Comprueba las instalaciones:

```powershell
git --version
node -v
npm -v
docker --version
docker compose version
```

Abre Docker Desktop y espera a que indique que Docker está iniciado. En Windows, Docker Desktop puede solicitar habilitar WSL 2 durante la instalación.

**No necesitas instalar PostgreSQL por separado:** el proyecto lo ejecuta mediante Docker Compose.

## 2. Descargar el proyecto

Un integrante del grupo debe subir el repositorio a GitHub (o al servidor Git que utilicen) y compartir la dirección con los demás. Reemplaza la dirección de ejemplo por la URL real del repositorio:

```powershell
cd $HOME\Documents
git clone <URL_DEL_REPOSITORIO>
cd grupo-04
```

Para abrir la carpeta completa en Visual Studio Code:

```powershell
code .
```

También puedes abrir VS Code, seleccionar **Archivo → Abrir carpeta** y elegir `grupo-04`.

> Si el repositorio es privado, cada integrante debe tener acceso autorizado en GitHub. No compartan la contraseña de una cuenta personal; cada integrante debe usar su propia cuenta.

## 3. Configurar las variables de entorno

El backend necesita un archivo local llamado `.env` dentro de la carpeta `backend`. Este archivo contiene la configuración de desarrollo y no debe subirse a Git.

Desde PowerShell:

```powershell
cd .\backend
```

Crea `backend\.env` con estas variables para el entorno local de desarrollo. Puedes generarlo directamente desde PowerShell con este comando:

```powershell
@"
POSTGRES_PASSWORD=grupo4
DEV_AUTH_BYPASS=true
"@ | Set-Content -Encoding ascii .env
```

El contenido del archivo será:

```env
POSTGRES_PASSWORD=grupo4
DEV_AUTH_BYPASS=true
```

- `POSTGRES_PASSWORD`: contraseña local que utiliza PostgreSQL. Debe coincidir con la configuración del contenedor y del backend. `grupo4` es el valor de desarrollo utilizado durante las pruebas de este proyecto; no debe utilizarse en producción.
- `DEV_AUTH_BYPASS`: habilita el acceso simulado del entorno local cuando el backend se ejecuta en modo desarrollo. No es autenticación real y no debe habilitarse en producción.

Si el grupo decide utilizar otra contraseña, todos deben configurar su propio `.env` con el mismo valor en `POSTGRES_PASSWORD` para su base local. No envíen archivos `.env` por el repositorio ni por chats públicos.

Para comprobar que el archivo existe:

```powershell
Get-Content .env
```

## 4. Iniciar la base de datos PostgreSQL

Asegúrate de estar dentro de `backend` y de que Docker Desktop esté iniciado. Ejecuta:

```powershell
docker compose up -d
```

Comprueba el contenedor:

```powershell
docker compose ps
```

En la configuración de desarrollo utilizada por el proyecto, PostgreSQL se publica en el puerto **5434** de tu computadora y escucha en el puerto **5432** dentro del contenedor.

Datos de conexión locales del proyecto:

| Parámetro | Valor |
|---|---|
| Motor | PostgreSQL |
| Host | `127.0.0.1` |
| Puerto desde Windows | `5434` |
| Base de datos | `grupo04_planes` |
| Usuario de aplicación | `grupo04_app` |
| Contraseña | La definida en `POSTGRES_PASSWORD` dentro de `backend\.env` |

El contenedor conserva la información en un volumen de Docker. **No ejecutes `docker compose down -v` ni comandos para borrar volúmenes**, porque podrías eliminar los datos de la base de datos.

> Nota para el primer arranque: el backend tiene la sincronización automática de TypeORM desactivada (`synchronize: false`). Si una base nueva muestra un error indicando que no existe una tabla o relación, el equipo debe ejecutar la migración o el SQL de inicialización oficial del proyecto. No habilites `synchronize` ni borres el volumen como solución improvisada.

## 5. Instalar e iniciar el backend

Abre una terminal nueva en VS Code o PowerShell. Desde la carpeta raíz del proyecto:

```powershell
cd .\backend
npm install
npm run start:dev
```

El backend de desarrollo escucha en:

- API: <http://127.0.0.1:3000>
- Consulta de planes: <http://127.0.0.1:3000/planes>

Deja esta terminal abierta mientras utilizas la aplicación. Para detener el backend, presiona `Ctrl + C` en esa terminal.

## 6. Instalar e iniciar el frontend

Abre **otra terminal**. Desde la carpeta raíz del proyecto ejecuta:

```powershell
cd .\frontend
npm install
npm run dev
```

Vite mostrará una dirección local, normalmente:

<http://localhost:5173>

Abre esa dirección en el navegador. El frontend utiliza el proxy `/api` de Vite para enviar las peticiones al backend local; por eso deben estar ejecutándose tanto el frontend como el backend.

Deja abierta esta terminal mientras trabajas. Para detener Vite, presiona `Ctrl + C`.

## 7. Orden para iniciar el proyecto cada día

Una vez instaladas las herramientas y configurado `backend\.env`, el orden habitual es:

1. Abrir Docker Desktop.
2. Abrir una terminal en `grupo-04\backend` y ejecutar `docker compose up -d`.
3. En esa carpeta, ejecutar `npm run start:dev`.
4. Abrir otra terminal en `grupo-04\frontend` y ejecutar `npm run dev`.
5. Abrir en el navegador la URL que indique Vite, normalmente `http://localhost:5173`.

No es necesario volver a ejecutar `npm install` cada día. Solo se necesita cuando cambien las dependencias o sea la primera instalación de ese integrante.

## 8. ¿Qué puede hacer el módulo de planes?

La interfaz actual permite trabajar con las operaciones conectadas a la API:

- Consultar los planes.
- Crear un plan.
- Editar el nombre y el día de pago, según las reglas del backend.
- Registrar una tarifa con su fecha de vigencia.
- Consultar el historial de tarifas.
- Consultar la auditoría del plan.
- Desactivar un plan sin eliminar físicamente sus registros históricos.

Las rutas principales de la API son:

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/planes` | Listar planes |
| `POST` | `/planes` | Crear un plan |
| `PATCH` | `/planes/:id` | Editar un plan |
| `PATCH` | `/planes/:id/desactivar` | Desactivar un plan |
| `POST` | `/planes/:id/tarifas` | Registrar una tarifa |
| `GET` | `/planes/:id/tarifas` | Consultar historial de tarifas |
| `GET` | `/planes/:id/auditoria` | Consultar auditoría |

## 9. Cómo compartir cambios con el grupo

Cada integrante debe trabajar en su propia copia del repositorio. Antes de subir cambios, revisa qué archivos modificaste:

```powershell
git status
```

Agrega únicamente los archivos que quieras compartir. Por ejemplo:

```powershell
git add README.md frontend\src\App.tsx
git commit -m "docs: agregar instrucciones de instalación y uso"
git push
```

Para descargar cambios que otros integrantes ya subieron:

```powershell
git pull
```

No agregues al repositorio:

- `backend\.env` ni otros archivos con contraseñas o claves.
- Carpetas `node_modules`.
- Archivos generados como `dist` y archivos temporales.
- Datos privados de la base de datos.

Antes de compartir el repositorio, confirma que los `.gitignore` de frontend y backend excluyan los archivos `.env` y las carpetas generadas.

## 10. Importante: código compartido y base de datos compartida no son lo mismo

Al clonar el repositorio y ejecutar Docker, cada integrante tendrá **su propia base de datos local** en su computadora. Los cambios de código se pueden compartir mediante Git, pero los datos guardados en el PostgreSQL local de una persona no aparecen automáticamente en el PostgreSQL de los demás.

Para que todo el grupo utilice una única base de datos y vea los mismos registros, el equipo tendría que desplegar el backend y PostgreSQL en un servidor compartido o en un servicio administrado, configurar credenciales seguras y cambiar la configuración de conexión. La configuración descrita en esta guía es para desarrollo local; no expongas PostgreSQL a Internet ni uses el bypass de autenticación en un despliegue público.

## 11. Problemas frecuentes

### `node` o `npm` no se reconoce

Cierra y vuelve a abrir PowerShell después de instalar Node.js. Comprueba `node -v` y `npm -v`. En algunos equipos PowerShell permite ejecutar `npm.cmd` aunque la política de ejecución impida `npm`.

### Docker no responde

Abre Docker Desktop y espera a que termine de iniciar. Luego ejecuta `docker compose ps` dentro de `backend`.

### El puerto 5434 está ocupado

Otro servicio puede estar usando el puerto. Comprueba qué proceso lo utiliza antes de cambiar la configuración. No detengas ni elimines contenedores de otros proyectos.

### El frontend muestra un error al consultar `/api/planes`

Comprueba que PostgreSQL esté iniciado y que el backend siga ejecutándose en el puerto `3000`. Revisa los mensajes de error en ambas terminales.

### Aparece un error de contraseña de PostgreSQL

Verifica que `POSTGRES_PASSWORD` en `backend\.env` coincida con la contraseña con la que se inicializó el volumen de PostgreSQL. Cambiar la variable después de crear el volumen no siempre cambia la contraseña almacenada dentro de la base de datos.

### Aparece un error de tabla o relación inexistente

La base local necesita que se aplique el esquema inicial mediante las migraciones o el SQL del proyecto. Consulta al responsable del backend cuál es el procedimiento versionado para inicializar una base vacía. No borres volúmenes ni cambies `synchronize` sin coordinarlo con el equipo.

---

**Tecnologías:** React, Vite, TypeScript, NestJS, TypeORM, PostgreSQL y Docker Compose.

**Uso previsto de esta guía:** entorno local de desarrollo en Windows para los integrantes del Grupo 04.
