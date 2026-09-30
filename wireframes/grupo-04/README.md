# Grupo 04

## Integrantes

- 
- 
- 

## Herramienta usada

HTML/CSS (con un poco de JavaScript para cambiar de pestaña). Se abre directo en el navegador, sin instalar nada: empezar por [`index.html`](index.html).

## Enlace al archivo original

No aplica (el prototipo es el código de esta carpeta).

## Páginas

Módulo 5: **Planes, Tarifas y Pagos** (sección 4.5 del documento de requerimientos, RF-M5-01 a RF-M5-18).

| Página | Carpeta | Requisitos | Estado |
| ------ | ------- | ---------- | ------ |
| Planes y tarifas (admin) | `planes/` | RF-M5-01 a 05 | Borrador |
| Oferta de planes | `oferta-planes/` | RF-M5-05 | Borrador |
| Asignar / cambiar plan | `asignar-plan/` | RF-M5-06, 07, 08 | Borrador |
| Cartera | `cartera/` | RF-M5-12, 13 | Borrador |
| Registrar pago (cobro y por sesión) | `registrar-pago/` | RF-M5-09, 10, 14 | Borrador |
| Historial de pagos | `historial-pagos/` | RF-M5-11, 15, 16 | Borrador |
| Comprobante de pago | `comprobante/` | RF-M5-14, 15 | Borrador |
| Pagos del acudiente / Mis pagos (patinador) | `mis-pagos/` | RF-M5-15, 17, 18 | Borrador |

Los estilos compartidos están en `assets/wireframe.css`.

## Decisiones de diseño

- **Una sola pantalla de planes para el Administrador**: se crean, editan, desactivan y se les pone tarifa desde modales, sin salir de la lista. No hay “Eliminar”, porque un plan con patinadores o pagos solo se puede desactivar (RF-M5-03).
- **El precio no se edita en el plan**: tiene su propio modal, “Registrar tarifa”, con fecha de vigencia e historial, porque así separa el RF-M5-02 del RF-M5-04.
- **Asignar y cambiar plan comparten pantalla** (dos pestañas). La vista de cambio muestra desde cuándo aplica el nuevo plan y avisa si hay que ajustar el grupo del patinador (sección 4.3).
- **Registrar pago muestra el saldo restante antes de confirmar**, para que el pago parcial sea visible. Al terminar lleva directo al comprobante.
- **Los pagos no se editan ni se borran**: en el historial, los anulados siguen en la lista, tachados, no suman al total y muestran el motivo. El botón “Anular” solo aparece para el Administrador.
- **Estados de cartera con forma y texto** (● Al día, ◐ Pendiente, ▲ Vencido), no solo con color, para que se entiendan en gris y por accesibilidad.
- **El Acudiente y el Patinador tienen una vista propia, de solo lectura**, con el saldo y el estado arriba. Si el acudiente tiene varios patinadores, cambia entre ellos con pestañas.
- **Responsive**: por debajo de 860 px el menú lateral pasa a una barra horizontal, las columnas se apilan y las tablas se desplazan dentro de su recuadro.
- Las notas amarillas y las etiquetas `RF-M5-xx` son anotaciones del wireframe para la revisión; no forman parte de la interfaz.
