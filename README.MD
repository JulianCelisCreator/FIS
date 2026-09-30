# Repositorio FIS

Repositorio compartido de los grupos de la materia **FIS**. En esta primera etapa se suben los **wireframes**: cada **grupo** prototipa su propio diseño de las páginas del proyecto, para luego compararlos y elegir o combinar las mejores ideas.

---

## Estructura del repositorio

```text
repo_fis/
├── README.MD
├── wireframes/
│   ├── grupo-01/
│   │   ├── README.md          # descripción del diseño y decisiones tomadas
│   │   ├── inicio/
│   │   │   ├── inicio.html    # prototipo (si se hace en código)
│   │   │   └── inicio.png     # captura o exportación (Figma, Balsamiq, etc.)
│   │   ├── login/
│   │   └── assets/            # imágenes, íconos y estilos compartidos
│   ├── grupo-02/
│   └── ...
└── entregables/               # versión final elegida y documentos para el docente
```

- Cada grupo trabaja **solo dentro de su carpeta** `wireframes/grupo-XX/` (número con dos dígitos: `grupo-01`, `grupo-02`, …). Así ningún grupo pisa el trabajo de otro.
- Dentro de su carpeta, **una subcarpeta por página** (`inicio/`, `login/`, `perfil/`, …).
- Usar **los mismos nombres de página** que los demás grupos, para poder comparar los diseños página por página (ver la lista de páginas más abajo).
- Cada grupo incluye un `README.md` en su carpeta que explique su propuesta.

---

## Páginas a prototipar

Lista acordada entre los grupos. Todos usan estos nombres de carpeta:

| Página | Carpeta | Descripción |
| ------ | ------- | ----------- |
| Inicio | `inicio/` | _por definir_ |
| Inicio de sesión | `login/` | _por definir_ |
| _…_ | _…_ | _…_ |

> Si se necesita una página nueva, se agrega primero a esta tabla (con un PR) y luego cada grupo la prototipa.

---

## Cómo empezar

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd repo_fis

# 2. Traer siempre lo último antes de trabajar
git checkout main
git pull origin main

# 3. Crear una rama para tu trabajo
git checkout -b wireframe/grupo-XX-<pagina>
```

---

## Buenas prácticas

### 1. Ramas

- **No trabajar directamente sobre `main`.** `main` solo tiene contenido revisado.
- Una rama por tarea, con nombre descriptivo en minúsculas y con guiones:

| Tipo | Formato | Ejemplo |
| ---- | ------- | ------- |
| Wireframe nuevo o cambios | `wireframe/grupo-XX-<pagina>` | `wireframe/grupo-01-login` |
| Corrección | `fix/<descripcion>` | `fix/enlaces-rotos-inicio` |
| Documentación general | `docs/<descripcion>` | `docs/actualizar-readme` |

### 2. Commits

- Commits **pequeños y frecuentes**, cada uno con un cambio coherente.
- Mensaje en español, en imperativo y claro:

```text
Agregar wireframe de la página de inicio
Ajustar distribución del formulario de login
Exportar capturas de la página de perfil
```

- Evitar mensajes como `cambios`, `asdf`, `final`, `final2`.

### 3. Pull Requests

1. Sube tu rama: `git push origin wireframe/grupo-XX-<pagina>`.
2. Abre un **Pull Request** hacia `main`.
3. En la descripción indica qué páginas agregaste y **adjunta una captura** del diseño, para que se pueda revisar sin descargar nada.
4. Al menos **un integrante de otro grupo debe revisar y aprobar** antes de hacer el merge.
5. Solo modifica archivos de **la carpeta de tu grupo**. Si quieres sugerir un cambio en el diseño de otro grupo, déjalo como comentario en su PR.
6. Después del merge, borra la rama.

### 4. Nombres de archivos

- Minúsculas, sin tildes, sin `ñ` y sin espacios; usar guiones: `inicio.html`, `login-movil.png`.
- **No versionar con el nombre** (`inicio_final_v3_ahora_si.png`). Para eso está Git.

### 5. Sobre los wireframes

- **Primero la estructura, después la estética.** Un wireframe muestra la distribución, el contenido y la navegación; los colores y las tipografías finales vienen después.
- Incluir la versión de **escritorio y de móvil** cuando aplique (`inicio.png`, `inicio-movil.png`).
- Si se hace en **HTML/CSS**, el prototipo debe abrirse directamente en el navegador, sin instalar nada. Usar rutas relativas (`../assets/logo.png`), nunca rutas de tu computador (`C:\Users\...`).
- Si se hace en **Figma, Balsamiq, Excalidraw u otra herramienta**, subir la exportación en **PNG o PDF** y poner el enlace al archivo original en el `README.md` de la carpeta del grupo.
- Usar texto de relleno realista (nombres, precios, fechas de ejemplo) en lugar de "texto texto texto", para que se entienda el contenido.
- Indicar en el `README.md` de la carpeta del grupo:
  - Herramienta usada.
  - Enlace al archivo original (si aplica).
  - Decisiones de diseño importantes y por qué se tomaron.

### 6. Qué **no** subir

- Archivos temporales o del sistema (`.DS_Store`, `Thumbs.db`, `~$archivo`).
- Archivos muy pesados (videos, imágenes sin comprimir de varios MB); mejor comprimir o dejar el enlace.
- Carpetas de dependencias (`node_modules/`) si alguien usa algún framework.
- Información personal o credenciales.

---

## Flujo de trabajo resumido

```text
pull de main → crear rama → prototipar en la carpeta del grupo → commits → push → Pull Request con captura → revisión → merge → borrar rama
```

---

## Grupos

| Grupo    | Carpeta                | Integrantes |
| -------- | ---------------------- | ----------- |
| Grupo 01 | `wireframes/grupo-01/` |             |
| Grupo 02 | `wireframes/grupo-02/` |             |
| Grupo 03 | `wireframes/grupo-03/` |             |
