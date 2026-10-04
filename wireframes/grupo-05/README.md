# Grupo 05

## Integrantes

- Erik Joan Fernandez Rios
- Andres Felipe Morales Zamora

## Herramienta usada

HTML con el **Design System del proyecto** (`design-system/ps.css` y `ps.js`), integrado con recursos compartidos en `assets/` (`assets/css/styles.css` y `assets/js/script.js`). Hay que servirlo por HTTP, porque los módulos ES no funcionan con `file://`:

python3 -m http.server 8000
http://localhost:8000/wireframes_m4/

## Enlace al archivo original

No aplica (el prototipo es el código de esta carpeta).

## Páginas

Módulo 4: **Competencias, Inscripciones y Resultados Deportivos** (sección 4.4 del documento de requerimientos, RF-M4-01 a RF-M4-19 e historias de usuario HU-M4-01 a HU-M4-05).

| Página | Carpeta | Requisitos | Estado |
| ------ | ------- | ---------- | ------ |
| Listado de competencias | `listado-competencias/` | RF-M4-01, RF-M4-04, RF-M4-12 | Borrador |
| Gestión de competencia | `gestion-competencia/` | RF-M4-01, RF-M4-02, RF-M4-03, RF-M4-04 | Borrador |
| Patinadores elegibles | `patinadores-elegibles/` | RF-M4-05 | Borrador |
| Gestión de inscripciones | `gestion-inscripciones/` | RF-M4-06, RF-M4-07, RF-M4-08, RF-M4-09, RF-M4-10, RF-M4-11 | Borrador |
| Registro de tiempos | `registro-tiempos/` | RF-M4-13 | Borrador |
| Tabla de resultados | `tabla-resultados/` | RF-M4-14 | Borrador |
| Perfil de rendimiento | `perfil-rendimiento/` | RF-M4-16, RF-M4-17 | Borrador |
| Ranking por categoría | `ranking-categoria/` | RF-M4-15 | Borrador |
| Administración y auditoría | `administracion-resultados/` | RF-M4-18, RF-M4-19 | Borrador |

En `assets/` hay dos archivos compartidos:

- `styles.css`: **solo disposición y estructura unificada** (rejillas, `gap`, alineación de componentes y tarjetas), con tokens de diseño del proyecto.
- `script.js`: conecta la interacción simulada (confirmaciones de cancelación, avisos de validación, filtros de visualización y acciones globales).

## Componentes del Design System usados

| Necesidad | Componente |
| --------- | ---------- |
| Marco y navegación por rol | `AppShell` (`ps-app-shell`), `Avatar`, `Badge` neutral para rol |
| Listados y tablas | `DataTable` con datos posicionales, `FilterBar` con chips, `Pagination` |
| Acciones por fila | `IconButton` + `Menu`, `Button` `sm` |
| Estados de evento e inscripción | `StatusBadge`: Programada, Publicada, Cancelada, Aprobada, Rechazada |
| Formularios y captura de marcas | `FormField` + `TextInput` (máscara `MM:SS.mmm`), `Select`, `DateInput`, `Checkbox` |
| Creación y configuración de pruebas | `Dialog/Form` para eventos, modalidades y distancias |
| Validaciones automáticas | Lista de requisitos dinámicos (`StatusBadge` ok/fail para póliza, cartera, sanciones) |
| Autorización digital de acudiente | `Checkbox` obligatorio con registro de acudiente responsable |
| Récords y clasificaciones | `KPICard` para marcas personales, `Table` posicional por tiempos |
| Historial y auditoría | `AuditEntry` para cambios de tiempos, `Timeline` para historial deportivo |
| Avisos y alertas | `Alert` (info, warning, success, error) |
| Exportación de resultados | `ExportMenu` (PDF y CSV/Excel) |

## Decisiones de diseño

- **Creación y configuración integradas**: Se unificaron los formularios de evento, la asociación de pruebas por distancia/modalidad y la ventana de inscripciones en `gestion-competencia/` para reducir clics innecesarios.
- **Validación automática de inscripción en tiempo real**: `gestion-inscripciones/` valida automáticamente póliza médica, cartera y sanciones. Si algún requisito falla, el sistema bloquea el botón de confirmación indicando la causal.
- **Autorización digital del acudiente**: Para menores de edad, el requisito legal se resuelve mediante una firma/checkbox obligatorio en la misma vista de inscripción.
- **Captura con formato estricto `MM:SS.mmm`**: El registro de tiempos restringe entradas no válidas y añade el control para marcar participantes como **Did Not Finish (DNF)** sin alterar la tabla ordenada.
- **Auditoría obligatoria en correcciones**: En `administracion-resultados/`, cualquier modificación realizada por el Administrador exige ingresar un *Motivo de corrección* para alimentar la tabla de trazabilidad `AuditEntry`.
- **Privacidad por rol**: El acudiente solo puede consultar los récords e historial de los patinadores asociados a su cuenta mediante el contexto de usuario.

## Brechas del Design System encontradas

| Brecha | Dónde | Solución temporal |
| ------ | ----- | ----------------- |
| No existe el tipo de entrada de tiempo en milisegundos (`MM:SS.mmm`) | Registro de tiempos | `TextInput` con placeholder y regla de validación mediante JavaScript |
| `StatusBadge` no contempla la etiqueta «Récord Personal» | Perfil de rendimiento | `StatusBadge` neutro con ícono de estrella y texto explicativo |
| `DateInput` no restringe la fecha de cierre previa al evento automáticamente | Gestión de competencia | La validación se apoya en texto de ayuda e instructivo de formulario |
