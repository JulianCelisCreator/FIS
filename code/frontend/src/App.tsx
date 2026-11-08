import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'

const navLinks = [
  { href: '#pista', label: 'Módulos' },
  { href: '#roles', label: 'Roles' },
  { href: '#reglas', label: 'Reglas' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#faq', label: 'Preguntas' },
]

const sessionRows = [
  {
    lane: '01',
    name: 'Valentina Ríos',
    time: '00:48.312',
    status: 'Póliza vigente',
  },
  {
    lane: '02',
    name: 'Samuel Cárdenas',
    time: '00:51.087',
    status: 'Cartera al día',
  },
  {
    lane: '03',
    name: 'Laura Gómez',
    time: '00:49.904',
    status: 'Autorización OK',
  },
  {
    lane: '04',
    name: 'Martín Salazar',
    time: '00:52.740',
    status: 'Revisar póliza',
  },
]

const splits = [
  { distance: '200 m', time: '00:19.740' },
  { distance: '300 m', time: '00:30.120' },
  { distance: '500 m', time: '00:48.312' },
]

const measurements = [
  {
    value: 'MM:SS.mmm',
    label: 'Tiempos y parciales',
    text: 'Cada prueba queda registrada al milisegundo.',
  },
  {
    value: '90%',
    label: 'Alerta de aforo',
    text: 'El grupo avisa antes de llegar al cupo.',
  },
  {
    value: '03',
    label: 'Estados de cartera',
    text: 'Al día, pendiente y vencido, sin ambigüedad.',
  },
  {
    value: '04',
    label: 'Validaciones',
    text: 'Póliza, cartera, autorización y sanción.',
  },
]

const compareRows = [
  ['Los tiempos viven en hojas distintas', 'Un historial por patinador, con pruebas y marcas.'],
  ['La inscripción depende de mensajes', 'Cuatro validaciones automáticas antes de competir.'],
  ['Los cupos se descubren al llenarse', 'Aforo por grupo, alerta al 90% y calendario.'],
  ['La cartera se revisa a fin de mes', 'Estado al día, pendiente o vencido en todo momento.'],
  ['Los reportes se arman a mano', 'Datos ordenados para decidir durante la temporada.'],
]

const modules = [
  {
    code: 'M1',
    name: 'Usuarios y acceso',
    metric: '06 roles',
    description: 'Cada rol entra a su carril y ve solo lo que le corresponde.',
    items: ['Autenticación por rol', 'Autorización de menores', 'Activación de profesores'],
    note: 'Permisos',
  },
  {
    code: 'M2',
    name: 'Gestión deportiva',
    metric: 'Nivel + categoría',
    description: 'El progreso de cada patinador deja historial, no memoria.',
    items: ['Ficha por patinador', 'Niveles y categorías', 'Evaluación e historial'],
    note: 'Progreso',
  },
  {
    code: 'M3',
    name: 'Grupos y horarios',
    metric: '90% aforo',
    description: 'Sedes, cupos y horarios bajo control, sin cruces.',
    items: ['Sedes y grupos', 'Aforo con alerta al 90%', 'Cambios y calendario'],
    note: 'Ocupación',
  },
  {
    code: 'M4',
    name: 'Competencias',
    metric: 'MM:SS.mmm',
    description: 'Inscripciones validadas, tiempos, resultados y récords.',
    items: ['Inscripción con 4 validaciones', 'Tiempos y resultados', 'Rankings y récords'],
    note: 'Resultados',
  },
  {
    code: 'M5',
    name: 'Planes y pagos',
    metric: '03 estados',
    description: 'La cartera al día, con pagos manuales y trazables.',
    items: ['Planes y tarifas', 'Pagos manuales', 'Cartera y comprobantes'],
    note: 'Cartera',
  },
  {
    code: 'M6',
    name: 'Administración',
    metric: 'COP',
    description: 'Reportes y control para decidir durante la temporada.',
    items: ['Panel general', 'Personal y reportes', 'Uniformes y préstamos'],
    note: 'Control',
  },
]

const roles = [
  {
    role: 'Administrador',
    pole: '01',
    note: 'Opera toda la escuela: deporte, finanzas, usuarios y reportes.',
    sport: 'Gestiona',
    money: 'Gestiona',
    users: 'Gestiona',
    sportState: 'yes',
    moneyState: 'yes',
    usersState: 'yes',
  },
  {
    role: 'Profesor',
    pole: '02',
    note: 'Entrena, evalúa y propone cambios de categoría.',
    sport: 'Gestiona',
    money: 'No',
    users: 'No',
    sportState: 'yes',
    moneyState: 'no',
    usersState: 'no',
  },
  {
    role: 'Contador',
    pole: '03',
    note: 'Pagos y reportes; no modifica usuarios ni grupos.',
    sport: 'Consulta',
    money: 'Gestiona',
    users: 'No',
    sportState: 'own',
    moneyState: 'yes',
    usersState: 'no',
  },
  {
    role: 'Patinador',
    pole: '04',
    note: 'Gestiona por sí mismo solo si es mayor de edad.',
    sport: 'Propio',
    money: 'Propio',
    users: 'No',
    sportState: 'own',
    moneyState: 'own',
    usersState: 'no',
  },
  {
    role: 'Acudiente',
    pole: '05',
    note: 'Autoriza, paga y consulta solo a sus patinadores.',
    sport: 'Asociados',
    money: 'Asociados',
    users: 'No',
    sportState: 'own',
    moneyState: 'own',
    usersState: 'no',
  },
  {
    role: 'Fisioterapeuta',
    pole: '06',
    note: 'Interviene únicamente en la póliza médica.',
    sport: 'Valida póliza',
    money: 'No',
    users: 'No',
    sportState: 'own',
    moneyState: 'no',
    usersState: 'no',
  },
] as const

const rules = [
  {
    title: 'Póliza vigente',
    text: 'Los menores necesitan póliza médica vigente para inscribirse.',
    flag: 'Valida',
  },
  {
    title: 'Cartera al día',
    text: 'Una cartera vencida bloquea la inscripción a competencias.',
    flag: 'Control',
  },
  {
    title: 'Autorización del acudiente',
    text: 'El acudiente autoriza y paga por el patinador menor.',
    flag: 'Firma',
  },
  {
    title: 'Sin sanción',
    text: 'Una sanción activa impide la inscripción.',
    flag: 'Revisa',
  },
]

const steps = [
  { title: 'Inscribe', text: 'Ficha, grupo y plan. El sistema revisa los requisitos.' },
  { title: 'Valida', text: 'Póliza, cartera, autorización y sanción.' },
  { title: 'Compite', text: 'Inscripción aprobada, tiempos, resultados y ranking.' },
  { title: 'Cobra y reporta', text: 'Pagos manuales, cartera y reportes de temporada.' },
]

const faqs = [
  {
    question: '¿Velora sirve para escuelas de cualquier tamaño?',
    answer:
      'Sí. La estructura por sedes, grupos y roles permite operar una escuela pequeña o un club con varias sedes y equipos.',
  },
  {
    question: '¿Funciona en celular y tablet?',
    answer:
      'Sí, desde el navegador. No hay app nativa; la información se adapta a pantallas pequeñas para consultar grupos, resultados y cartera sin depender de un computador.',
  },
  {
    question: '¿Los acudientes pueden consultar a sus patinadores?',
    answer:
      'Sí, pero solo a los que tienen asociados. El acudiente autoriza, paga y consulta; no ve datos de otros patinadores.',
  },
  {
    question: '¿Cómo se manejan los menores de edad y las pólizas?',
    answer:
      'Los menores requieren acudiente asociado, autorización y póliza médica vigente. La inscripción a competencias no se ratifica sin esos requisitos.',
  },
  {
    question: '¿Se pueden hacer pagos en línea?',
    answer:
      'No. Los pagos se registran manualmente y se corrigen anulando con motivo. No hay pasarela de pago ni facturación electrónica.',
  },
  {
    question: '¿Cómo se controla la cartera y el acceso a competencias?',
    answer:
      'La cartera tiene tres estados: al día, pendiente y vencido. Una cartera vencida bloquea la inscripción a competencias.',
  },
  {
    question: '¿Velora mide los tiempos en vivo?',
    answer:
      'No. Velora registra los tiempos de competencia, calcula resultados, rankings y récords; no reemplaza un sistema de cronometraje en vivo.',
  },
  {
    question: '¿Los datos de esta página son reales?',
    answer:
      'No. Las tablas y los tiempos son datos de muestra para explicar el producto. No hay datos de patinadores reales.',
  },
  {
    question: '¿Cómo empiezo a usar Velora?',
    answer:
      'Solicita una demo. Estamos preparando el canal de contacto y no publicamos correos ni números que no existan.',
  },
]

function BrandMark() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect x="5" y="9" width="30" height="22" rx="11" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <rect
        x="10"
        y="14"
        width="20"
        height="12"
        rx="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity=".45"
      />
      <path d="M20 9v22" stroke="var(--signal)" strokeWidth="2.2" />
      <path d="M5 20h30" stroke="currentColor" strokeWidth="1" opacity=".35" />
    </svg>
  )
}

function TrackField() {
  return (
    <svg
      className="track-field"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id="track-checker" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#f7f9ff" />
          <rect x="10" y="10" width="10" height="10" fill="#f7f9ff" />
          <rect x="10" width="10" height="10" fill="#061b52" />
          <rect y="10" width="10" height="10" fill="#061b52" />
        </pattern>
      </defs>
      <g transform="rotate(-10 860 510)">
        <rect
          className="track-field__lane track-field__lane--outer"
          x="220"
          y="150"
          width="1240"
          height="720"
          rx="360"
        />
        <rect
          className="track-field__lane track-field__lane--dash"
          x="246"
          y="176"
          width="1188"
          height="668"
          rx="334"
        />
        <rect
          className="track-field__lane track-field__lane--dash"
          x="272"
          y="202"
          width="1136"
          height="616"
          rx="308"
        />
        <rect
          className="track-field__lane track-field__lane--dash"
          x="298"
          y="228"
          width="1084"
          height="564"
          rx="282"
        />
        <rect
          className="track-field__lane track-field__lane--dash"
          x="324"
          y="254"
          width="1032"
          height="512"
          rx="256"
        />
        <rect
          className="track-field__lane track-field__lane--inner"
          x="350"
          y="280"
          width="980"
          height="460"
          rx="230"
        />
        <rect
          className="track-field__start"
          x="220"
          y="490"
          width="360"
          height="40"
          fill="url(#track-checker)"
        />
        <line className="track-field__start-line" x1="220" y1="510" x2="580" y2="510" />
        <g className="track-field__ticks">
          {[620, 700, 780, 860, 940, 1020].map((x) => (
            <line key={`top-${x}`} x1={x} y1="150" x2={x} y2="128" />
          ))}
          {[620, 700, 780, 860, 940, 1020].map((x) => (
            <line key={`bottom-${x}`} x1={x} y1="870" x2={x} y2="892" />
          ))}
        </g>
        <path
          id="track-runner-path"
          className="track-field__path"
          d="M 580 150 L 1100 150 A 360 360 0 0 1 1100 870 L 580 870 A 360 360 0 0 1 580 150 Z"
        />
        <circle className="track-field__runner" r="7">
          <animateMotion dur="18s" repeatCount="indefinite" rotate="auto">
            <mpath href="#track-runner-path" />
          </animateMotion>
        </circle>
        <circle className="track-field__runner-ring" r="18">
          <animateMotion dur="18s" repeatCount="indefinite" rotate="auto">
            <mpath href="#track-runner-path" />
          </animateMotion>
        </circle>
      </g>
    </svg>
  )
}

function SkaterMark() {
  return (
    <svg className="skater-mark" viewBox="0 0 260 320" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="186" cy="54" r="20" />
        <path d="M170 70 C 158 88, 140 100, 112 110" />
        <path d="M112 110 C 92 122, 76 144, 66 174" />
        <path d="M112 110 C 136 128, 156 158, 168 192" />
        <path d="M66 174 C 50 208, 44 238, 42 262" />
        <path d="M168 192 C 186 218, 200 240, 208 262" />
        <path d="M172 84 C 198 92, 222 102, 242 116" />
        <path d="M164 90 C 138 96, 112 94, 88 84" />
        <path d="M18 278 H 78" />
        <path d="M186 278 H 246" />
        <circle cx="28" cy="288" r="5" />
        <circle cx="44" cy="288" r="5" />
        <circle cx="60" cy="288" r="5" />
        <circle cx="76" cy="288" r="5" />
        <circle cx="196" cy="288" r="5" />
        <circle cx="212" cy="288" r="5" />
        <circle cx="228" cy="288" r="5" />
        <circle cx="244" cy="288" r="5" />
        <path d="M170 42 C 178 34, 190 34, 198 42" stroke="var(--signal)" />
      </g>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="m3 3 10 10M13 3 3 13" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  )
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const menuButton = useRef<HTMLButtonElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const demoDialog = useRef<HTMLDialogElement>(null)
  const accessDialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0)
    }

    const onScroll = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(update)
      }
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [])

  useEffect(() => {
    const query = window.matchMedia('(min-width: 981px)')
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMenuOpen(false)
      }
    }

    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const nav = navRef.current
    const focusables = Array.from(nav?.querySelectorAll<HTMLElement>('a, button') ?? [])
    focusables[0]?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButton.current?.focus()
        return
      }

      if (event.key !== 'Tab' || focusables.length === 0) {
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  const openDialog = (dialog: HTMLDialogElement | null) => {
    setMenuOpen(false)
    dialog?.showModal()
  }

  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      event.currentTarget.close()
    }
  }

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <div className="page">
        <header className="masthead">
          <div className="masthead__inner">
            <a className="brand" href="#inicio" aria-label="Velora, volver al inicio" onClick={closeMenu}>
              <span className="brand__mark">
                <BrandMark />
              </span>
              <span className="brand__type">
                <span className="brand__word">VELORA</span>
                <span className="brand__tag">control de pista</span>
              </span>
            </a>

            <nav
              ref={navRef}
              id="primary-nav"
              className={`nav${menuOpen ? ' nav--open' : ''}`}
              aria-label="Principal"
            >
              <div className="nav__links">
                {navLinks.map((link, index) => (
                  <a key={link.href} href={link.href} onClick={closeMenu}>
                    <span className="nav__num" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="nav__actions">
                <button type="button" className="button button--ghost" onClick={() => openDialog(accessDialog.current)}>
                  Acceso
                </button>
                <button type="button" className="button button--primary" onClick={() => openDialog(demoDialog.current)}>
                  Solicitar demo
                </button>
              </div>
            </nav>

            <div className="masthead__actions">
              <button type="button" className="text-button" onClick={() => openDialog(accessDialog.current)}>
                Acceso
              </button>
              <button type="button" className="button button--primary" onClick={() => openDialog(demoDialog.current)}>
                Solicitar demo
              </button>
            </div>

            <button
              ref={menuButton}
              type="button"
              className={`menu-toggle${menuOpen ? ' menu-toggle--open' : ''}`}
              aria-controls="primary-nav"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="menu-toggle__lines" aria-hidden="true" />
              <span className="menu-toggle__label">{menuOpen ? 'Cerrar' : 'Menú'}</span>
            </button>
          </div>

          <div className="masthead__progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${progress})` }} />
          </div>
        </header>

        <main id="contenido">
          <section className="hero" id="inicio" aria-labelledby="hero-title">
            <div className="hero__field">
              <TrackField />
            </div>
            <span className="hero__start" aria-hidden="true">
              salida / 500 m
            </span>

            <div className="hero__inner">
              <div className="hero__copy">
                <h1 id="hero-title">
                  La pista <span>no miente.</span>
                </h1>
                <p className="hero__lede">
                  Cada tiempo, cada cupo y cada pago dejan rastro. Velora convierte la operación de tu escuela de
                  patinaje en métricas que puedes leer, comparar y corregir.
                </p>
                <div className="hero__actions">
                  <button type="button" className="button button--primary" onClick={() => openDialog(demoDialog.current)}>
                    Solicitar demo
                  </button>
                  <a className="button button--ghost" href="#pista">
                    Ver la pista
                  </a>
                </div>
              </div>

              <aside className="hero__board" aria-labelledby="board-title">
                <div className="timing-board">
                  <div className="timing-board__head">
                    <h2 className="timing-board__label" id="board-title">
                      Control de pista
                    </h2>
                    <span className="timing-board__sample">Datos de muestra</span>
                  </div>
                  <div className="timing-board__main">
                    <div className="timing-board__event">
                      <span className="timing-board__event-label">Sesión 03 · 500 m</span>
                      <strong>
                        00:48<span>.312</span>
                      </strong>
                      <p>Parcial registrado · Valentina Ríos · Juvenil</p>
                    </div>
                    <div className="timing-board__splits" role="group" aria-label="Parciales de muestra">
                      {splits.map((split) => (
                        <div key={split.distance}>
                          <span>{split.distance}</span>
                          <strong>{split.time}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="timing-board__lanes">
                    {sessionRows.map((row) => (
                      <div className="timing-board__lane" key={row.name}>
                        <span className="timing-board__lane-num">{row.lane}</span>
                        <span className="timing-board__lane-name">
                          {row.name}
                          <small>{row.status}</small>
                        </span>
                        <time>{row.time}</time>
                      </div>
                    ))}
                  </div>
                  <div className="timing-board__foot">
                    <span>Validaciones de sesión</span>
                    <span className="timing-board__pips" aria-hidden="true">
                      {[0, 1, 2, 3].map((index) => (
                        <i key={index} className={index < 3 ? 'is-on' : ''} />
                      ))}
                    </span>
                    <span>03 / 04</span>
                  </div>
                </div>
              </aside>
            </div>

            <div className="hero__rail" aria-hidden="true">
              <span>Pista 2 · 07:00</span>
              <span>Escuela / club</span>
              <span>Temporada 2026</span>
              <span>Datos simulados</span>
            </div>
          </section>

          <section className="measurements" aria-labelledby="measurements-title">
            <div className="measurements__inner">
              <div className="measurements__head">
                <h2 id="measurements-title">Lo que se mide</h2>
                <p>Señales del producto, no métricas de clientes.</p>
              </div>
              <div className="measurements__grid">
                {measurements.map((measurement) => (
                  <div className="measurement" key={measurement.label}>
                    <span className="measurement__value">{measurement.value}</span>
                    <span className="measurement__label">{measurement.label}</span>
                    <p>{measurement.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="section section--ice" id="problema" aria-labelledby="problema-title">
            <div className="section__inner">
              <div className="section__head">
                <h2 id="problema-title">Lo que no se mide, se pierde.</h2>
                <p>
                  Cuando los tiempos viven en una hoja, los cupos en un chat y los pagos en un cuaderno, la escuela
                  compite contra su propia desorganización. Velora pone todo en la misma pista.
                </p>
              </div>

              <div className="split-board">
                <div className="split-board__head" aria-hidden="true">
                  <span />
                  <span>Operación hoy</span>
                  <span />
                  <span>En Velora</span>
                </div>
                {compareRows.map(([before, after], index) => (
                  <div className="split-row" key={before}>
                    <span className="split-row__num" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="split-row__before">
                      <span className="sr-only">Hoy: </span>
                      {before}
                    </span>
                    <span className="split-row__marker" aria-hidden="true" />
                    <span className="split-row__after">
                      <span className="sr-only">Con Velora: </span>
                      {after}
                    </span>
                  </div>
                ))}
              </div>

              <div className="problem-note">
                <SkaterMark />
                <blockquote>
                  <p>La planilla no es el enemigo. El problema es no poder ver qué está pasando con los datos que ya tienes.</p>
                  <small>Velora · control de pista</small>
                </blockquote>
              </div>
            </div>
          </section>

          <section className="section section--rink" id="pista" aria-labelledby="pista-title">
            <div className="section__inner">
              <div className="section__head section__head--wide">
                <h2 id="pista-title">Seis carriles. Una sola pista.</h2>
                <p>
                  Los seis módulos comparten datos, permisos y reglas. No son funciones aisladas: son parciales del
                  mismo recorrido.
                </p>
                <span className="section__data" aria-hidden="true">
                  M1 — M6
                </span>
              </div>

              <ol className="lanes">
                {modules.map((module) => (
                  <li className="lane" key={module.code}>
                    <div className="lane__index">
                      <span className="lane__code">{module.code}</span>
                      <span className="lane__metric">{module.metric}</span>
                    </div>
                    <div className="lane__body">
                      <h3>{module.name}</h3>
                      <p>{module.description}</p>
                      <ul className="lane__caps">
                        {module.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <span className="lane__note">{module.note}</span>
                  </li>
                ))}
              </ol>

              <div className="lanes__foot">
                <span className="lanes__stamp">Una sola verdad</span>
                <p>
                  Lo que cambia en un carril se refleja en los demás: el mismo patinador, la misma cartera, la misma
                  pista.
                </p>
              </div>
            </div>
          </section>

          <section className="section section--chalk" id="roles" aria-labelledby="roles-title">
            <div className="section__inner">
              <div className="section__head">
                <h2 id="roles-title">Cada rol corre en su carril.</h2>
                <p>
                  La privacidad está en la parrilla: cada rol ve su carril, no el del vecino. Los permisos se aplican
                  en la misma pista.
                </p>
              </div>

              <div className="role-grid">
                {roles.map((role) => (
                  <article className="role" key={role.role}>
                    <div className="role__top">
                      <span className="role__pole" aria-hidden="true">
                        P{role.pole}
                      </span>
                      <h3>{role.role}</h3>
                    </div>
                    <p>{role.note}</p>
                    <dl className="role__permissions">
                      <div>
                        <dt>Deportivo</dt>
                        <dd data-state={role.sportState}>{role.sport}</dd>
                      </div>
                      <div>
                        <dt>Financiero</dt>
                        <dd data-state={role.moneyState}>{role.money}</dd>
                      </div>
                      <div>
                        <dt>Usuarios</dt>
                        <dd data-state={role.usersState}>{role.users}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>

              <p className="role-note">
                El acudiente solo ve a sus patinadores; el patinador solo sus propios datos.
              </p>
            </div>
          </section>

          <section className="section section--deep" id="reglas" aria-labelledby="reglas-title">
            <div className="section__inner">
              <div className="section__head">
                <h2 id="reglas-title">Cuatro líneas que no se cruzan.</h2>
                <p>
                  Póliza, cartera, autorización y sanción se validan solas antes de inscribir. La pista decide, no la
                  memoria.
                </p>
              </div>

              <ol className="rules">
                {rules.map((rule) => (
                  <li className="rule" key={rule.title}>
                    <span className="rule__line" aria-hidden="true" />
                    <div>
                      <h3>{rule.title}</h3>
                      <p>{rule.text}</p>
                    </div>
                    <span className="rule__flag">{rule.flag}</span>
                  </li>
                ))}
              </ol>

              <div className="trust" id="confianza">
                <div>
                  <h3>La confianza también se entrena.</h3>
                  <p>
                    Los cambios sensibles quedan auditados con usuario, fecha y motivo. No hay borrado físico de
                    información con historial: se desactiva o anula.
                  </p>
                  <p>
                    El acudiente consulta solo a sus patinadores; el visitante nunca accede a datos de patinadores.
                  </p>
                </div>
                <ul className="trust__tags">
                  <li>Auditoría</li>
                  <li>Permisos por rol</li>
                  <li>Sin borrado físico</li>
                  <li>Datos de menores protegidos</li>
                </ul>
              </div>

              <div className="pit-note">
                <strong>Pago manual</strong>
                <p>
                  Los pagos se registran manualmente y se corrigen anulando con motivo. No hay pasarela de pago en
                  línea.
                </p>
              </div>
            </div>
          </section>

          <section className="section section--ice" id="como-funciona" aria-labelledby="flow-title">
            <div className="section__inner">
              <div className="section__head">
                <h2 id="flow-title">De la salida a la meta.</h2>
                <p>Cada paso deja datos listos para el siguiente. La misma pista, sin volver a empezar en otra hoja.</p>
              </div>

              <ol className="lap-track">
                {steps.map((step, index) => (
                  <li className="lap-step" key={step.title}>
                    <span className="lap-step__marker" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="section section--chalk" id="faq" aria-labelledby="faq-title">
            <div className="section__inner faq-layout">
              <div className="faq-intro">
                <h2 id="faq-title">Preguntas de pista.</h2>
                <p>Lo que conviene saber antes de saltar a la pista con tu escuela.</p>
                <span className="faq-intro__sign">Zona de boxes</span>
              </div>

              <div className="faq">
                {faqs.map((faq) => (
                  <details key={faq.question}>
                    <summary>{faq.question}</summary>
                    <div className="faq__answer">
                      <p>{faq.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <section className="contact" id="contacto" aria-labelledby="contacto-title">
            <div className="contact__checker" aria-hidden="true" />
            <div className="contact__inner">
              <div>
                <h2 id="contacto-title">La meta es tu escuela.</h2>
                <p>
                  Estamos preparando el canal de demo. Mientras tanto, revisa cómo Velora registra tiempos, valida
                  inscripciones y ordena la cartera.
                </p>
                <div className="contact__actions">
                  <button type="button" className="button button--primary" onClick={() => openDialog(demoDialog.current)}>
                    Solicitar demo
                  </button>
                  <a className="button button--ghost" href="#pista">
                    Ver la pista
                  </a>
                </div>
                <p className="contact__note">Canal de contacto en preparación. No inventamos correos ni números.</p>
              </div>

              <div className="contact__result" role="group" aria-label="Resultado de muestra">
                <span className="contact__result-label">Resultado de muestra</span>
                <strong>
                  00:48<span>.312</span>
                </strong>
                <span className="contact__result-meta">500 m · Juvenil</span>
                <span className="contact__result-note">Datos simulados</span>
              </div>
            </div>
          </section>
        </main>

        <footer className="footer">
          <div className="footer__inner">
            <div className="footer__brand">
              <a className="brand" href="#inicio" aria-label="Velora, volver al inicio">
                <span className="brand__mark">
                  <BrandMark />
                </span>
                <span className="brand__type">
                  <span className="brand__word">VELORA</span>
                  <span className="brand__tag">control de pista</span>
                </span>
              </a>
              <p>Rendimiento y gestión para escuelas y clubes de patinaje de velocidad.</p>
            </div>

            <nav className="footer__nav" aria-label="Pie de página">
              <a href="#pista">Módulos</a>
              <a href="#roles">Roles</a>
              <a href="#reglas">Reglas</a>
              <a href="#confianza">Confianza</a>
              <a href="#faq">Preguntas</a>
              <button type="button" className="footer__access" onClick={() => openDialog(accessDialog.current)}>
                Acceso
              </button>
              <a href="#inicio">Volver arriba</a>
            </nav>

            <div className="footer__legal">
              <span>© 2026 Velora · Página de muestra</span>
              <span>Privacidad y términos: en preparación</span>
              <span>Sin datos reales de patinadores</span>
            </div>
          </div>
          <div className="footer__word" aria-hidden="true">
            VELORA
          </div>
        </footer>
      </div>

      <dialog ref={demoDialog} className="dialog" aria-labelledby="demo-title" onClick={closeOnBackdrop}>
        <div className="dialog__paper">
          <button
            type="button"
            className="dialog__close"
            aria-label="Cerrar diálogo de demo"
            onClick={() => demoDialog.current?.close()}
          >
            <CloseIcon />
          </button>
          <h2 id="demo-title">La demo todavía no tiene línea directa.</h2>
          <p>
            Estamos definiendo el canal de contacto. Mientras tanto, revisa cómo Velora registra parciales, valida
            inscripciones y ordena la cartera.
          </p>
          <div className="dialog__actions">
            <a className="button button--primary" href="#pista" onClick={() => demoDialog.current?.close()}>
              Ver la pista
            </a>
            <button type="button" className="button button--ghost" onClick={() => demoDialog.current?.close()}>
              Cerrar
            </button>
          </div>
        </div>
      </dialog>

      <dialog ref={accessDialog} className="dialog" aria-labelledby="access-title" onClick={closeOnBackdrop}>
        <div className="dialog__paper">
          <button
            type="button"
            className="dialog__close"
            aria-label="Cerrar diálogo de acceso"
            onClick={() => accessDialog.current?.close()}
          >
            <CloseIcon />
          </button>
          <h2 id="access-title">El acceso se habilita con M1.</h2>
          <p>
            La ruta de ingreso todavía no está publicada. Esta landing no deja enlaces rotos: cuando M1 esté listo,
            el acceso tendrá su propio destino.
          </p>
          <div className="dialog__actions">
            <button type="button" className="button button--primary" onClick={() => accessDialog.current?.close()}>
              Entendido
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}

export default App
