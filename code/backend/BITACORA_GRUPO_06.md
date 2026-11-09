# Bitácora Técnica y Control de Cambios — Módulo 6

Este documento registra el progreso del **Grupo 6** y deja una descripción
clara de las tareas realizadas, las decisiones tomadas, los resultados revisados
y las actividades que todavía pertenecen a futuras entregas.

---

## 🏃 Sprint 1 (Semana 1) — Inventario y Administración del Módulo 6

- **Período:** 29 de octubre de 2026 – 05 de noviembre de 2026
- **Objetivo del Sprint:** Dejar funcional el control de uniformes del módulo 6,
  manteniendo separados los archivos y responsabilidades de los demás grupos.
- **Historia principal:** HU-M6-06 — Registro y control de uniformes.
- **Estado de la historia:** Completada funcionalmente.
- **Usuario temporal de prueba:** Andrea López, Administradora, identificada con el
  usuario de ID `1`.
- **Aplicación frontend:** `http://localhost:5173`
- **Inventario:** `http://localhost:5173/app/#/inventario`
- **Servidor backend:** `http://localhost:3000`
- **Interfaz usada durante el desarrollo:** Velora.

### 1. Sincronización y organización de la rama

**Qué se hizo**

- Se inició el trabajo sobre una rama de desarrollo propia para el Grupo 6.
- Se conservó el contenido principal del proyecto original y se evitaron cambios
  sobre las carpetas, pantallas y recursos asignados a otros módulos.
- Se mantuvo intacto el directorio de wireframes.
- El desarrollo de código se realizó dentro de las carpetas exclusivas del módulo
  6 y de los archivos generales necesarios para cargar la aplicación.
- Se creó una separación entre el frontend M6, el backend M6 y el módulo
  compartido que conecta la aplicación completa.

### 2. Integración de la aplicación interna Velora

**Qué se hizo**

- Se integró el frontend compartido a la estructura React existente.
- Se añadió navegación interna con rutas hash, sin afectar las rutas públicas
  principales.
- Se dejó disponible la página de inventario en
  `/app/#/inventario`.
- También se conservaron las rutas ya existentes, entre ellas
  `/app/#/registrar-pago`, `/app/#/planes` y `/app/#/asignar-plan`.
- La pantalla se integró a la navegación por roles y utiliza el formato visual
  y los componentes preparados para Velora.

### 3. Definición y aislamiento del módulo 6

**Qué se hizo**

- El backend quedó organizado en el módulo
  `m6-administracion-reportes-finanzas-inventario`.
- El frontend quedó organizado en una carpeta específica para inventario
  (`m6-inventario-uniformes`).
- Se preservaron los nombres M6 y las rutas `/m6/...` para identificar sin
  ambigüedad las capacidades asignadas al Grupo 6.
- No se modificaron wireframes ni archivos funcionales de otros grupos.
- Las decisiones de integración de ventas, pagos y personas se dejaron separadas
  del inventario para evitar interferencias con M1 y M5.

### 4. Diseño visual de la pantalla de inventario

**Qué se hizo**

- Se creó una pantalla principal con tabla de uniformes, filtros y tarjetas de
  resumen.
- Se añadió búsqueda por referencia, talla o datos visibles.
- Se añadieron filtros por estado de stock, estado activo y proveedor.
- Se muestra una alerta cuando el stock disponible es igual o menor que el stock
  mínimo definido para la referencia.
- Se diferencian visualmente las referencias activas e inactivas.
- Los valores monetarios se presentan en pesos colombianos sin decimales.
- Se conservó el patrón de navegación y diseño de Velora.
- La interfaz utiliza español y verbos como `Desactivar` y `Reactivar`, sin
  comunicar que se elimina la información del sistema.

### 5. Registro de uniformes

**Qué se hizo**

- Se habilitó el registro de una referencia con los siguientes datos: referencia,
  tipo, talla, proveedor, costo, precio de venta, cantidad disponible y cantidad
  mínima.
- El formulario permite crear una prenda desde la interfaz.
- La referencia se guarda en PostgreSQL y conserva su información después de
  recargar la aplicación.
- El servidor valida los valores numéricos.
- La cantidad disponible y la cantidad mínima deben ser números enteros positivos
  o iguales a cero.
- El costo y el precio de venta deben ser valores iguales o mayores que cero.
- Se impide crear referencias sin datos obligatorios.

### 6. Consulta y edición de uniformes

**Qué se hizo**

- Se agregó la consulta real de todas las referencias, incluyendo las desactivadas.
- La vista obtiene la información desde NestJS en lugar de datos locales.
- Se añadió la edición de la referencia, tipo, talla, proveedor, costos, precios,
  cantidad disponible y cantidad mínima.
- Los cambios realizados desde el formulario se envían al servidor y se persisten
  en PostgreSQL.
- Los errores devueltos por el servidor se muestran a la persona usuaria.

### 7. Ajuste de existencias

**Qué se hizo**

- Se agregó desde el frontend una opción para ajustar el stock.
- El ajuste permite aumentar o disminuir unidades.
- El ajuste debe ser distinto de cero y debe expresarse con un número entero.
- El sistema impide que el stock quede en una cantidad negativa.
- Cada ajuste solicita una observación del motivo.
- El movimiento queda registrado con tipo `AJUSTE`, cantidad, fecha, observación
  y usuario responsable.
- El historial de movimientos de inventario se conserva.

### 8. Desactivación y reactivación de uniformes

**Qué se hizo**

- Se reemplazó el borrado físico por desactivación.
- Una referencia desactivada conserva su información, stock y movimientos.
- Se añadió una opción para desactivar una referencia desde el menú de acciones.
- La desactivación requiere registrar un motivo.
- Se añadió una opción para reactivar referencias previamente desactivadas.
- La operación queda registrada en auditoría.

### 9. Administración de proveedores

**Qué se hizo**

- Se creó la consulta de proveedores desde PostgreSQL.
- Se agregó el registro de proveedores desde la pantalla.
- Se puede guardar razón social, NIT o documento, correo y teléfono.
- El formulario exige correo o teléfono como medio válido de contacto.
- Se puede desactivar o reactivar un proveedor sin eliminarlo.
- Un proveedor desactivado conserva su información y la relación con referencias
  existentes.
- Las operaciones de proveedor quedaron disponibles mediante una API real.

### 10. Limpieza de datos temporales de demostración

**Qué se hizo**

- Se retiraron del cliente los arrays locales de proveedores y uniformes usados
  como ejemplos.
- Se eliminaron las validaciones que solo consultaban esas listas temporales.
- Las validaciones de duplicados, combinaciones de referencia y existencia real
  de proveedor quedaron delegadas al servidor y la base de datos.
- Se comprobó que el inventario mostrado ya proviene únicamente de NestJS y
  PostgreSQL.

### 11. Backend NestJS y endpoints implementados

**Qué se hizo**

- Se implementaron controladores, servicios, repositorios y DTO dentro del módulo
  M6.
- `GET /m6/uniformes`: consulta todas las referencias, incluida la información de
  proveedor y estado de stock.
- `GET /m6/uniformes/:uniformeId`: consulta el detalle de una referencia.
- `POST /m6/uniformes`: registra una referencia.
- `PATCH /m6/uniformes/:uniformeId`: modifica una referencia.
- `PATCH /m6/uniformes/:uniformeId/stock`: ajusta el stock.
- `POST /m6/uniformes/:uniformeId/desactivar`: desactiva la referencia.
- `POST /m6/uniformes/:uniformeId/reactivar`: reactiva la referencia.
- `GET /m6/proveedores`: consulta proveedores.
- `POST /m6/proveedores`: registra proveedores.
- `PATCH /m6/proveedores/:proveedorId/estado`: desactiva o reactiva proveedores.
- Todas las operaciones sensibles utilizan temporalmente una cabecera de usuario
  autenticado y permisos de inventario.

### 12. Base de datos

**Qué se hizo**

- Se reutilizó PostgreSQL como fuente de información oficial.
- Se utilizaron las tablas ya previstas para proveedores, uniformes, movimientos
  de inventario y auditoría.
- Se creó el ajuste inicial de stock como movimiento de entrada al registrar una
  referencia.
- Los ajustes posteriores se registran como movimientos de tipo `AJUSTE`.
- Se conservó el historial sin realizar eliminaciones físicas.
- PostgreSQL local usa el puerto `5432`; Docker PostgreSQL quedó configurado en el
  puerto `5433` para evitar conflictos en el entorno de desarrollo.

### 13. Verificaciones realizadas

**Qué se hizo**

- Se realizó la compilación del frontend.
- El frontend terminó de compilar correctamente.
- Se realizó la compilación de NestJS.
- El backend terminó de compilar correctamente.
- Se ejecutó la prueba automatizada disponible del backend.
- Resultado de pruebas: `1` de `1` aprobada.
- Se probó la consulta de proveedores.
- Se probó el registro real de un proveedor.
- Se probó el ajuste positivo de stock.
- Se probó el ajuste negativo de stock.
- Se verificó que una cantidad negativa final fuera rechazada.
- Se dejó el stock probado en su valor original después de las verificaciones.
- Se verificó que la página de inventario consume datos reales.
- Se verificó la navegación interna de Velora hacia el inventario.

### 14. Problemas encontrados y soluciones

**Qué se encontró**

- PostgreSQL local ya estaba utilizando el puerto `5432`.
- Se publicó PostgreSQL de Docker en el puerto `5433` para evitar interferencias.
- NestJS quedó configurado para consultar la instancia de Docker usada por el
  desarrollo.
- El frontend contenía datos temporales de proveedores y uniformes.
- Esos datos fueron retirados y todas las operaciones quedaron conectadas a la API.
- Se encontró una instancia temporal de datos de demostración en el cliente.
- La pantalla fue corregida para utilizar exclusivamente información persistida.
- Se detectó que el ajuste inicial podía conservar un movimiento ambiguo.
- Se ajustó el flujo para que el registro inicial genere una entrada de stock y
  los cambios posteriores generen movimientos `AJUSTE`.
- Se detectó que una desactivación podría generar una baja con cantidad cero.
- Se eliminó esa acción para evitar movimientos sin sentido en el Kardex.
- Se detectó que la vista debía validar stock negativo.
- La validación fue aplicada tanto en el frontend como en las reglas del backend.

### 15. Decisiones bloqueantes

**Qué se decidió**

- Desactivar y reactivar no eliminan registros: esta decisión conserva el
  historial y evita pérdidas de información.
- Las prendas dañadas o perdidas en una devolución futura no volverán
  automáticamente al stock disponible.
- El Administrador tendrá acceso a la gestión completa del inventario.
- El Contador tendrá acceso exclusivo a información financiera y no podrá
  gestionar personal, inventario o ventas administrativas.
- El usuario Andrea López quedó temporalmente como usuario de prueba mientras se
  completa la autenticación real asignada al Grupo M1.
- El encabezado temporal `x-usuario-id=1` solo se usa mientras el equipo integra
  el inicio de sesión real.
- Una venta futura de uniformes debe registrar el cobro y el movimiento de stock
  como una sola operación lógica; si una parte falla, no puede quedar registrada
  la otra.
- Los medios de pago de una venta deben coincidir con los aceptados por M5.
- Se eligió el reporte de inventario como información exclusiva del Administrador;
  el Contador no tendrá acceso a inventario.
- Los proveedores pueden relacionarse con varias referencias, pero mantienen su
  propio estado activo o inactivo.
- Las combinaciones duplicadas de tipo, talla y proveedor son rechazadas por el
  servidor.
- Los cambios de personal y permisos permanecerán fuera de esta implementación
  hasta resolver la dependencia con M1-05, M1-06 y M1-07.

### 16. Resultado del Sprint 1

**Qué quedó disponible**

- Pantalla de inventario integrada a la aplicación.
- Consulta real de uniformes desde PostgreSQL.
- Registro, edición, desactivación y reactivación de uniformes.
- Ajuste manual de stock con movimientos de Kardex.
- Consulta, registro, desactivación y reactivación de proveedores.
- Validación de stock negativo.
- Validación de referencias duplicadas.
- Registro de auditoría para operaciones sensibles.
- Datos persistidos y no relacionados con ejemplos locales.
- Código backend organizado dentro del módulo NestJS M6.
- Código frontend organizado dentro de una carpeta exclusiva para M6.

---

## Pendientes fuera de la entrega realizada

### M6-01 — Panel administrativo

**Qué falta**

- Crear indicadores generales para Administrador.
- Mostrar métricas financieras únicamente al Contador.
- Consumir datos reales de inventario, personal, ventas y reportes.

### M6-02 y M6-03 — Personal y permisos

**Qué falta**

- Registrar datos laborales del personal.
- Validar documentos y correos duplicados.
- Vincular personal con cuentas y roles administrados por M1.
- Permitir activar o desactivar personal sin eliminar el historial.
- Asignar permisos específicos al rol Contador.
- Integrar autenticación real.

### M6-04 y M6-05 — Reportes y exportación

**Qué falta**

- Crear filtros por fecha y tipo de reporte.
- Mostrar totales y detalle financiero.
- Agregar exportación PDF y XLSX según el alcance aprobado.
- Excluir al Contador de reportes de inventario y administración.

### M6-07 — Venta de uniformes

**Qué falta**

- Seleccionar comprador y referencia.
- Validar cantidad disponible.
- Registrar medio de pago, monto y referencia.
- Integrar el cobro con M5.
- Confirmar la venta antes de descontar stock, o aplicar compensación si el cobro falla.
- Mostrar comprobante o historial financiero desde la integración correspondiente.

### M6-08 — Préstamos y devoluciones

**Qué falta**

- Registrar responsable y uniforme prestado.
- Validar stock disponible.
- Registrar fechas de entrega y devolución.
- Mostrar préstamos vencidos.
- Registrar pérdida o daño con motivo obligatorio.
- Determinar cuándo una prenda devuelta vuelve al stock disponible.

### Integración con otros módulos

**Qué falta**

- M1 debe entregar autenticación real, cuentas y permisos.
- M2 debe entregar la información de patinadores y acudientes para ventas y préstamos.
- M5 debe confirmar los conceptos, medios y transacciones financieras reutilizables.
- Completar las pruebas visuales E2E de registro, edición, stock, desactivación,
  reactivación, proveedores y errores.
- Resolver las advertencias existentes de React relacionadas con efectos.
- Completar las verificaciones móviles, intermedias y de escritorio, incluyendo 375,
  768 y 1280 px.

---

## 📅 Planificación de Sprints futuros

- **Sprint 2:** Personal y permisos, venta de uniformes y préstamos.
- **Sprint 3:** Reportes financieros, exportación PDF/XLSX y panel administrativo.
- **Sprint 4:** Integración con M1, M2, M3 y M5, pruebas finales y sustentación.

## Estado final de esta bitácora

**Última actualización:** 09 de noviembre de 2026.

La historia HU-M6-06 quedó implementada y verificada dentro del alcance asignado
al Grupo 6. Las historias restantes del módulo 6 permanecen documentadas como
pendientes y no deben marcarse como terminadas sin su implementación, integración
y prueba correspondiente.
