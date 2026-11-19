# Bitácora Técnica y Control de Cambios — Módulo 6

Este documento registra el progreso del **Grupo 6** y deja una descripción
clara de las tareas realizadas, las decisiones tomadas, los resultados revisados
y las actividades que todavía pertenecen a futuras entregas.

---

## 🏃 Sprint 1 (Semana 1) — Personal e inventario

- **Período:** 29 de octubre de 2026 – 05 de noviembre de 2026
- **Objetivo del Sprint:** Dejar lista la base de datos y funcionando los
  catálogos principales de Personal e Inventario.
- **Historias:** HU-6.2 — Personal y HU-6.6 — Inventario de uniformes.
- **Estado del Sprint:** Implementado. HU-6.6 completa; HU-6.2 implementada el
  11/11 (ver «Cierre de los Sprints 1 y 2»), pendiente de verificar contra la base.
- **Estado de HU-6.6:** Implementada y verificada funcionalmente.
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

> **Nota (11/11/2026):** desde el avance del 09/11 («completar flujos de demo del
> sprint 2») el frontend de inventario, ventas y préstamos volvió a usar datos de
> demostración en memoria (`m6-inventario-uniformes/services/inventario.service.ts`).
> El backend sí persiste en PostgreSQL. Reconectar las pantallas a la API está
> pendiente.

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
  puerto `5432` para evitar conflictos en el entorno de desarrollo.

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
- Se publicó PostgreSQL de Docker en el puerto `5432` para evitar interferencias.
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

## 🏃 Sprint 2 (Semana 2) — Implementado el 11/11 (ver «Cierre de los Sprints 1 y 2»)

- **Período del adelanto documentado:** 09 de noviembre de 2026.
- **Esfuerzo estimado del sprint:** 41 horas.
- **Historias del sprint:** HU-6.3 (Rol Contador), HU-6.7 (Ventas) y HU-6.8
  (Préstamos).
- **Objetivo:** hacer operativas las prendas para venderlas o prestarlas y
  restringir los permisos del Contador.
- **Estado del sprint:** Implementado el 11/11/2026: HU-6.3, HU-6.7 (con
  devolución) y HU-6.8 (con cobro). Las secciones siguientes son el historial del
  adelanto del 09/11; el estado actual está en «Cierre de los Sprints 1 y 2».

### HU-6.3 — Rol Contador: adelanto de demostración

**Qué se hizo**

- Se creó el usuario temporal `Carlos Ramírez`, correo
  `contador@m6.local`, con rol Contador e identificador `2` en la base local.
- El usuario aparece en el selector temporal de aplicación junto con Andrea.
- Su acceso financiero se controla por permisos: puede consultar planes, pagos,
  cartera e historial; no recibe permisos para administrar inventario.
- La autenticación real continúa pendiente del módulo M1.

**Qué se encontró**

- La pantalla de planes y tarifas estaba usando el permiso de administración
  (`M5_PLAN_GESTIONAR`) para decidir si Contador podía abrirla.
- El permiso de consulta correcto ya existía en la base:
  `M5_PLAN_CONSULTAR`.
- La pantalla mostraba acciones administrativas aun cuando el usuario solo debía
  consultar.

**Qué se hizo para corregirlo**

- La navegación de “Planes y tarifas” ahora acepta permisos de consulta.
- Los botones de crear plan, editar, cambiar tarifa, desactivar y acciones por
  fila se muestran solamente cuando el usuario tiene permiso de administración.
- Contador entra en modo lectura para consultar planes y tarifas.

**Qué falta**

- El módulo M5 necesita confirmar que ofrece una API de consulta reusable para
  Contador.
- ~~Completar y verificar los permisos del rol en las operaciones y rutas reales
  de M6~~. Hecho el 11/11 (ver §23). Sigue pendiente la autenticación real de M1.
- No deben mostrarse imágenes ni campos comerciales que no existan todavía en el
  modelo aprobado.

### HU-6.8 — Préstamos y devoluciones: adelanto parcial

**Qué se hizo**

- Se creó el tipo de inventario `IMPLEMENTO`, separado de camisetas, chaquetas,
  pantalones y uniformes completos.
- Se añadieron endpoints NestJS bajo `/m6/prestamos` para consultar, registrar y
  recibir préstamos.
- Se añadió la pantalla “Préstamos de implementos” dentro de la navegación de M6.
- El formulario permite seleccionar implementos con stock disponible, registrar
  un patinador, responsable, cantidad, fecha prevista y estado inicial.
- Se registró una devolución que recupera las unidades al inventario.
- La pérdida o el daño quedan registrados sin devolver unidades automáticamente
  al stock.
- Las operaciones generan auditoría y movimientos de Kardex relacionados.

**Qué se encontró**

- El esquema permitía técnicamente prestar cualquier uniforme, pero la norma de
  higiene exige no prestar prendas difíciles de higienizar.
- Las prendas pueden dañarse, perderse o usarse sin el control de higiene que
  corresponde a chaquetas, camisetas y pantalones.
- El sistema debe validar el tipo antes de crear el préstamo, no solo antes de
  mostrarlo en la interfaz.

**Qué se decidió**

- A partir de este avance solo se puede prestar `IMPLEMENTO`.
- Camisetas, chaquetas, pantalones y uniformes completos quedan prohibidos para
  préstamo.
- La devolución correcta vuelve el implemento al stock.
- Una pérdida o daño necesita observación y no vuelve automáticamente al stock.
- La fecha de vencimiento se calcula comparando la fecha prevista con la fecha
  actual; el esquema no guarda un estado duplicado llamado “Vencido”.

**Qué falta**

- ~~Crear una interfaz para buscar o cargar los patinadores reales desde M2.~~ Hecho el 11/11 (ver §25).
- ~~Mostrar responsables reales en lugar de ingresar identificadores manualmente.~~ Hecho el 11/11 (ver §25).
- ~~Mostrar préstamos vencidos con un indicador visible e ícono más texto.~~ Hecho el 11/11 (ver §25).
- ~~Agregar pruebas automáticas de cantidad insuficiente, tipo de prenda bloqueado,
  devolución y pérdida con observación.~~ Hecho el 11/11 (`reglas-prestamo.spec.ts`).
- Comprobar la pantalla en móvil, tablet y escritorio.

### HU-6.7 — Ventas: implementada

**Qué se hizo**

- Backend NestJS en `/m6/ventas`: consultar ventas, consultar compradores
  (patinadores activos y acudientes vinculados), consultar el detalle y registrar
  una venta con varias referencias.
- La venta registra fecha, comprador (patinador o acudiente), referencia, talla,
  cantidad, valor unitario, valor total y medio de pago.
- El valor unitario sale del precio de venta del inventario; el cliente no puede
  enviarlo.
- Se bloquea la venta si la cantidad pedida supera las existencias, si la
  referencia está desactivada, no tiene precio o es un implemento de préstamo.
- Venta, cobro y pago `VENTA_UNIFORME` de M5, comprobante `CP-xxxxxx`, descuento de
  stock, movimiento `VENTA` en el Kardex y auditoría se ejecutan en una sola
  transacción.
- La venta confirmada no se puede modificar: no existen endpoints de edición o
  borrado y la base de datos lo impide con un trigger.
- Pantalla «Venta de uniformes» en `/app/#/ventas`: formulario con varias líneas,
  existencias visibles al elegir la referencia y talla, alerta de existencias
  insuficientes, total calculado automáticamente, confirmación y comprobante
  imprimible. El pago aparece en el historial de pagos.
- Pruebas unitarias de las reglas de venta (stock, líneas repetidas, implementos,
  referencias sin precio y cálculo de totales).

**Decisiones**

- Mientras M5 no publique su API, M6 escribe el cobro, el pago y el comprobante
  directamente en las tablas de M5, aislado en `RegistroFinancieroVentaRepository`.
- Los medios de pago son los de M5: efectivo, transferencia y consignación; la
  referencia es obligatoria salvo en efectivo.
- La pantalla usa la demostración local, como inventario y préstamos, hasta que
  M1 entregue el inicio de sesión.

**Qué falta**

- ~~Flujo de devolución de venta (reingreso de stock y anulación del pago en M5).~~ Hecho el 11/11 (ver §26).
- Confirmar con M5 el contrato definitivo del asiento de venta.
- ~~Conectar la pantalla a la API real.~~ Hecho el 11/11 (ver §24).

### 17. Imágenes de productos, uniformes o tarifas

**Qué se decidió**

- No corresponde agregar imágenes todavía sin que el requisito, wireframe y base
  de datos lo hayan definido.
- Las imágenes de uniformes o implementos serían parte de catálogo M6 y de
  M6-06/M6-07.
- Las imágenes de tarifas pertenecen principalmente al diseño M5, porque la
  tarifa es un concepto de plan y no de inventario.
- Como no existen campos de imagen ni almacenamiento aprobado, la imagen queda
  fuera de este avance.

**Qué falta**

- Que los grupos responsables acuerden si se guardará una URL, un archivo o una
  ficha de recurso.
- Que M5 y M6 definan dónde almacenar la imagen y qué límites tendrá.
- Añadir vista previa, tamaño máximo, formatos permitidos y eliminación sin
  perder el historial.

## Sprint 3 y trabajo posterior — estado por historia

### M6-01 — Panel administrativo

**Qué falta**

- Crear indicadores generales para Administrador.
- Mostrar métricas financieras únicamente al Contador.
- Consumir datos reales de inventario, personal, ventas y reportes.

### M6-02 y M6-03 — Personal y permisos

**Estado (11/11):** implementadas; ver §22 y §23.

- ~~Registrar datos laborales del personal.~~
- ~~Validar documentos y correos duplicados.~~
- ~~Vincular personal con cuentas y roles administrados por M1.~~
- ~~Permitir activar o desactivar personal sin eliminar el historial.~~
- ~~Asignar permisos específicos al rol Contador.~~
- Integrar autenticación real (depende de M1).

### M6-04 y M6-05 — Reportes y exportación

**Qué falta**

- Crear filtros por fecha y tipo de reporte.
- Mostrar totales y detalle financiero.
- Agregar exportación PDF y XLSX según el alcance aprobado.
- Excluir al Contador de reportes de inventario y administración.

### Integración con otros módulos

**Qué falta**

- M1 debe entregar autenticación real, cuentas y permisos.
- M2 debe entregar la información de patinadores y acudientes para ventas y préstamos.
  (Mientras tanto M6 lee directamente las tablas `patinador` y `acudiente_patinador`.)
- M5 debe confirmar los conceptos, medios y transacciones financieras reutilizables.
- Completar las pruebas visuales E2E de registro, edición, stock, desactivación,
  reactivación, proveedores y errores.
- Resolver las advertencias existentes de React relacionadas con efectos.
- Completar las verificaciones móviles, intermedias y de escritorio, incluyendo 375,
  768 y 1280 px.

---

## 📅 Plan de sprints y estado

- **Sprint 1 (Semana 1, 26 h) — Implementado:** HU-6.6 (Inventario de
  uniformes) y HU-6.2 (Personal, completada el 11/11). Objetivo: dejar lista la
  base de datos y los dos catálogos principales funcionando.
- **Sprint 2 (Semana 2, 41 h) — Implementado el 11/11:** HU-6.3 (Rol Contador),
  HU-6.7 (Ventas y devoluciones) y HU-6.8 (Préstamos con cobro). Falta la
  verificación contra PostgreSQL con las migraciones y la revisión de criterios
  de aceptación con el grupo.
- **Sprint 3 (Semana 3, 53 h) — Pendiente:** HU-6.4 (Reportes), HU-6.5
  (Exportar PDF/Excel) y HU-6.1 (Dashboard KPIs). Objetivo: consolidar los
  números financieros y armar el panel principal del Administrador.
- **Sprint 4 (Semana 4) — Pendiente:** integración con los módulos de los otros
  grupos, verificación de criterios de aceptación y preparación de la
  sustentación.

### Avance de estabilización — Consultar, editar y fotografías

**Qué se hizo**

- Se encontró y corrigió la causa de las pantallas blancas al consultar o editar
  una referencia. El mensaje se producía cuando el formulario recibía una fecha
  vacía o no válida.
- Ahora las fechas vacías o incorrectas muestran un texto comprensible:
  `Sin fecha registrada`, sin detener el funcionamiento de la pantalla.
- Se comprobó que el backend, la lista del inventario y el servidor de la interfaz
  responden correctamente.
- Se añadió al inventario un enlace opcional para mostrar la fotografía real de
  cada producto. La imagen se puede registrar al crear una referencia o cambiar
  al editarla.
- Cuando una referencia todavía no tiene fotografía, el inventario muestra
  `Sin foto` y no impide el registro ni las operaciones normales.
- Las implementos disponibles para préstamo muestran ahora su fotografía junto
  al nombre y la talla seleccionada.
- La imagen quedó guardada en PostgreSQL mediante la nueva información de
  `foto_url`, asociada únicamente a la referencia correspondiente.
- El proyecto fue compilado de nuevo sin errores en frontend ni backend.
- La interfaz y el servidor fueron reiniciados para aplicar los cambios.
- Se confirmó nuevamente la lista de usuarios de prueba después de reiniciar los
  servicios. Andrea López, Administradora, y Carlos Ramírez, Contador, aparecen
  en el selector de ambas pestañas abiertas.

## Avance adicional del 09 de noviembre de 2026

### 18. Consulta del historial de movimientos

**Qué se hizo**

- Se completó la opción `Consultar movimientos` dentro del menú de cada
   referencia de inventario.
- El historial consulta al backend y muestra fecha, tipo, cantidad, responsable
   y observación.
- Los ajustes de stock positivos aparecen como entradas y los negativos como
   salidas sin cambiar su trazabilidad.
- Las referencias desactivadas conservan el acceso a su historial.
- Si una referencia todavía no tiene movimientos, la pantalla informa
   claramente que no existen registros.

### 19. Planes, tarifas y pagos de demostración temporal

**Qué se hizo**

- Mientras el equipo del Módulo 5 termina sus API, las pantallas de planes,
   tarifas, asignación de planes y registro de pagos muestran información
   temporal quemada en el código.
- Se dejaron ejemplos realistas: `Inicial`, `Competitivo`, `Competitivo Plus`
   y `Sesión libre`, con tarifas en pesos colombianos.
- También se dejaron usuarios y cobros de demostración para probar el recorrido
   completo de la interfaz sin afectar la base de datos real.
- Las pantallas muestran una advertencia visible que indica que los datos son
   temporales y corresponden a una demostración.

**Decisión temporal y pendiente de retiro**

- Estas listas quemadas deben eliminarse cuando se entreguen las API reales del
   Módulo 5.
- Al retirar la demostración hay que quitar los datos y el aviso visible del
   frontend.
- Las operaciones reales de creación, edición, asignación y pago deben volver
   exclusivamente al servicio HTTP.
- La demostración local se mantiene intencionalmente para presentar y probar el
   adelanto del Sprint 2 sin escribir en la base de datos de M5.

### 20. Verificación pendiente

**Qué falta revisar**

- Abrir Inventario y comprobar desde el menú que cada referencia muestra su
   Kardex.
- Realizar un ajuste positivo y uno negativo y verificar que ambos aparezcan en
   el historial.
- Confirmar en móvil y escritorio que las tablas, fotos y diálogos se presentan
   correctamente.
- Probar las pantallas M5 con la advertencia temporal y sustituir los datos
   quemados cuando M5 entregue sus servicios.

## Avance del 09 de noviembre de 2026 — pagos y préstamos

### M5 — planes, pagos e historial

- Asignar un plan mensual crea el cobro correspondiente y permite registrar un
   pago inicial completo o parcial. Cambiar de plan programa la tarifa futura y
   no representa un pago recibido.
- Un pago menor al saldo queda como abono; el saldo restante se puede pagar
   después desde el flujo de registro de pago.
- Se agregó historial general y filtrable por patinador con fecha, concepto,
   monto, medio de pago, comprobante y usuario que lo registró.
- Los datos de demostración de M5 viven en el frontend y se reinician al
   recargar la aplicación; no se escriben en la base de datos de M5.
- La integración real sigue pendiente de las API del Módulo 5, en particular
   `GET /m5/pagos` y `POST /m5/cobros`.

### Validaciones y verificación

- Se validan cantidades, tarifas y montos para impedir valores negativos o
   inválidos antes de registrar la operación.
- Se verificaron los builds de frontend y backend, el lint del backend, sus
   pruebas unitarias y los flujos locales de abono, historial, cálculo del
   préstamo, pago del saldo y validaciones.

## Avance del 11 de noviembre de 2026 — estabilización

### 21. Correcciones

**Qué se encontró**

- El `CHECK` de `uniforme.tipo` no incluía `IMPLEMENTO`, aunque el backend solo
  presta implementos: en la base real no se podía crear un implemento ni, por
  tanto, registrar préstamos. Las pruebas no lo detectaban porque la pantalla
  usa datos de demostración.
- `personal.telefono` era opcional, aunque RF-M6-02 lo exige.
- La carpeta frontend `m6-administracion-reportes-finanzas-inventario/` no la
  importaba ninguna pantalla.

**Qué se hizo**

- `schema.sql`: `IMPLEMENTO` agregado al `CHECK` y `personal.telefono NOT NULL`.
- Nueva carpeta `db/migraciones/` con el `ALTER TABLE` para bases ya creadas
  (`2026-11-11-m6-implemento-y-telefono-personal.sql`), sin borrar datos.
- Las reglas del préstamo pasan a `utils/reglas-prestamo.ts` y se prueban en
  `reglas-prestamo.spec.ts`: cantidad insuficiente, prendas bloqueadas, cantidad
  no válida, pérdida o daño sin observación y unidades que regresan al stock.
- Se eliminó el código frontend sin uso.
- Verificación: build del backend, 26 de 26 pruebas aprobadas, lint sin errores
  y build del frontend.

**Qué falta**

- Aplicar la migración en cada base local de desarrollo.
- Probar el préstamo de punta a punta contra PostgreSQL.

## Cierre de los Sprints 1 y 2 — 11 de noviembre de 2026

### Decisiones del grupo tomadas hoy

- **Préstamo con cobro:** la HU-6.8 no lo menciona, pero el grupo decidió
  mantenerlo. Valor = tarifa por unidad y día × cantidad × días previstos
  (mínimo 1). Hay que agregarlo a la HU-6.8 y al RF-M6-08.
- **Solo se prestan implementos** (higiene). La HU-6.8 dice «uniformes»: hay que
  actualizarla.
- **Devolución de venta:** solo el Administrador, total o parcial.
- **Personal y cuentas:** M6 guarda la ficha laboral y se vincula de forma
  opcional a una cuenta existente de M1. M6 no crea cuentas.

### Qué se hizo (ramas y commits locales, sin push)

| Rama | HU | Qué incluye |
| --- | --- | --- |
| `hu/HU-M6-02-registro-de-personal` | HU-6.2 | CRUD `/m6/personal`, búsqueda y filtros en el servidor, unicidad con mensaje por campo, desactivar/reactivar, vínculo con cuenta de M1, pantalla «Personal». |
| `hu/HU-M6-03-rol-contador` | HU-6.3 | Asignar/retirar rol Contador, retiro automático al desactivar, «Acceso no autorizado», usuario «Demo local · Contador», prueba de que toda ruta M6 exige permiso y de los permisos sembrados. |
| `fix/m6-frontend-api-real` | HU-6.6/6.7 | Inventario, proveedores, movimientos y ventas usan la API con un usuario real; la demo local queda para los usuarios «Demo». Editar la cantidad de una referencia ahora deja AJUSTE en el Kardex. Desactivar pide motivo. |
| `hu/HU-M6-08-prestamo-de-implementos` | HU-6.8 | Cobro PENDIENTE en M5 (`PRESTAMO_IMPLEMENTO`), tarifa sugerida por referencia, responsables según el patinador, estado Vencido, diálogo de recepción con observación obligatoria para pérdida o daño. |
| `hu/HU-M6-07-devolucion-de-venta` | HU-6.7 | Devolución total o parcial; si cubre toda la venta de una vez se anula el pago en M5; estado de la venta (confirmada, devuelta en parte, devuelta). |

Las ramas están apiladas en ese orden sobre `hu/HU-M6-07-registro-de-venta-de-uniformes`
(PR #19).

### 22. HU-6.2 — Registro y administración de personal

**Qué se hizo**

- Backend `/m6/personal` con permiso `M6_PERSONAL_GESTIONAR` (solo Administrador):
  listar, consultar, registrar, editar, desactivar y reactivar.
- Búsqueda por documento o nombre, filtro por estado y cargo, y paginación hechos en
  el servidor.
- Campos obligatorios: tipo y número de documento, nombres, apellidos, correo,
  teléfono y cargo. Los datos se normalizan antes de guardar (documento en
  mayúsculas, correo en minúsculas, sin espacios sobrantes).
- Documento y correo duplicados responden 409 con el campo que falla; la base lo
  garantiza con restricciones únicas.
- Desactivar deja la persona `INACTIVO` con fecha de retiro y conserva su historial;
  reactivar la devuelve a `ACTIVO`. Todo queda en auditoría.
- Vínculo opcional con una cuenta existente de M1, elegida desde
  `GET /m6/personal/cuentas-disponibles` (cuentas no desactivadas y sin otra ficha).
- Pantalla «Personal» en el menú «Administración»: tabla con buscador, filtro,
  paginación, formulario con errores por campo y confirmación para desactivar.
- Pruebas de normalización, mensajes de duplicado y reglas de vínculo con la cuenta.

**Qué se encontró**

- La tabla `personal` existía desde el Sprint 1, pero no había código que la usara;
  la bitácora marcaba la historia como completa.
- `personal.telefono` era opcional en la base aunque el RF lo exige (corregido en §21).

**Qué se decidió**

- M6 no crea cuentas: solo vincula una cuenta que ya exista en M1. Así no se cruza
  con el registro de usuarios de M1.

**Qué falta**

- Probar contra PostgreSQL y revisar la pantalla en 375, 768 y 1280 px.

### 23. HU-6.3 — Rol Contador

**Qué se hizo**

- `POST /m6/personal/:id/rol-contador` asigna el rol; `/rol-contador/retirar` lo quita.
- Solo se asigna a personal activo con una cuenta vinculada que no esté desactivada.
  Se acepta una cuenta «Por registrar» (el Contador entra con contraseña temporal,
  cambio #3 del registro entre módulos).
- Desactivar a una persona le retira el rol Contador.
- Prueba automática que revisa que cada ruta del M6 declara su permiso, y otra que lee
  la semilla de `schema.sql` y confirma que el Contador registra pagos, consulta
  cartera e historial y reportes, pero no anula pagos ni gestiona inventario o personal.
- La pantalla bloqueada muestra «Acceso no autorizado».
- En la pantalla de Personal: insignia «Contador» y botones para asignar o retirar el
  rol con confirmación.
- Nuevo usuario «Demo local · Contador» en el selector de prueba, para mostrar las
  restricciones sin base de datos.

**Qué se decidió**

- Personal inactivo no conserva permisos financieros.

**Qué falta**

- Reescribir la HU-6.3 con el cambio #5 (el Contador registra pagos).
- Integrar la autenticación real de M1.

### 24. Inventario y ventas conectados a la API

**Qué se hizo**

- Inventario, proveedores, historial de movimientos y ventas llaman a `/m6/...`
  cuando se elige un usuario real en el selector de prueba. Con los usuarios
  «Demo local» siguen funcionando con datos en memoria, para presentar sin base.
- El aviso de demostración solo aparece en modo demo.
- Desactivar una referencia ahora pide el motivo que exige la API.

**Qué se encontró**

- Editar la cantidad disponible desde «Editar referencia» cambiaba el stock sin dejar
  movimiento en el Kardex.

**Qué se hizo para corregirlo**

- La diferencia queda como movimiento `AJUSTE` en la misma transacción, leyendo la
  cantidad con la fila bloqueada.

### 25. HU-6.8 — Préstamo de implementos con cobro

**Qué se hizo**

- El préstamo genera un cobro `PENDIENTE` en M5 con concepto `PRESTAMO_IMPLEMENTO`:
  tarifa por unidad y día × cantidad × días (de hoy a la devolución prevista, mínimo
  1), con fecha límite en la devolución prevista. Se paga desde «Registrar pago».
- Cada implemento tiene una tarifa sugerida (`tarifa_prestamo_dia`) que se puede
  ajustar en cada préstamo. Con tarifa cero no se genera cobro.
- Préstamo, cobro, descuento de stock, Kardex y auditoría van en una sola transacción.
- El listado muestra patinador, responsable, cobro, saldo y el estado Vencido (activo
  con fecha prevista pasada), con los vencidos primero y un aviso en la pantalla.
- El responsable se elige entre la cuenta del patinador y sus acudientes activos.
- Recibir abre un diálogo con el estado de recepción; pérdida o daño exige una
  observación escrita (antes se guardaba un texto fijo).
- Pruebas del cálculo del cobro (días, mínimo un día, cambio de mes, tarifa cero).

**Qué se encontró**

- La HU-6.8 y el RF-M6-08 no mencionan ningún cobro: la tarifa solo existía en la
  pantalla de demostración.

**Qué se decidió**

- El grupo decidió mantener el cobro por día.

**Qué falta**

- Actualizar la HU-6.8 y el RF-M6-08: solo implementos y cobro por día.
- Avisar a M5 del nuevo concepto de cobro.

### 26. HU-6.7 — Devolución de ventas

**Qué se hizo**

- `POST /m6/ventas/:id/devoluciones`, solo Administrador, con motivo, medio de
  reembolso y las unidades por referencia.
- La venta no se modifica: la devolución queda en `devolucion_venta` y su detalle,
  también protegidos contra cambios. No se puede devolver más de lo pendiente.
- Las unidades regresan al stock con movimiento `DEVOLUCION` en el Kardex.
- Si una sola devolución cubre toda la venta, se anulan su pago, su comprobante y su
  cobro en M5. Si es parcial, el reembolso queda registrado en M6.
- Cada venta muestra su estado (Confirmada, Devuelta en parte, Devuelta), el valor
  devuelto y lo devuelto por línea.
- Diálogo de devolución en la pantalla de ventas, que funciona con la API y con la
  demostración.
- Pruebas: devolución parcial, total, completar una venta ya devuelta en parte,
  líneas repetidas y cantidades fuera de rango.

**Qué se decidió**

- Solo el Administrador registra devoluciones, y pueden ser parciales.
- Si una venta se completa con varias devoluciones, el pago no se anula al final:
  así el ingreso no se descuenta dos veces.

**Qué falta**

- Los reportes (HU-6.4) deben restar `valor_devuelto` de los ingresos cuando la
  devolución no anuló el pago.
- Actualizar la HU-6.7 y confirmar con M5 el uso de la anulación de pagos.

### Migraciones para bases ya creadas (en orden)

1. `db/migraciones/2026-11-11-m6-implemento-y-telefono-personal.sql`
2. `db/migraciones/2026-11-11-m6-prestamo-con-cobro.sql` (toca `cobro.concepto`, tabla de M5)
3. `db/migraciones/2026-11-11-m6-devolucion-de-venta.sql`

### Verificación

- Backend: compila, 63 de 63 pruebas aprobadas, lint sin errores.
- Frontend: `tsc` y `vite build` sin errores.
- **No verificado todavía:** ninguna migración ni endpoint se probó contra
  PostgreSQL (en el equipo donde se desarrolló no había Docker ni base del
  proyecto). Tampoco se revisaron las pantallas en el navegador (375/768/1280).

### Qué falta

- Correr las migraciones y probar cada flujo de punta a punta con la base.
- Avisar a M5: nuevo concepto `PRESTAMO_IMPLEMENTO` en `cobro`, y la devolución
  total anula pago, comprobante y cobro de la venta.
- Actualizar HU-6.3, HU-6.7 y HU-6.8 con las decisiones de hoy.
- Sprint 3: los reportes (HU-6.4) deben restar `devolucion_venta.valor_devuelto`
  de los ingresos cuando `anula_pago = false`.

## Estado final de esta bitácora

**Última actualización:** 11 de noviembre de 2026.

Los Sprints 1 y 2 están implementados (HU-6.2, HU-6.3, HU-6.6, HU-6.7 con
devolución y HU-6.8 con cobro), pendientes de verificarse contra la base de
datos y de revisar los criterios de aceptación con el grupo. Sigue el Sprint 3:
HU-6.4 (Reportes), HU-6.5 (Exportación) y HU-6.1 (Panel).
