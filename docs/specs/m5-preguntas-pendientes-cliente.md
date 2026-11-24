# M5 · Preguntas pendientes para el cliente

Preguntas que quedaron abiertas en la reunión del 19/11/2026 con Jaime Fernando Pérez (cuestionario de planes y pagos). Mientras no haya respuesta, el sistema usa los **valores provisionales** que se indican. Todos son parámetros de `parametro_sistema`, así que cambiarlos no requiere tocar el código.

**Para preguntar el jueves.** Anotar la respuesta en cada pregunta y la fecha.

## 1. Penalidades

**1.1 ¿De cuánto es la penalidad del plan mensual?**
El cliente dijo que, si no pagan, siguen el primer mes, en el segundo se cobra una penalidad y al tercero se cancela la suscripción. El valor quedó «a consideración del grupo».
- Provisional: **10 % de la mensualidad adeudada**, un recargo por cada mensualidad que llega al mes siguiente sin pagar (`recargo_mora_mensual_pct = 10`).
- Confirmar también: ¿se cobra una sola vez por mensualidad o cada mes que siga sin pagar?
- Respuesta: ______________________________

**1.2 ¿De cuánto es la penalidad del plan diario?**
Se permite un día de gracia con penalidad: quien asiste puede pagar al día siguiente de la clase.
- Provisional: **10 % del valor de cada sesión** (`recargo_sesion_pct = 10`). Después del día de gracia, el pago atrasado no se acepta.
- Respuesta: ______________________________

## 2. Clase de valoración

**2.1 ¿A qué se abonan los $ 10.000 de la clase de valoración cuando la persona se inscribe?**
- Provisional: **se descuentan del valor de la matrícula** (`valor_clase_valoracion = 10000`).
- Alternativa: descontarlos de la primera mensualidad o del primer pago de sesiones.
- Respuesta: ______________________________

**2.2 ¿La valoración es obligatoria antes de inscribirse?**
- Provisional: **no**; se puede inscribir sin valoración y, si la hubo, se abona.
- Respuesta: ______________________________

**2.3 ¿Hay un plazo para que el abono aplique** (por ejemplo, si se inscribe tres meses después de la valoración)?
- Provisional: **no hay plazo**.
- Respuesta: ______________________________

## 3. Cancelación por no pago (plan mensual)

**3.1 ¿En qué momento exacto se cancela la suscripción?**
«Si no paga al tercer mes, se cancela.»
- Provisional: **el día 1 del tercer mes**. Ejemplo: si no pagó la mensualidad de octubre, el 1 de diciembre se cancela el plan. Las deudas siguen pendientes.
- Respuesta: ______________________________

**3.2 Después de la cancelación, ¿puede volver a inscribirse o renovar? ¿Conserva alguna condición?**
Quedó pendiente en el cuestionario.
- Provisional: puede volver a tener un plan sin pagar otra matrícula. El sistema **no exige** pagar primero la deuda anterior.
- Respuesta: ______________________________

**3.3 ¿Qué pasa con el plan diario si no paga?** (quedó pendiente en el cuestionario)
- Provisional: no hay cancelación automática; simplemente no se acepta el pago después del día de gracia.
- Respuesta: ______________________________

## 4. Fechas de pago

**4.1 Confirmar: el plan mensual se paga del día 1 al 5 y desde el día 6 queda en mora.**
- Provisional: **día límite 5 para todos los planes mensuales, «Vencido» desde el día 6** (`dias_gracia_mora = 0`). Ya no se ofrecen los días límite 10, 15 y 20.
- Respuesta: ______________________________

**4.2 ¿Se puede pagar el mes siguiente por adelantado** (por ejemplo, el 28 de noviembre la mensualidad de diciembre)?
El cliente dijo que el usuario puede pagar antes de los cinco días, pero no precisó si antes de que empiece el mes.
- Provisional: **no**; la mensualidad se genera el día 1 y desde ese día se puede pagar.
- Respuesta: ______________________________

## 5. Terminación del plan, excepciones y devoluciones

**5.1 ¿Cuándo termina el contrato si la persona avisa o deja de asistir?** (pendiente en el cuestionario)
¿Conserva el acceso hasta fin de mes? ¿Desde cuándo se deja de cobrar?
- Respuesta: ______________________________

**5.2 Botón para retirar al patinador** (compromiso de la reunión)
¿Quién lo usa (acudiente, patinador mayor, administrador)? ¿Retira de inmediato o al final del mes pagado? ¿Debe notificar al club?
- Respuesta: ______________________________

**5.3 Excepciones del gerente** (cancelaciones o devoluciones por fuerza mayor)
¿Quién las registra en el sistema? ¿Se necesita un registro especial o basta con la anulación del pago con su motivo?
- Provisional: la anulación de un pago (solo el Administrador, con motivo y auditoría) es para **corregir errores de registro, no es una devolución**. No hay devoluciones en el sistema.
- Respuesta: ______________________________

## 6. Precios

**6.1 ¿Qué valores usamos para los planes, la matrícula y los gastos administrativos?** El cliente dijo que «queda a consideración del grupo».
- Hoy (datos de demostración): Clase suelta $ 35.000 por sesión, Formación 3 días $ 180.000, Competencia 6 días $ 300.000, Alto rendimiento $ 380.000, matrícula $ 120.000 y gastos administrativos $ 45.000.
- Respuesta: ______________________________
