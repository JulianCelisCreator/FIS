import { useEffect, useState, type ReactNode } from 'react'
import { useSesion } from '../shared/sesion/use-sesion.ts'
import { NOMBRE_ROL } from '../shared/sesion/sesion.types.ts'

export interface EnlaceNavegacion {
  pagina: string
  texto: string
}

const CONSULTA_MOVIL = '(max-width: 1023px)'

/**
 * Marco con el marcado de ps-app-shell (barra superior, navegación por rol y
 * contenido). En móvil la navegación se abre con el botón de menú.
 */
export function MarcoAplicacion({
  navegacion,
  paginaActual,
  children,
}: {
  navegacion: { grupo: string; enlaces: EnlaceNavegacion[] }[]
  paginaActual: string
  children: ReactNode
}) {
  const { sesion, usuarios, cambiarUsuario } = useSesion()
  const [esMovil, setEsMovil] = useState(() => window.matchMedia(CONSULTA_MOVIL).matches)
  const [menuAbierto, setMenuAbierto] = useState(!esMovil)

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA_MOVIL)
    const alCambiar = () => {
      setEsMovil(consulta.matches)
      setMenuAbierto(!consulta.matches)
    }
    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [])

  const hayNavegacion = navegacion.some((grupo) => grupo.enlaces.length > 0)

  return (
    <ps-app-shell>
      <div className="ps-shell">
        <header className="ps-shell__top">
          {hayNavegacion && (
            <button
              className="ps-icon-button"
              type="button"
              aria-label="Abrir menú"
              aria-expanded={menuAbierto}
              aria-controls="navegacion-principal"
              onClick={() => setMenuAbierto((abierto) => !abierto)}
            >
              ☰
            </button>
          )}
          <span className="ps-text-label">Escuela de patinaje</span>
          <span className="ps-cluster app-user">
            {sesion && (
              <>
                <span className="ps-badge ps-badge--neutral app-hide-mobile">
                  {sesion.roles.map((rol) => NOMBRE_ROL[rol]).join(' · ')}
                </span>
                <span className="ps-text-label app-hide-mobile">{sesion.nombre}</span>
                <ps-avatar name={sesion.nombre} size="sm" className="app-hide-mobile" />
              </>
            )}
            <label className="ps-text-caption app-hide-mobile" htmlFor="usuario-prueba">
              Usuario de prueba
            </label>
            <select
              id="usuario-prueba"
              className="ps-select"
              aria-label="Usuario de prueba"
              value={sesion?.id ?? ''}
              onChange={(evento) => cambiarUsuario(evento.target.value ? Number(evento.target.value) : null)}
            >
              <option value="">Elige un usuario…</option>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nombre} · {usuario.roles.map((rol) => NOMBRE_ROL[rol]).join(', ') || 'sin rol'}
                </option>
              ))}
            </select>
          </span>
        </header>
        <div className="ps-shell__body">
          {hayNavegacion && (
            <nav
              id="navegacion-principal"
              className="ps-shell__nav"
              aria-label="Navegación principal"
              hidden={esMovil && !menuAbierto}
            >
              {navegacion
                .filter((grupo) => grupo.enlaces.length > 0)
                .map((grupo) => (
                  <div key={grupo.grupo} className="app-nav-group">
                    <p className="ps-text-caption">{grupo.grupo}</p>
                    <ul className="ps-stack">
                      {grupo.enlaces.map((enlace) => (
                        <li key={enlace.pagina}>
                          {enlace.pagina === paginaActual ? (
                            <span className="ps-text-label" aria-current="page">{enlace.texto}</span>
                          ) : (
                            <a
                              className="ps-link"
                              href={`#/${enlace.pagina}`}
                              onClick={() => esMovil && setMenuAbierto(false)}
                            >
                              {enlace.texto}
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </nav>
          )}
          <main className="ps-container">{children}</main>
        </div>
      </div>
    </ps-app-shell>
  )
}
