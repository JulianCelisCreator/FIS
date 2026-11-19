# Spec: landing page de Velora

| Campo | Valor |
|---|---|
| Estado | Borrador v0.1 |
| Fecha | 06/11/2026 |
| Producto | **Velora** |
| Tipo | Landing page pública de marketing |
| Implementación | `code/frontend/` (React 19 + TypeScript + Vite) |
| Contexto de producto | `code/frontend/PRODUCT.md`, creado con `/impeccable init` el 06/11/2026 |
| Identidad visual | Flujo de diseño de Impeccable (`new-work`/`shape`) → `DESIGN.md` al finalizar (pendiente) |
| Fuente de contexto | `docs/CONTEXT.md`, `docs/REQUIREMENTS.md` |
| Estado actual de `code/frontend` | Starter de Vite; esta spec reemplaza su contenido |

## Contenido

1. Propósito y alcance
2. Contexto de producto
3. Audiencia, objetivos y conversión
4. Supuestos y decisiones
5. Identidad visual con Impeccable
6. Arquitectura de la página
7. Especificación por sección
8. Contenido y datos
9. Requisitos técnicos
10. Accesibilidad, SEO y rendimiento
11. Fases de trabajo
12. Definición de terminado
13. Riesgos y pendientes
14. Fuera de alcance
15. Referencias

---

## 1. Propósito y alcance

Crear la landing page pública de **Velora**, la plataforma de gestión para escuelas y clubes de patinaje de velocidad. La página debe explicar qué problema resuelve, para quién está pensada y por qué se puede confiar en ella, y convertir visitantes en solicitudes de demo o contacto.

**Incluye:**

- Una página pública de una sola ruta (`/`), responsive y en español.
- Header con navegación por anclas, hero, beneficios, módulos, roles, flujo de uso, confianza, FAQ, CTA final y footer.
- Contenido basado en el contexto real del proyecto, sin datos de patinadores reales.
- Contexto de producto en `PRODUCT.md` y dirección visual definida con Impeccable; `DESIGN.md` se consolida al cierre.
- Implementación en `code/frontend/` con React, TypeScript y Vite.
- Requisitos de accesibilidad, SEO, rendimiento y verificación.

**No incluye:**

- La aplicación interna de gestión, sus módulos, rutas privadas o autenticación.
- Backend, API, base de datos o envío de correos.
- Pasarela de pagos, facturación electrónica o cobros en línea.
- CMS, blog, multiidioma, modo oscuro o panel administrativo de contenido.
- Analítica de terceros o cookies no esenciales.
- Precios o planes comerciales del SaaS, mientras no exista una definición de negocio.
- Testimonios, métricas, logos de clientes o certificaciones inventadas.

---

## 2. Contexto de producto

Velora reemplaza la gestión manual de una escuela de patinaje de velocidad: fichas en hojas de cálculo, inscripciones por mensajes, pagos dispersos y reportes armados a mano. Centraliza la operación deportiva, competitiva, financiera y administrativa, con permisos por rol y reglas de negocio explícitas.

### 2.1 Módulos que debe comunicar la landing

| Módulo | Qué resuelve | Mensaje público sugerido |
|---|---|---|
| **M1 · Usuarios y acceso** | Registro, autenticación por rol, autorización de menores y activación de profesores | «Cada persona entra y ve solo lo que le corresponde». |
| **M2 · Gestión deportiva** | Fichas de patinadores, niveles, categorías, evaluación e historial | «El progreso de cada patinador, siempre a mano». |
| **M3 · Grupos y horarios** | Sedes, grupos con cupo, profesores, horarios y calendario | «Organiza sedes, cupos y horarios sin cruces». |
| **M4 · Competencias y resultados** | Competencias, inscripciones validadas, tiempos, resultados, rankings y récords | «Compite con reglas claras y resultados confiables». |
| **M5 · Planes y pagos** | Planes, tarifas, cobros, pagos manuales, cartera y comprobantes | «Controla la cartera sin perder el hilo de cada pago». |
| **M6 · Administración y reportes** | Panel general, personal, reportes, uniformes y préstamos | «Decide con datos, no con planillas sueltas». |

### 2.2 Roles que debe mostrar

| Rol | Necesidad principal | Qué debe transmitir la landing |
|---|---|---|
| **Administrador** | Gestionar toda la operación | Control central, configuración y reportes. |
| **Profesor** | Entrenar, evaluar y proponer cambios de categoría | Herramientas para el día a día deportivo. |
| **Patinador** | Consultar su progreso, grupo y competencias | Autonomía y visibilidad de su información. |
| **Acudiente** | Autorizar, pagar y consultar a sus patinadores | Tranquilidad y privacidad para las familias. |
| **Contador** | Consultar información financiera y registrar pagos | Orden financiero y trazabilidad. |
| **Fisioterapeuta** | Validar póliza médica | Validaciones claras para el cuidado de los menores. |

### 2.3 Reglas de negocio que afectan el mensaje

- Los **menores de edad** requieren acudiente, autorización y póliza vigente.
- La inscripción a competencias se valida con póliza, cartera al día, autorización del acudiente y ausencia de sanción.
- La **cartera** tiene estados `Al día`, `Pendiente` y `Vencido`; `Vencido` bloquea inscripciones.
- Los **pagos se registran manualmente**; no hay pasarela de pago en línea. Las correcciones se hacen anulando con motivo.
- **No hay borrado físico** de información con historial: se desactiva o anula.
- Los cambios sensibles quedan **auditados** con usuario, fecha y motivo.
- Los permisos son **por rol**; el acudiente solo ve a sus patinadores y el patinador solo sus propios datos.
- Un **visitante no autenticado** solo accede a información general; nunca a datos de patinadores.
- Los valores monetarios se expresan en **COP** y los tiempos de competencia en `MM:SS.mmm`.

> La landing puede contar estas reglas como beneficios de confianza y control, pero **no debe prometer pagos en línea, facturación electrónica ni automatizaciones que el producto no tiene**.

---

## 3. Audiencia, objetivos y conversión

### 3.1 Audiencia

| Prioridad | Audiencia | Qué busca |
|---|---|---|
| Primaria | Dueños, directores y administradores de escuelas o clubes de patinaje | Ordenar la operación, reducir trabajo manual y tomar decisiones con datos. |
| Secundaria | Profesores y contadores | Herramientas simples para su rol y menos reprocesos. |
| Terciaria | Patinadores y acudientes | Claridad sobre progreso, grupos, competencias y pagos. |
| Visitante | Persona que llega por búsqueda o referencia | Entender qué es Velora y cómo contactar. |

### 3.2 Objetivos de la página

1. Que un visitante entienda en menos de 10 segundos qué es Velora y a quién ayuda.
2. Que reconozca los módulos y las reglas de confianza (menores, privacidad, cartera, auditoría).
3. Que solicite una demo o deje un contacto.
4. Que un usuario existente encuentre el acceso a la aplicación.

### 3.3 Conversión

| Acción | Tipo | Destino |
|---|---|---|
| **Solicitar demo** | CTA principal | Sección `#contacto` con correo o WhatsApp confirmados |
| **Iniciar sesión** | CTA secundaria | Ruta de acceso de la aplicación (pendiente de definir; propuesta `/acceso`) |
| **Ver módulos** | CTA terciaria | Ancla `#modulos` |
| **Escribir por WhatsApp** | Contacto directo | Enlace `https://wa.me/...` (pendiente) |

Si se habilita analítica, los eventos mínimos serían: clic en demo, clic en iniciar sesión, apertura de FAQ y scroll al 75 %. La analítica debe ser privada por defecto y no usar cookies no esenciales sin consentimiento.

---

## 4. Supuestos y decisiones

1. **Velora es la marca de la plataforma**, no el nombre de una escuela concreta.
2. La landing es **pública**: no muestra datos reales de patinadores ni información privada de una escuela.
3. La landing tendrá **identidad visual propia**, definida con Impeccable. No reutiliza los componentes `ps-*` del design system interno, que están pensados para la aplicación de gestión.
4. Es una página **one-page en español (es-CO)**, con navegación por anclas. No requiere router en v1.
5. **No se publican precios del SaaS** hasta que exista una definición comercial. El CTA es solicitar demo o información.
6. El contacto se resuelve con enlaces directos (correo, WhatsApp o agenda). **No hay formulario con backend en v1.**
7. El CTA de acceso apunta a la ruta que defina M1. Mientras no exista, se deja documentado como pendiente y **no se publica un enlace roto**.
8. **No se inventan** testimonios, clientes, métricas de uso, premios ni certificaciones.
9. Las imágenes de menores de edad solo se usan con autorización expresa; se prefieren ilustraciones, siluetas o fotografías de adultos con licencia.
10. La analítica y los píxeles de terceros están **desactivados por defecto**.
11. Anchos de referencia: 375, 768, 1280 y 1440 px. Navegadores: últimas dos versiones de Chrome, Edge, Firefox y Safari.
12. El contenido vive en el código (sin CMS). Los cambios editoriales se hacen por PR.

---

## 5. Identidad visual con Impeccable

La identidad visual **no se define en esta spec**. Se construye con Impeccable y luego se implementa.

> Importante: `/impeccable init` **no crea la identidad visual ni escribe `DESIGN.md`**. Solo captura la verdad del producto en `PRODUCT.md`. La dirección visual se decide en el flujo de diseño (`new-work`/`shape`) y `DESIGN.md` se consolida al terminar la implementación, a partir de lo construido.

**Estado:** `code/frontend/PRODUCT.md` creado el 06/11/2026. `DESIGN.md` aún no existe; el siguiente paso es ejecutar el flujo de diseño (`shape`/`new-work`).

### 5.1 Flujo

1. Ejecutar `/impeccable init` en `code/frontend/` (recomendado) o donde `impeccable context` resuelva el `PRODUCT.md` del sitio, para que el contexto quede junto a la landing.
2. Alimentar el init con el contexto de las secciones 2, 3 y 4 de esta spec.
3. Revisar y corregir `PRODUCT.md`: plataforma `web`, usuarios, propósito, posicionamiento, restricciones, evidencia y accesibilidad.
4. Usar el flujo de diseño de Impeccable (`new-work`/`shape`) para elegir y comprometer la dirección visual. La dirección queda registrada en el *surface brief* de la landing.
5. Implementar la landing con esa dirección. Si el build es code-led, la ambición vive en el contrato de dirección; si es comp-led, el comp aprobado es el contrato visual. `DESIGN.md` se escribe al finalizar, desde el mundo construido.
6. Ejecutar `/impeccable critique` y `/impeccable audit`; corregir hallazgos P0 y P1 antes de entregar.

### 5.2 Entradas para la identidad

| Atributo | Dirección |
|---|---|
| Personalidad | Velocidad, precisión, confianza, cercanía y energía. |
| Tono | Profesional pero humano; claro y directo; orgulloso del deporte, sin ser agresivo. |
| Público | Decisores de escuelas y clubes; profesores, familias y patinadores. |
| Contexto visual | Pista, movimiento, disciplina, progreso y comunidad. |
| Evitar | Estética genérica de SaaS, gradientes morados, glassmorphism, ilustraciones isométricas genéricas, capturas falsas de dashboards, neón y clichés de «velocidad». |
| Requisitos | Debe funcionar en móvil, en un solo color y con contraste accesible. |

### 5.3 Entregables de `DESIGN.md`

`DESIGN.md` debe documentar, como mínimo:

- Logo o wordmark **Velora**, versiones y área de protección.
- Paleta de color con tokens semánticos y pares de contraste aprobados.
- Tipografía: familias, escala, pesos y usos.
- Espaciado, retícula, márgenes y breakpoints.
- Radios, bordes, sombras y elevación.
- Estilo de iconografía, ilustración y fotografía.
- Principios de movimiento y transiciones.
- Inventario de componentes: botones, enlaces, tarjetas, navegación, acordeón, campos y badges.
- Reglas responsive y de accesibilidad.
- Uso de marca en favicon, imagen social y metadatos.

### 5.4 Regla de implementación

Ningún color, tipografía, espaciado o sombra se escribe «a ojo» en el código. Todo sale de la dirección visual aprobada y, cuando exista, de los tokens de `DESIGN.md` exportados como variables CSS. Si falta un token o un componente, se resuelve en la dirección aprobada y se refleja en `DESIGN.md` al cierre; si `DESIGN.md` ya existe, se actualiza antes de implementarlo.

---

## 6. Arquitectura de la página

| # | Sección | Ancla | Objetivo | CTA |
|---|---|---|---|---|
| 1 | Header / navegación | — | Dar contexto, navegación y acceso | Iniciar sesión · Solicitar demo |
| 2 | Hero | `#inicio` | Explicar la propuesta de valor y captar la atención | Solicitar demo · Ver módulos |
| 3 | Franja de valor | — | Reforzar los beneficios principales | — |
| 4 | Problema / solución | `#problema` | Hacer evidente el costo de la gestión manual | Ver cómo funciona |
| 5 | Módulos | `#modulos` | Mostrar la cobertura funcional | Solicitar demo |
| 6 | Roles | `#roles` | Explicar que cada rol ve lo que necesita | Solicitar demo |
| 7 | Cómo funciona | `#como-funciona` | Reducir la percepción de complejidad | Solicitar demo |
| 8 | Confianza y privacidad | `#confianza` | Resolver objeciones sobre menores, pagos y datos | Leer FAQ |
| 9 | Preguntas frecuentes | `#faq` | Resolver dudas antes del contacto | Contactar |
| 10 | CTA final / contacto | `#contacto` | Convertir la visita en una conversación | Solicitar demo · Iniciar sesión |
| 11 | Footer | — | Cerrar la página y dar información legal y de contacto | Volver arriba |

### 6.1 Reglas de estructura

- El **hero debe contener** marca, titular, subtítulo, CTA principal, CTA secundario y visual. En móvil, el CTA principal debe ser visible sin depender de un scroll largo.
- La navegación debe usar **anclas reales** y mantener el foco visible.
- El orden de los encabezados debe ser semántico: un solo `h1`, luego `h2` por sección y `h3` dentro de cada bloque.
- No usar carruseles automáticos ni secciones que oculten contenido esencial.
- La página debe funcionar sin JavaScript para el contenido principal; el menú móvil y el acordeón deben tener alternativa accesible.

---

## 7. Especificación por sección

### 7.1 Header

- Logo **Velora** a la izquierda; enlace a `#inicio`.
- Navegación de escritorio: Módulos, Roles, Cómo funciona, Confianza, FAQ, Contacto.
- CTA secundaria «Iniciar sesión» y CTA principal «Solicitar demo».
- En móvil: menú accesible (botón con `aria-expanded`, foco gestionado) y los mismos enlaces.
- Opcional: cambiar el fondo del header al hacer scroll, sin perder legibilidad.
- Incluir un enlace «Saltar al contenido» para teclado.

### 7.2 Hero

- **Titular:** debe nombrar el beneficio y el contexto de patinaje. Propuesta: «La plataforma que pone a punto tu escuela de patinaje».
- **Subtítulo:** explicar en una frase qué se centraliza. Propuesta: «Patinadores, grupos, competencias, pagos y reportes en un solo lugar. Menos planillas, más tiempo para entrenar».
- **CTA principal:** «Solicitar demo» → `#contacto`.
- **CTA secundario:** «Ver módulos» → `#modulos`.
- **Visual:** fotografía o ilustración de patinaje de velocidad, pista o movimiento; también puede ser una composición abstracta. No usar capturas falsas del producto ni datos de patinadores reales.
- Debe incluir una línea de contexto: «Para escuelas y clubes de patinaje de velocidad».

### 7.3 Franja de valor

Tres o cuatro beneficios breves, por ejemplo:

- «Todo en una sola plataforma».
- «Cada rol ve solo lo que necesita».
- «Resultados, cartera y reportes al día».
- «Pensada para menores y familias».

Si se usan cifras, deben ser verificables. Si no hay datos, usar afirmaciones cualitativas, no métricas inventadas.

### 7.4 Problema / solución

- **Problema:** la gestión dispersa en planillas, mensajes y archivos hace perder tiempo y dificulta la trazabilidad.
- **Solución:** Velora centraliza la operación y aplica reglas de negocio de forma consistente.
- Presentación sugerida: dos columnas (antes / con Velora) o tres tarjetas de dolor con su respuesta.
- Evitar exageraciones como «elimina el 100 % del trabajo manual».

### 7.5 Módulos

- Seis tarjetas, una por módulo de la sección 2.1.
- Cada tarjeta: icono, nombre del módulo, una frase de beneficio y hasta tres capacidades concretas.
- Enlazar visualmente los módulos con el flujo de una escuela, no como una lista fría de funcionalidades.
- Debe quedar claro que los módulos comparten una misma plataforma y permisos.

### 7.6 Roles

- Mostrar los roles de la sección 2.2 con una frase de valor para cada uno.
- Formato sugerido: tarjetas o pestañas accesibles; no usar un carrusel automático.
- Incluir una nota de privacidad: «El acudiente solo ve a sus patinadores; el patinador solo ve sus propios datos».

### 7.7 Cómo funciona

Tres pasos:

1. **Configura tu escuela:** sedes, grupos, horarios y planes.
2. **Suma patinadores y familias:** fichas, niveles, categorías, autorizaciones y pólizas.
3. **Compite, cobra y decide:** inscripciones, tiempos, resultados, cartera y reportes.

Cada paso debe tener una frase y un apoyo visual sencillo; no convertir esta sección en un manual.

### 7.8 Confianza y privacidad

Debe responder a las objeciones más importantes de una escuela:

- Menores de edad con acudiente, autorización y póliza vigente.
- Permisos por rol y privacidad de los datos.
- Auditoría de cambios sensibles.
- Pagos registrados manualmente y trazables; sin promesas de pasarela en línea.
- Sin borrado físico de información con historial.
- Cartera con estados claros y bloqueo de inscripciones cuando corresponde.

Copy sugerido: «La confianza también se entrena».

### 7.9 Preguntas frecuentes

Incluir al menos estas preguntas:

1. ¿Velora sirve para escuelas de cualquier tamaño?
2. ¿Funciona en celular y tablet?
3. ¿Los acudientes pueden consultar a sus patinadores?
4. ¿Cómo se manejan los menores de edad y las pólizas?
5. ¿Se pueden hacer pagos en línea?
6. ¿Cómo se controla la cartera y el acceso a competencias?
7. ¿Cómo empiezo a usar Velora?

Las respuestas deben ser honestas y consistentes con las reglas de negocio. No prometer funciones fuera de alcance.

### 7.10 CTA final / contacto

- **Titular:** «Pon tu escuela a la velocidad de Velora».
- **Texto:** invitar a una conversación breve sobre la operación actual de la escuela.
- **CTA principal:** «Solicitar demo» con correo o WhatsApp confirmado.
- **CTA secundario:** «Iniciar sesión» (solo si la ruta existe).
- Si no hay datos de contacto confirmados, mostrar un bloque de contacto claramente marcado como pendiente; **no publicar datos falsos**.

### 7.11 Footer

- Logo o wordmark Velora.
- Descripción breve de una línea.
- Navegación principal.
- Contacto confirmado.
- Enlaces a Política de privacidad y Términos y condiciones (crear antes de publicar o marcar como pendientes).
- Copyright del año en curso.
- Redes sociales solo si existen y están confirmadas.

---

## 8. Contenido y datos

### 8.1 Fuente y estado del contenido

| Elemento | Fuente | Estado |
|---|---|---|
| Nombre de marca **Velora** | Indicación del usuario | Confirmado |
| Descripción del producto | `docs/CONTEXT.md` | Confirmado |
| Módulos y roles | `docs/CONTEXT.md`, `docs/REQUIREMENTS.md` | Confirmado |
| Reglas de negocio | `docs/CONTEXT.md` §4 | Confirmado |
| Precios del SaaS | No definidos | Fuera de alcance |
| Correo, teléfono y WhatsApp | No disponibles | Pendiente |
| Dominio y URL canónica | No disponibles | Pendiente |
| Redes sociales | No disponibles | Pendiente |
| Testimonios y métricas | No disponibles | No inventar |
| Logo, tipografía y paleta | Impeccable | Pendiente |
| Fotografías o ilustraciones | No disponibles | Pendiente; usar material con licencia |
| Política de privacidad y términos | No disponibles | Pendiente antes de publicar |

### 8.2 Copy propuesto (borrador)

| Elemento | Propuesta inicial |
|---|---|
| Título de página | `Velora · Gestión para escuelas de patinaje` |
| Meta description | `Centraliza patinadores, grupos, competencias, pagos y reportes en una sola plataforma pensada para escuelas de patinaje de velocidad.` |
| H1 | `La plataforma que pone a punto tu escuela de patinaje` |
| Subtítulo del hero | `Patinadores, grupos, competencias, pagos y reportes en un solo lugar. Menos planillas, más tiempo para entrenar.` |
| CTA principal | `Solicitar demo` |
| CTA secundaria | `Iniciar sesión` |
| Sección de módulos | `Todo lo que tu escuela necesita, en una sola pista` |
| Sección de roles | `Una plataforma, cada rol ve lo que necesita` |
| Sección de confianza | `La confianza también se entrena` |
| CTA final | `Pon tu escuela a la velocidad de Velora` |

El copy final debe revisarse con el equipo de Product Owners y con el responsable de negocio antes de publicar.

### 8.3 Reglas de contenido

- Español de Colombia, estilo oración y verbos claros.
- Sin `lorem ipsum` ni textos de relleno.
- No inventar testimonios, clientes, cifras, premios ni logos.
- No afirmar pagos en línea, facturación electrónica, IA ni automatizaciones que no existan.
- No mostrar datos reales de patinadores, acudientes o menores.
- Moneda en COP y fechas en `DD/MM/AAAA` cuando aparezcan.
- Los enlaces deben tener texto descriptivo; evitar «clic aquí».
- Los placeholders deben estar marcados como pendientes y no publicarse.

---

## 9. Requisitos técnicos

### 9.1 Ubicación y stack

- Implementación en `code/frontend/`.
- React 19 + TypeScript + Vite, con las dependencias existentes.
- No agregar librerías de UI, animación o íconos sin justificación y aprobación.
- No usar frameworks CSS externos ni fuentes desde CDN.
- Reemplazar el contenido del starter de Vite (`App.tsx`, `App.css`, `index.css` y assets por defecto) por la landing.
- Mantener `pnpm lint` y `pnpm build` en verde.

### 9.2 Estructura sugerida

```text
code/frontend/
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles/
│   │   ├── tokens.css          # tokens de la dirección visual
│   │   └── landing.css         # estilos de la landing
│   ├── components/
│   │   └── landing/            # Header, Hero, Modules, FAQ, Footer…
│   └── assets/
│       └── landing/            # imágenes, logo, íconos y fuentes
└── public/
    └── favicon.svg
```

La estructura puede ajustarse, pero debe mantener separados los tokens, los componentes y los assets.

### 9.3 Estilos y tokens

- Implementar los tokens de la dirección visual aprobada como variables CSS en `tokens.css`.
- Al cierre, documentarlos en `DESIGN.md` y mantener `tokens.css` sincronizado con esa documentación.
- Usar exclusivamente esos tokens para color, tipografía, espaciado, radios, sombras y movimiento.
- No escribir valores crudos en los componentes salvo casos justificados y documentados (por ejemplo, un breakpoint).
- No reutilizar las clases `ps-*` del design system interno en la landing.
- Evitar estilos en línea y `!important`.

### 9.4 Assets

- Logo en SVG; favicon y variante para fondo oscuro si aplica.
- Imágenes en WebP o AVIF, con `width` y `height` para evitar saltos de layout.
- Hero: cargar de forma prioritaria; imágenes bajo el pliegue: `loading="lazy"`.
- Iconos en SVG inline o sprite local; no icon fonts.
- Fuentes locales en `.woff2` con `font-display: swap` o pila del sistema.
- Optimizar el peso total; evitar videos de fondo y animaciones pesadas.

### 9.5 Navegación y CTAs

- Navegación por anclas con desplazamiento suave, respetando `prefers-reduced-motion`.
- Menú móvil accesible con foco y cierre con `Esc`.
- CTA de demo: enlace a `mailto:`, WhatsApp o agenda confirmados.
- CTA de acceso: ruta `/acceso` o la que defina M1. Si no existe, ocultar o marcar como pendiente; no dejar un enlace roto.
- Enlaces externos con `rel="noopener noreferrer"` cuando abran una pestaña nueva.

### 9.6 Contenido y datos

- Sin llamadas a API ni backend en v1.
- Sin formularios con envío real.
- Sin cookies no esenciales.
- Si más adelante se agrega un formulario, debe tener validación, protección antispam y aviso de privacidad.

---

## 10. Accesibilidad, SEO y rendimiento

### 10.1 Accesibilidad

- Objetivo: **WCAG 2.2 AA**.
- Contraste mínimo 4.5:1 para texto y 3:1 para componentes e íconos informativos.
- Navegación completa por teclado y foco visible.
- Enlace «Saltar al contenido».
- Un solo `h1`; jerarquía de encabezados sin saltos.
- Landmarks semánticos: `header`, `nav`, `main`, `section`, `footer`.
- Textos alternativos descriptivos; imágenes decorativas con `alt=""`.
- Formularios y controles con etiquetas visibles.
- Áreas táctiles de al menos 44 × 44 px en móvil.
- El estado nunca se comunica solo por color.
- Respetar `prefers-reduced-motion`.
- Acordeón de FAQ con `<details>` o botones con `aria-expanded` y control de teclado.

### 10.2 SEO

- `lang="es"` en `<html>`.
- Título único y descriptivo, idealmente ≤ 60 caracteres.
- Meta description ≤ 155 caracteres.
- Open Graph y Twitter Card con imagen 1200 × 630.
- URL canónica cuando exista dominio.
- `robots.txt` y `sitemap.xml` si el dominio está definido.
- HTML semántico y enlaces descriptivos.
- Un solo `h1` y contenido principal indexable sin JavaScript.
- JSON-LD `Organization` o `SoftwareApplication` solo con datos reales; sin valoraciones inventadas.

### 10.3 Rendimiento

Objetivos en móvil:

- LCP ≤ 2.5 s.
- CLS ≤ 0.1.
- INP ≤ 200 ms.
- Lighthouse Performance ≥ 90 y Accessibility ≥ 95.
- Sin errores en consola.
- Sin desplazamiento horizontal en 375, 768, 1280 y 1440 px.

---

## 11. Fases de trabajo

| Fase | Qué se hace | Salida |
|---|---|---|
| **F0 · Contexto e identidad** | Ejecutar `/impeccable init`, completar `PRODUCT.md` y definir la dirección visual con el flujo de diseño | `PRODUCT.md` y dirección visual aprobada |
| **F1 · Estructura y copy** | Validar arquitectura de secciones, copy y CTAs; listar assets y datos pendientes | Wireframe de baja fidelidad + copy deck |
| **F2 · Implementación** | Construir la landing en React con tokens, componentes y responsive | Landing funcional en local |
| **F3 · Contenido y assets** | Integrar logo, imágenes, contacto, legal y metadatos definitivos | Contenido completo |
| **F4 · Verificación** | Revisar 375/768/1280/1440, teclado, contraste, SEO y rendimiento; correr `/impeccable critique` y `/impeccable audit` | Hallazgos corregidos |
| **F5 · Publicación** | `pnpm lint`, `pnpm build`, revisión de PR y despliegue | Landing publicada |

No se implementa la landing antes de tener una dirección visual aprobada, salvo un esqueleto estructural sin estilos definitivos.

---

## 12. Definición de terminado

- [ ] La landing está en `/` y reemplaza el starter de Vite.
- [ ] Todas las secciones de §6 están presentes y con contenido real, sin placeholders publicados.
- [ ] El H1, subtítulo y CTA principal comunican qué es Velora y para quién es.
- [ ] La identidad visual sigue la dirección aprobada y queda reflejada en `DESIGN.md` al cierre; no hay colores, fuentes ni espaciados improvisados.
- [ ] El logo, favicon, imagen social y metadatos están integrados.
- [ ] La página se ve correctamente en 375, 768, 1280 y 1440 px, sin scroll horizontal.
- [ ] Navegación por teclado, foco visible, contraste y textos alternativos cumplen WCAG 2.2 AA.
- [ ] El menú móvil y el acordeón de FAQ son accesibles.
- [ ] Los CTAs funcionan: demo/contacto, acceso y anclas internas.
- [ ] No hay enlaces rotos, datos de contacto falsos ni testimonios inventados.
- [ ] No se muestran datos reales de patinadores ni información privada.
- [ ] No hay promesas de pagos en línea, facturación electrónica ni funciones fuera de alcance.
- [ ] `pnpm lint` y `pnpm build` pasan.
- [ ] `DESIGN.md` existe, corresponde a lo implementado y documenta tokens, componentes y decisiones visuales.
- [ ] `/impeccable critique` y `/impeccable audit` no dejan hallazgos P0 o P1 sin resolver.
- [ ] La PR fue revisada por un Product Owner y el pipeline de CI está en verde.

---

## 13. Riesgos y pendientes

| Riesgo o pendiente | Impacto | Mitigación |
|---|---|---|
| La identidad visual aún no existe | Bloquea la implementación visual | Ejecutar Impeccable antes de F2. |
| No hay datos de contacto, dominio ni redes | Bloquea CTAs y SEO | Definirlos antes de publicar; usar placeholders marcados. |
| No hay precios del SaaS | No se puede armar una sección de precios | Diferir; el CTA es solicitar demo. |
| No hay testimonios ni métricas reales | Riesgo de credibilidad si se inventan | Omitir o usar contenido cualitativo verificable. |
| La ruta de acceso no existe | CTA rota | Coordinar con M1; si no existe, ocultar o marcar pendiente. |
| Imágenes de menores | Riesgo legal y ético | Usar ilustraciones, adultos con licencia o autorización expresa. |
| La landing se vuelve demasiado larga | Baja conversión | Priorizar hero, beneficios, módulos y CTA; usar FAQ para el detalle. |
| Impeccable propone algo que no cumple accesibilidad o rendimiento | Mala calidad | Auditar y adaptar; la identidad no puede romper los requisitos. |
| El contenido se desalinea de los requisitos | Mensajes incorrectos | Validar con Product Owners y con `docs/CONTEXT.md`. |
| Se mezcla la identidad de la landing con el DS interno | Inconsistencia | Mantenerlos separados en v1; documentar cualquier unificación futura. |
| Se agrega alcance no previsto | Retraso | Respetar la lista de §14. |

---

## 14. Fuera de alcance

- Aplicación interna, módulos M1–M6, autenticación y permisos reales.
- Backend, API, base de datos, migraciones y envío de correos.
- Formulario de contacto con persistencia o CRM.
- Pasarela de pagos, cobros en línea y facturación electrónica.
- CMS, blog, documentación, centro de ayuda y multiidioma.
- Modo oscuro y temas alternativos.
- Analítica de terceros, píxeles publicitarios y cookies no esenciales.
- Precios, planes comerciales y checkout del SaaS.
- Testimonios, casos de éxito y métricas de clientes.
- Diseño de la aplicación interna o cambios al design system `ps-*`.

---

## 15. Referencias

- [`docs/CONTEXT.md`](../CONTEXT.md): contexto, actores, módulos y reglas de negocio.
- [`docs/REQUIREMENTS.md`](../REQUIREMENTS.md): requisitos funcionales y trazabilidad.
- [`code/frontend/PRODUCT.md`](../../code/frontend/PRODUCT.md): verdad de producto capturada con `/impeccable init`.
- [`code/frontend/`](../../code/frontend/): implementación actual del frontend.
- [Impeccable](https://impeccable.style/): guía de `init`, `PRODUCT.md`, `DESIGN.md`, `critique` y `audit`.
