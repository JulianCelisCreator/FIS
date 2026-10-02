# Spec: wireframes M1 · Usuarios y Acceso

| Campo | Valor |
|---|---|
| Estado | Borrador v0.1 |
| Fecha | 01/10/2026 |
| Módulo | M1 · Usuarios y Acceso |
| Grupo | 01 (ajustar `grupo-XX` si cambia) |
| Fuente RF | `docs/REQUIREMENTS.md` §3 M1 (12 RF) + `docs/Lista_De_Requerimientos_Final (1).pdf` §4.1 (3 RF origen) |
| DS vigente | Skill `patinaje-design-system` + `docs/specs/design-system.md` + `docs/example/login.html` |
| Guía de generación | `docs/EXPLANATION.md` (flujo §3, prompts §5, verificación §7) |
| Salida wireframes | `wireframes/grupo-01/<pagina>/` (una subcarpeta por pantalla de §4) |

## 1. Propósito y alcance

Generar los 6 wireframes de M1 con una sola IA (o varias sesiones de una página por sesión) sin que se rompa la coherencia visual ni de negocio.

**Incluye:** las 6 pantallas de §4, sus 6 prompts listos para pegar (§8, formato `EXPLANATION.md` §5.2), datos de ejemplo, estados, componentes de partida y criterios de aceptación visual.

**No incluye:** lógica de backend, permisos reales, definición de marca, componentes nuevos del DS, ni pantallas de otros módulos. Si falta un componente o token, se reporta como brecha (`EXPLANATION.md` §5.5), no se inventa.

## 2. Correspondencia de RF (lo que la IA debe saber)

`REQUIREMENTS.md` expande los 3 RF del PDF en 12 para poder prototipar. Esta es la trazabilidad oficial para M1:

| ID REQUIREMENTS | Nombre | Tipo | Actor REQUIREMENTS | Corresponde a PDF v1.0 |
|---|---|---|---|---|
| M1-01 | Registro de usuario | Formulario | Adm | Parte de RF-M1-01 (registro por rol) |
| M1-02 | Inicio de sesión de usuario | Formulario | Adm, Con, Fis, Prof, Pat, Acu | Parte de RF-M1-01 (autenticación por rol) |
| M1-03 | Cierre de sesión de usuario | Acción | todos autenticados | Derivado (necesario para prototipar sesión) |
| M1-04 | Verificación de correo electrónico | Formulario | Sis, usuario registrado | Derivado (necesario para cuentas reales) |
| M1-05 | Gestión de usuarios y cuentas | Formulario | Adm | Derivado (admin posterior al alta; ver punto abierto 7.1) |
| M1-06 | Gestión de roles de usuario | Acción | Adm | Derivado (cubre vacío de roles) |
| M1-07 | Control de acceso por rol | Automático | Sis, usuario autenticado | Implícito en RF-M1-01 ("solo opciones de su rol") |
| M1-08 | Recuperación y cambio de contraseña | Formulario | Usuario registrado | Derivado (necesario para credenciales) |
| M1-09 | Autorización del acudiente | Acción | Acu, Adm | Parte de RF-M1-02 (autorización menor) |
| M1-10 | Gestión de póliza del patinador | Formulario | Acu, Adm | Parte de RF-M1-02 (póliza vigente) |
| M1-11 | Vinculación de acudiente y patinador | Acción | Adm | Precondición de RF-M1-02 (menor identificado + vínculo) |
| M1-12 | Activación de cuenta de profesor | Automático | Prof, Adm, Sis | RF-M1-03 textual |

Puntos abiertos que condicionan los wireframes (REQUIREMENTS §7 + SKILL §6):

1. M1-01 dice `Adm` pero el PDF y `login.html` dicen autorregistro Pat/Acu/Prof/Vis. Supuesto vigente: **W01 es autorregistro público** para esos 4 roles; Administrador, Contador y Fisioterapeuta **no** tienen alta en W01 (solo los crea el Adm en W03). La IA no debe agregarlos al `Select` de rol.
2. Visitante solo ve información general, nunca datos de patinadores.
3. Menor bloqueado mientras falte autorización o póliza; el menor no confirma por sí mismo nada (grupo, plan, inscripción).
4. Sin borrado físico: verbos **Desactivar / Anular**, nunca **Eliminar**.
5. En `status-and-formats.md` la fila "Cuenta de profesor" cita M1-03 por errata; corresponde a M1-12. Usar `Por registrar` / `Cuenta activa`.

## 3. Datos de ejemplo (usar estos en todos los wireframes, sin lorem ipsum)

- Administradora: `Daniela Martínez`, `admin@escuela.com`, rol Administradora, cuenta Activa, correo Verificado.
- Profesor por activar: `Andrés Torres`, `andres.torres@example.com`, cuenta `Por registrar` → `Cuenta activa`.
- Profesora activa: `Laura Cubillos`, `laura.cubillos@example.com`, cuenta Activa.
- Acudiente: `Carolina Ramírez`, `carolina.ramirez@example.com`, cuenta Activa.
- Patinadora menor (9 años): `Sofía Ramírez`, vinculada a Carolina, perfil `Bloqueado` → `Habilitado`.
- Patinador mayor: `Juan Pablo González`, `juan.gonzalez@example.com`, cuenta Activa.
- Póliza ejemplo: aseguradora `Sura`, n.º `POL-882341`, vigente `01/01/2026` a `31/12/2026`.
- Fechas en `DD/MM/AAAA` (p. ej. `21/09/2026`). Moneda no aplica en M1; si aparece un valor usar `$ 85.000`.

## 4. Mapa pantallas × RF (cobertura 12/12)

| # | Página (carpeta) | RF que cubre | Actor que la ve | Tipo predominante |
|---|---|---|---|---|
| W01 | `acceso/` | M1-01, M1-02 | Visitante / no autenticado (Pat, Acu, Prof, Vis) | Formulario |
| W02 | `verificacion-recuperacion/` | M1-04, M1-08 | Usuario registrado / no autenticado | Formulario |
| W03 | `usuarios/` | M1-05 (core), M1-01 alta por Adm, M1-04 badge | Adm | Formulario + Consulta |
| W04 | `roles-acceso/` | M1-06, M1-07 | Adm (gestiona) + ejemplo denegado para Prof/Pat | Acción + Automático |
| W05 | `familia-menor/` | M1-11, M1-09, M1-10 | Adm + Acu | Acción + Formulario |
| W06 | `activacion-profesor/` | M1-12, M1-03, M1-07 transversal | Prof (primera vez) + Adm (crea y ve estado) | Automático + Acción |

M1-03 (cierre) y M1-07 (control por rol) además son transversales: aparecen como menú de usuario + `AppShell` con navegación por rol en W03–W06.

No se crean más pantallas. Una pantalla, una tarea (`EXPLANATION.md` §11).

## 5. Estados a cubrir (solo con `StatusBadge`, nunca color a mano)

| Entidad | Estados y tono |
|---|---|
| Correo electrónico | `Pendiente de verificación` (warning) · `Verificado` (success) |
| Cuenta de usuario | `Activa` (success) · `Desactivada` (neutral) |
| Cuenta de profesor | `Por registrar` (neutral) → `Cuenta activa` (success) |
| Perfil de patinador menor | `Bloqueado` (error, falta autorización o póliza) → `Habilitado` (success) |

Reglas: `Anulado/Cancelado` siempre neutral, `Rechazado` siempre error; estado siempre ícono + texto; copy en español estilo oración (`Al día`, `En validación`).

## 6. Plan de componentes aprobado (checkpoint 1 ya resuelto)

La IA no debe proponer otro plan; si ve una necesidad no cubierta, reporta brecha y se detiene en esa parte.

| Pantalla | Componentes |
|---|---|
| W01 | `AppShell` pública, `Tabs` (Ingresar / Registrarse), `FormField` + `TextInput` (email/password) + `Select` rol (solo Patinador, Acudiente, Profesor, Visitante), `Button primary lg` ancho completo, `Link` (recuperar). Sin `Breadcrumb`, sin `Alert` permanente, sin toasts demo. |
| W02 | `AppShell` pública, `Card`, `FormField` + `TextInput email`, `StatusBadge` correo, `Button primary`, `Alert info/success` contextual, `Link` volver al acceso. Dos bloques: verificar (código o enlace) y recuperar (solicitar → definir nueva con confirmación). |
| W03 | `AppShell` privada Adm, `Breadcrumb`, `DataTable` (nombre+`Avatar`, correo, rol, `StatusBadge` cuenta + correo, acciones por fila) + `FilterBar` (buscar, rol, estado) + `Pagination`, `Button primary` Crear, `Dialog/Form` crear/editar, `Dialog/Confirm` Desactivar (nunca Eliminar). Móvil: tabla → tarjetas. |
| W04 | `AppShell` privada Adm, `DataTable` roles (rol, n.º usuarios, descripción) + `Select` asignar rol + `Button secondary`, `DescriptionList` o matriz solo lectura de permisos (qué ve cada rol), ejemplo `Alert error` acceso denegado + `StatusBadge`. Sin edición de permisos en wireframe (solo asignación). |
| W05 | `AppShell` privada (Adm ve todo, Acu solo sus patinadores), `PlayerProfileCard compact` + `DescriptionList`, `Select searchable` vincular (M1-11), `Checkbox` autorización + fecha (M1-09), `FormField` + `TextInput`/`DateInput` póliza: aseguradora, número, vigencia (M1-10), `Button primary` Guardar, `StatusBadge` Bloqueado/Habilitado, `Stepper` o `RequestTracker` (Vinculado → Autorizado → Póliza → Habilitado). |
| W06 | `AppShell` privada, `Stepper` (Creada por Adm → Por registrar → Primer ingreso → Cuenta activa), `StatusBadge` profesor, `DataTable` o `Card` mínima de profesores por activar, menú de usuario + `Button secondary/ghost` Cerrar sesión, `Toast success` ("Sesión cerrada", "Cuenta activada"). |

Tokens: solo capa 2. Responsive obligatorio 375 + 1280, verificar 768. Controles `lg` en móvil, `md` en escritorio. Español, `Desactivar/Anular`, fechas `DD/MM/AAAA`.

## 7. Estructura de entrega y verificación

```text
wireframes/grupo-01/acceso/
wireframes/grupo-01/verificacion-recuperacion/
wireframes/grupo-01/usuarios/
wireframes/grupo-01/roles-acceso/
wireframes/grupo-01/familia-menor/
wireframes/grupo-01/activacion-profesor/
```

Cada carpeta: `<pagina>.html` + `<pagina>-movil.png` + captura escritorio + `README.md` (herramienta, decisiones, brechas). Enlazar `../../../design-system/ps.css` y `ps.js`, declarar `viewport`, sin `style=` ni valores literales, sin clases `ps-*` inventadas, sin Tailwind/Bootstrap, sin emojis como íconos.

Autoverificación por pantalla (`EXPLANATION.md` §7.1): solo catálogo + tokens capa 2; `StatusBadge` con entidad+estado válidos; verbos y formatos; etiquetas visibles y errores que dicen qué corregir; 375/768/1280 sin scroll horizontal; contenido realista §3; rol y privacidad correctos; RF citados.

## 8. Prompts listos para pegar (formato EXPLANATION.md §5.2)

> Instrucción de arranque (pegar una vez por sesión, §5.1): la IA debe leer `SKILL.md` + `docs/example/login.html`, usar solo `ps-*` existente y tokens capa 2, copiar marcado del catálogo, estados con `StatusBadge`, verbos Anular/Desactivar, español, contenido realista, 375+1280, reportar brecha si falta algo, y entregar primero el plan (en este proyecto el plan ya está en §6: debe respetarlo y solo pedir aprobación).
>
> Higiene: una página por sesión; no copiar estilo de otros wireframes; pegar solo la fila RF necesaria.

### W01 · Acceso (ingresar / crear cuenta)

```text
Página: Acceso            Módulo: M1     Grupo: 01
RF: M1-01 Registro de usuario (Adm, Formulario, depende de —) + M1-02 Inicio de sesión (Adm, Con, Fis, Prof, Pat, Acu, Formulario, depende de M1-01). Origen PDF: RF-M1-01 Registro y autenticación por rol (Pat, Acu, Prof, Vis). Criterio: rechaza correo duplicado; al entrar solo ve opciones de su rol. Restricción: Visitante sin datos de patinadores.
Actor que la ve: no autenticado que entra como Patinador, Acudiente, Profesor o Visitante.
Qué ve y qué NO ve ese actor (privacidad): AppShell pública sin navegación interna y sin ningún dato de patinadores. No ve gestión de usuarios, roles, pólizas ni pagos.
Objetivo de la pantalla en una frase: Entrar con correo y contraseña o crear su cuenta eligiendo rol.
Datos que muestra o captura, con ejemplos reales: Ingresar: sofia@example.com / ••••••••, Soy: Patinador. Registrarse: Nombre completo Sofía Ramírez, correo sofia@example.com, Me registro como: Acudiente, ayuda "Si registras a un menor de edad, necesitarás su autorización y su póliza vigente".
Estados a cubrir (de status-and-formats.md): ninguno permanente en esta pantalla; error solo tras intento fallido (correo duplicado, credenciales inválidas). No inventar badges.
Acción principal y acciones secundarias: principal Button primary lg "Ingresar" / "Crear cuenta" a ancho completo; secundaria Link "¿Olvidaste tu contraseña?" (va a W02).
Salida: wireframes/grupo-01/acceso/
Plan de componentes a respetar (§6 W01): AppShell pública, Tabs Ingresar/Registrarse, FormField+TextInput+Select (rol solo con las 4 opciones), Button primary lg, Link. Sin Breadcrumb, sin Alert permanente, sin toasts demo. Toma docs/example/login.html como estructura de referencia, no lo rediseñes.
Primero confirma que respetas este plan; luego genera.
```

### W02 · Verificación y recuperación

```text
Página: Verificación y recuperación            Módulo: M1     Grupo: 01
RF: M1-04 Verificación de correo (Sis + usuario, Formulario, depende de M1-01) + M1-08 Recuperación y cambio de contraseña (usuario registrado, Formulario, depende de M1-02 y M1-04). Criterio: cuenta no verificada limita el acceso; enlace/código de un solo uso; nueva contraseña con confirmación.
Actor que la ve: usuario registrado no autenticado (p. ej. Carolina Ramírez, carolina.ramirez@example.com).
Qué ve y qué NO ve ese actor (privacidad): solo su propio flujo de verificación/recuperación en AppShell pública. No ve datos de otros usuarios ni gestión.
Objetivo de la pantalla en una frase: Verificar su correo pendiente y poder recuperar su contraseña si la olvidó.
Datos que muestra o captura, con ejemplos reales: Aviso "Te enviamos un enlace a carolina.ramirez@example.com el 21/09/2026", campo Código de 6 dígitos, botón Reenviar; bloque Recuperar: correo, Nueva contraseña + Confirmar contraseña, ayuda "Mínimo 8 caracteres".
Estados a cubrir (de status-and-formats.md): correo Pendiente de verificación (warning) y Verificado (success) con StatusBadge; éxito con Alert success al verificar.
Acción principal y acciones secundarias: principal "Verificar correo" y "Guardar nueva contraseña"; secundarias "Reenviar enlace" (ghost) y "Volver al acceso" (Link).
Salida: wireframes/grupo-01/verificacion-recuperacion/
Plan de componentes a respetar (§6 W02): AppShell pública, Card, FormField+TextInput, StatusBadge correo, Button primary, Alert contextual, Link. 375 y 1280.
Primero confirma que respetas este plan; luego genera.
```

### W03 · Gestión de usuarios y cuentas

```text
Página: Usuarios            Módulo: M1     Grupo: 01
RF: M1-05 Gestión de usuarios y cuentas (Adm, Formulario, depende de M1-01 y M1-02; crea, consulta, actualiza, desactiva; exige correo único) + M1-01 alta por Adm + M1-04 badge de correo. Punto abierto 7.1: M1-01 es alta inicial, M1-05 es administración posterior.
Actor que la ve: Adm (Daniela Martínez, admin@escuela.com).
Qué ve y qué NO ve ese actor (privacidad): ve todos los usuarios. Los demás roles no ven esta pantalla (Contador sin gestión de usuarios por M6-03).
Objetivo de la pantalla en una frase: Encontrar un usuario, crear o editar su cuenta y desactivarla sin borrarla.
Datos que muestra o captura, con ejemplos reales: tabla con Sofía Ramírez (Patinadora, Activa, Verificado), Carolina Ramírez (Acudiente, Activa, Pendiente de verificación), Andrés Torres (Profesor, Por registrar), Laura Cubillos (Profesora, Activa); filtros por rol y estado; Dialog crear: nombre, correo, rol, estado inicial Activa.
Estados a cubrir (de status-and-formats.md): cuenta Activa (success) / Desactivada (neutral); correo Pendiente de verificación (warning) / Verificado (success); profesor Por registrar (neutral). Todo con StatusBadge.
Acción principal y acciones secundarias: principal "Crear usuario" (Button primary); por fila Editar y Desactivar (Confirm, verbo Desactivar, nunca Eliminar); secundaria Filtrar/Limpiar filtros.
Salida: wireframes/grupo-01/usuarios/
Plan de componentes a respetar (§6 W03): AppShell privada Adm, Breadcrumb, DataTable+FilterBar+Pagination, StatusBadge, Dialog/Form, Dialog/Confirm, Avatar. Móvil: tarjetas sin scroll horizontal.
Primero confirma que respetas este plan; luego genera.
```

### W04 · Roles y acceso

```text
Página: Roles y acceso            Módulo: M1     Grupo: 01
RF: M1-06 Gestión de roles (Adm, Acción, depende de M1-02 y M1-05; asignar/cambiar rol) + M1-07 Control de acceso por rol (Sis, Automático; la UI solo muestra resultado: ve lo de su rol o denegado).
Actor que la ve: Adm gestiona (Daniela Martínez); se muestra además un ejemplo de denegado para Profesor/Patinador.
Qué ve y qué NO ve ese actor (privacidad): Adm ve matriz de roles y puede asignar. Profesor solo ve sus grupos; Patinador solo sus datos; Contador solo finanzas (sin usuarios/grupos/inventario); Visitante nada interno. El wireframe debe evidenciar un caso denegado.
Objetivo de la pantalla en una frase: Asignar el rol correcto a cada usuario y dejar visible qué puede ver cada rol.
Datos que muestra o captura, con ejemplos reales: roles Administrador, Profesor, Patinador, Acudiente, Contador, Fisioterapeuta, Visitante con n.º usuarios (p. ej. Profesor 6); asignar a Andrés Torres rol Profesor; matriz solo lectura (p. ej. Contador: pagos sí, usuarios no); ejemplo denegado "No tienes acceso a Gestión de usuarios".
Estados a cubrir (de status-and-formats.md): sin badge de dominio aquí; el estado es el resultado del control: contenido visible vs Alert error de denegado. No colorear roles con tonos de estado.
Acción principal y acciones secundarias: principal "Asignar rol" (Select + Button secondary); secundaria "Quitar rol" solo con Confirm si aplica; ejemplo denegado sin acción destructiva.
Salida: wireframes/grupo-01/roles-acceso/
Plan de componentes a respetar (§6 W04): AppShell privada, DataTable roles, Select asignación, DescriptionList matriz, Alert error denegado, StatusBadge donde aplique. Sin crear permisos nuevos en el wireframe.
Primero confirma que respetas este plan; luego genera.
```

### W05 · Familia del menor (vinculación, autorización y póliza)

```text
Página: Familia del menor            Módulo: M1     Grupo: 01
RF: M1-11 Vinculación de acudiente y patinador (Adm, Acción, depende de M1-01) + M1-09 Autorización del acudiente (Acu+Adm, Acción, depende de M1-10 y M1-11; bloquea perfil si falta) + M1-10 Gestión de póliza (Acu+Adm, Formulario, depende de M1-01 y M1-11; póliza vigente obligatoria). Origen PDF: RF-M1-02. Criterio: mayor de edad se habilita sin esto.
Actor que la ve: Adm (gestiona todo) y Acu (Carolina Ramírez solo ve a sus patinadores, p. ej. Sofía Ramírez).
Qué ve y qué NO ve ese actor (privacidad): Acu solo sus patinadores asociados; nunca ve otros menores ni gestión de usuarios. Patinador menor no confirma por sí mismo. Profesor no gestiona esto.
Objetivo de la pantalla en una frase: Vincular a Sofía con Carolina, registrar su autorización y su póliza para desbloquear su perfil.
Datos que muestra o captura, con ejemplos reales: vínculo Sofía Ramírez (9 años) ↔ Carolina Ramírez (madre, carolina.ramirez@example.com); autorización Checkbox "Autorizo la participación de Sofía Ramírez" + fecha 21/09/2026; póliza Sura POL-882341 vigente 01/01/2026 a 31/12/2026, adjunto póliza.pdf.
Estados a cubrir (de status-and-formats.md): perfil del menor Bloqueado (error) mientras falte autorización o póliza → Habilitado (success) cuando ambas están. Con StatusBadge + Stepper Vinculado → Autorizado → Póliza → Habilitado.
Acción principal y acciones secundarias: principal "Guardar" / "Vincular"; secundarias "Desvincular" (Confirm) y "Reemplazar póliza". Sin Eliminar.
Salida: wireframes/grupo-01/familia-menor/
Plan de componentes a respetar (§6 W05): AppShell privada, PlayerProfileCard compact + DescriptionList, Select searchable vincular, Checkbox autorización, FormField+TextInput+DateInput póliza, Button primary, StatusBadge, Stepper/RequestTracker. Acu ve variante solo lectura salvo sus campos.
Primero confirma que respetas este plan; luego genera.
```

### W06 · Activación de profesor y cierre de sesión

```text
Página: Activación de profesor            Módulo: M1     Grupo: 01
RF: M1-12 Activación de cuenta de profesor (Prof+Adm+Sis, Automático Media, depende de M1-02, M1-05, M1-07, M1-08; Por registrar → Cuenta activa en primer ingreso, una sola vez) + M1-03 Cierre de sesión (todos, Acción) + M1-07 transversal. Origen PDF: RF-M1-03 (no permite gestión mientras está Por registrar).
Actor que la ve: Prof nuevo (Andrés Torres, andres.torres@example.com) en primer ingreso + Adm que creó la cuenta y ve el estado.
Qué ve y qué NO ve ese actor (privacidad): Prof Por registrar no ve gestión (usuarios, planes, resultados); tras activarse ve solo sus grupos y patinadores. Cierre disponible en menú de usuario en todas las pantallas privadas.
Objetivo de la pantalla en una frase: Mostrar que la cuenta se activa sola al primer ingreso y que cerrar sesión es explícito y confirma.
Datos que muestra o captura, con ejemplos reales: tarjeta Andrés Torres, Profesor, Por registrar creado por admin@escuela.com el 20/09/2026; al ingresar 21/09/2026 pasa a Cuenta activa; menú usuario "Andrés Torres · Profesor" con opción "Cerrar sesión"; Toast "Sesión cerrada" / "Cuenta activada".
Estados a cubrir (de status-and-formats.md): cuenta de profesor Por registrar (neutral) y Cuenta activa (success) con StatusBadge; Stepper Creada → Por registrar → Primer ingreso → Cuenta activa.
Acción principal y acciones secundarias: principal primer "Ingresar" que dispara activación automática (sin botón manual de activar); secundaria "Cerrar sesión" (ghost/secondary) con confirmación simple, sin motivo.
Salida: wireframes/grupo-01/activacion-profesor/
Plan de componentes a respetar (§6 W06): AppShell privada, Stepper, StatusBadge, Card mínima o DataTable de por activar, menú usuario + Button cerrar, Toast success. Sin activar manualmente.
Primero confirma que respetas este plan; luego genera.
```

## 9. Brechas previsibles (no bloquear; reportar según §5.5)

- `Select searchable` de usuarios en W05 si el catálogo aún no lo tiene: usar `Select single` nativo y nota "Temporal".
- `RequestTracker` para menor si no existe: usar `Stepper` + `StatusBadge`.
- Bandeja de notificaciones, gestión de sanciones y revisión de póliza por Fisioterapeuta no tienen RF propio: no dibujar; el resultado se muestra con `ValidationChecklist`/badge en M4.

## 10. Definición de terminado de esta spec

- [ ] Cubre los 12 RF de REQUIREMENTS M1 (matriz §4 sin huecos).
- [ ] Cada prompt sigue EXPLANATION §5.2 (página, RF con fila, actor, privacidad, objetivo, datos reales, estados, acciones, salida, pide plan primero).
- [ ] Nombres de carpeta en minúsculas sin tildes; datos y estados del dominio correctos; verbos Anular/Desactivar.
- [ ] Plan §6 usa solo componentes y tokens existentes; responsive 375/1280 + 768 exigido.
