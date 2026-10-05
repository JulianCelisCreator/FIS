# Grupo 03

## Integrantes

- Laura Valentina Cubillos Acero
- Kenneth Mark Garzon Olarte
- Juan Pablo Gonzalez Castillo

## Herramienta usada

HTML con el **Design System del proyecto** (`design-system/ps.css` y `ps.js`). Debe servirse por HTTP porque el Design System utiliza módulos ES:

```bash
# desde la raíz del repositorio
python3 -m http.server 8000
# http://localhost:8000/wireframes/grupo-03/
```

## Alcance

Sección 4.2: **Módulo de gestión deportiva de patinadores** (`RF-M2-01` a `RF-M2-23`).

| Página | Carpeta | Rol | Requisitos |
| --- | --- | --- | --- |
| Patinadores | `patinadores/` | Administrador | RF-M2-01 a 04, 06 |
| Niveles y categorías | `niveles-categorias/` | Administrador | RF-M2-05, 07 a 10 |
| Seguimiento de entrenamiento | `entrenamiento/` | Profesor | RF-M2-11 a 17 |
| Perfil del patinador a cargo | `perfil-acudiente/` | Acudiente | RF-M2-18, 19 |
| Mi progreso | `mi-progreso/` | Patinador | RF-M2-20 a 23 |

## Componentes del Design System

| Necesidad | Componentes |
| --- | --- |
| Marco y navegación por rol | `AppShell`, `Avatar`, `Breadcrumb` |
| Listados y búsqueda | `DataTable`, `FilterBar`, `Pagination`, `EmptyState` |
| Ficha deportiva | `PlayerProfileCard`, `DescriptionList`, `Tabs` |
| Registro y actualización | `FormField`, entradas y `Dialog/Form` |
| Asignaciones y cambios | `Select`, `Dialog/Confirm`, `Alert` |
| Historial | `Timeline` |
| Estados de habilitación | `StatusBadge` de patinador |

## Decisiones de diseño

- Las pantallas se agrupan por tarea y rol, no una por requisito.
- La ficha del patinador es el punto común para datos personales, nivel, categoría, acudiente e historial.
- Niveles y categorías se administran en una sola pantalla porque la asignación y promoción dependen de ambos catálogos.
- El profesor trabaja sobre sus patinadores asignados y registra evaluación, habilidades y observaciones en una sola vista.
- Acudiente y patinador tienen vistas separadas y de solo lectura. El acudiente solo ve patinadores asociados.
- No se inventa una interfaz para habilitar observaciones: el requisito no define quién la configura. La vista solo respeta el estado habilitado.
- Los datos son realistas, las fechas usan `DD/MM/AAAA` y el diseño se adapta a 375, 768 y 1280 px.

## Trazabilidad completa

| RF | Representación en el wireframe |
| --- | --- |
| RF-M2-01 | Diálogo «Registrar patinador». |
| RF-M2-02 | Listado con búsqueda y diálogo de ficha. |
| RF-M2-03 | Campos editables dentro de la ficha. |
| RF-M2-04 | Selector de acudiente durante el registro y en la ficha. |
| RF-M2-05 | Catálogo y diálogo de creación de niveles. |
| RF-M2-06 | Nivel vigente dentro de la ficha administrativa. |
| RF-M2-07 | Catálogo y diálogo de creación de categorías. |
| RF-M2-08 | Pestaña de asignaciones de nivel y categoría. |
| RF-M2-09 | Diálogo de cambio de categoría con validación del nivel. |
| RF-M2-10 | Línea de tiempo que conserva los cambios previos. |
| RF-M2-11 | Resumen técnico del patinador para el profesor. |
| RF-M2-12 | Diálogo de evaluación de nivel. |
| RF-M2-13 | Lista de habilidades adquiridas y pendientes. |
| RF-M2-14 | Campo de observación de desempeño. |
| RF-M2-15 | Pestaña de historial de evaluaciones. |
| RF-M2-16 | Acción «Proponer promoción» sujeta a permisos. |
| RF-M2-17 | Enlace de consulta a niveles y categorías. |
| RF-M2-18 | Categoría actual en la vista del acudiente. |
| RF-M2-19 | Tarjetas de categorías disponibles. |
| RF-M2-20 | Nivel vigente en «Mi progreso». |
| RF-M2-21 | Categoría vigente en «Mi progreso». |
| RF-M2-22 | Línea de tiempo de trayectoria del patinador. |
| RF-M2-23 | Observaciones habilitadas en modo de solo lectura. |

## Brechas detectadas

| Brecha | Tratamiento |
| --- | --- |
| Los requisitos no definen los campos obligatorios de la ficha | Se proponen campos mínimos y se marca la decisión en el wireframe. |
| No existe RF para gestionar la habilitación de observaciones | Solo se representa el resultado de la habilitación, sin pantalla administrativa. |
| Categorías y niveles no tienen estados oficiales en el catálogo | Se muestran como texto; no se inventan `StatusBadge`. |
