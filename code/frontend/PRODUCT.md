# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Administrador (usuario primario):** dueño, director o administrador de una escuela o club de patinaje de velocidad. Concentra hoy la operación en hojas de cálculo, mensajes y archivos; necesita ordenar la gestión deportiva, competitiva, financiera y administrativa, y decidir con datos.
- **Profesor:** entrena, evalúa habilidades, propone cambios de categoría y da seguimiento al progreso de los patinadores.
- **Contador:** consulta y exporta información financiera, registra pagos y elabora reportes; no modifica usuarios, grupos, horarios, matrículas ni inventario.
- **Patinador:** consulta su progreso, grupo, competencias y pagos; gestiona por sí mismo solo si es mayor de edad.
- **Acudiente:** actúa por el patinador menor de edad; autoriza, paga y consulta únicamente a sus patinadores asociados.
- **Fisioterapeuta:** interviene en la validación de la póliza médica.
- **Visitante no autenticado:** accede solo a información general de la escuela, nunca a datos de patinadores.
- **Sistema:** ejecuta validaciones, cobros, cartera y rankings según reglas definidas.

## Product Purpose

Velora es la plataforma de gestión para escuelas y clubes de patinaje de velocidad. Reemplaza la gestión manual dispersa en planillas, mensajes y pagos sin trazabilidad, y centraliza en un solo lugar la operación deportiva, competitiva, financiera y administrativa.

El éxito significa menos trabajo manual, información confiable y trazable, reglas de negocio aplicadas de forma consistente y permisos claros para cada rol.

## Positioning

Una plataforma especializada en escuelas y clubes de patinaje de velocidad, no un sistema genérico adaptado. Su mecanismo distintivo es operar toda la escuela sobre una misma base de reglas y permisos: los módulos comparten datos, validaciones automáticas y auditoría, en lugar de ser funciones aisladas.

## Operating Context

- La escuela o club es la unidad de operación; el dueño suele concentrar procesos que el sistema debe cubrir.
- Muchos patinadores son menores de edad: el acudiente es un actor central que autoriza, paga y consulta en su nombre.
- La operación incluye sedes, grupos con cupo, horarios, niveles, categorías, competencias, tiempos, rankings, planes, cobros, cartera, personal, uniformes y préstamos.
- Los pagos se registran manualmente después de recibirlos; no existe pasarela de pago en línea.
- La cartera se consulta con estados `Al día`, `Pendiente` y `Vencido`; una cartera vencida bloquea la inscripción a competencias.
- Los valores monetarios se expresan en COP y los tiempos de competencia en `MM:SS.mmm`.
- El producto se usa en navegador web; la landing pública es una página en español de Colombia (es-CO).

## Capabilities and Constraints

**Módulos confirmados**

- **M1 · Usuarios y acceso:** registro, autenticación por rol, autorización de menores y activación de profesores.
- **M2 · Gestión deportiva:** fichas de patinadores, niveles, categorías, evaluación, historial y vistas por rol.
- **M3 · Grupos y horarios:** sedes, grupos con cupo, profesores, horarios, cambio de grupo y calendario.
- **M4 · Competencias y resultados:** competencias, pruebas, inscripciones validadas, tiempos, resultados, rankings y récords.
- **M5 · Planes y pagos:** planes, tarifas, cobros mensuales, pagos manuales, cartera y comprobantes.
- **M6 · Administración y reportes:** panel general, personal, reportes, uniformes y préstamos.

**Reglas de negocio que el producto debe preservar**

- Los menores de edad requieren acudiente asociado, autorización y póliza vigente.
- La inscripción a competencias se ratifica solo con póliza vigente (menores), cartera al día, autorización del acudiente (menores) y ausencia de sanción; no hay aprobación manual.
- Los pagos se registran manualmente, no se editan ni eliminan; las correcciones se hacen anulando con motivo.
- No hay borrado físico de información con historial: se desactiva o anula.
- Los cambios sensibles quedan auditados con usuario, fecha y motivo.
- Los permisos son por rol: el acudiente solo ve a sus patinadores y el patinador solo sus propios datos.
- Un visitante no autenticado nunca accede a datos de patinadores.
- El aforo de un grupo bloquea matrículas al llegar al cupo y alerta al 90 %.
- Los rankings solo son visibles para la misma categoría y el personal técnico.

**Restricciones y alcance**

- Fuera de alcance del producto: pasarelas de pago, cobros en línea y facturación electrónica.
- La landing pública v1 no tiene backend, API, formulario con envío real, CMS, multiidioma, modo oscuro ni analítica de terceros.
- La landing no publica precios del SaaS mientras no exista una definición comercial.
- La landing no inventa testimonios, clientes, métricas, premios, certificaciones ni datos de contacto.
- La landing debe cumplir WCAG 2.2 AA y funcionar en 375, 768, 1280 y 1440 px sin desplazamiento horizontal.
- El contenido principal de la landing debe ser indexable sin JavaScript.

## Brand Commitments

- **Nombre:** Velora, marca de la plataforma; no es el nombre de una escuela concreta.
- **Idioma:** español de Colombia (es-CO), estilo oración, claro y directo.
- **Personalidad:** velocidad, precisión, confianza, cercanía y energía.
- **Tono:** profesional pero humano; orgulloso del deporte, sin ser agresivo.
- **Restricciones visuales explícitas:** evitar estética genérica de SaaS, gradientes morados, glassmorphism, ilustraciones isométricas genéricas, capturas falsas de dashboards, neón y clichés de «velocidad». La identidad visual se define en el flujo de diseño de Impeccable y se documenta en `DESIGN.md` al cierre.

## Evidence on Hand

- `docs/CONTEXT.md`: contexto, actores, módulos, reglas de negocio y glosario.
- `docs/REQUIREMENTS.md`: requisitos funcionales con trazabilidad.
- `docs/specs/landing-velora.md`: especificación completa de la landing pública.
- `code/frontend/`: starter de Vite con React 19, TypeScript y Vite; la landing reemplaza su contenido.
- `wireframes/`: wireframes por grupo para la aplicación interna, no reutilizables como identidad de la landing.
- `design-system/`: design system interno `ps-*`; no se reutiliza en la landing.

**Ausencias que no deben fabricarse:** logo, tipografía, paleta e identidad visual; fotografías o ilustraciones con licencia; correo, teléfono, WhatsApp y enlace de agenda; dominio y URL canónica; redes sociales; precios y planes comerciales; testimonios, casos de éxito, métricas de uso, clientes, premios y certificaciones; Política de privacidad y Términos y condiciones.

## Product Principles

1. **Una sola plataforma, una sola verdad:** todos los módulos comparten datos, permisos y reglas; nada vive en silos.
2. **Cada rol ve solo lo que necesita:** la privacidad y los permisos son parte del producto, no una capa añadida.
3. **Las reglas se aplican y dejan rastro:** validaciones automáticas, cartera con consecuencias claras y auditoría de cambios sensibles.
4. **La confianza de las familias es parte del producto:** menores, acudientes, autorizaciones y pólizas se tratan con cuidado explícito.
5. **Honestidad funcional:** se comunica lo que el producto hace; nunca pagos en línea, facturación electrónica ni automatizaciones inexistentes.

## Accessibility & Inclusion

- La landing pública debe cumplir WCAG 2.2 AA: contraste 4.5:1 en texto y 3:1 en componentes, navegación por teclado, foco visible, enlace «Saltar al contenido», un solo `h1`, landmarks semánticos, textos alternativos y áreas táctiles de 44 × 44 px.
- Respetar `prefers-reduced-motion`.
- El estado nunca se comunica solo por color.
- La aplicación interna no tiene todavía un estándar de accesibilidad confirmado para este producto.
