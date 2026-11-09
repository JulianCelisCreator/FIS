import { useEffect, useState, type ReactNode } from 'react'
import { Avatar } from '../shared/ui/componentes.tsx'
import { Icono } from '../shared/ui/icono.tsx'
import { MarcaVelora } from '../shared/ui/marca-velora.tsx'
import { useSesion } from '../shared/sesion/use-sesion.ts'
import { NOMBRE_ROL } from '../shared/sesion/sesion.types.ts'

export interface EnlaceNavegacion {
  pagina: string
  texto: string
}

const CONSULTA_MOVIL = '(max-width: 979px)'

/**
 * Marco de la aplicación: riel de pista con la marca, la navegación del rol y
 * el usuario; a la derecha, el área de trabajo. En pantallas angostas el riel
 * pasa a ser una barra superior y la navegación se abre con el botón de menú.
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
  const [menuAbierto, setMenuAbierto] = useState(false)

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA_MOVIL)
    const alCambiar = () => {
      setEsMovil(consulta.matches)
      setMenuAbierto(false)
    }
    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [])

  const grupos = navegacion.filter((grupo) => grupo.enlaces.length > 0)
  const rolesTexto = sesion?.roles.map((rol) => NOMBRE_ROL[rol]).join(' · ')

  return (
    <div className="vl-shell">
      <aside className="vl-rail">
        <div className="vl-rail__top">
          <a className="vl-brand" href="#/" aria-label="Velora, ir al inicio de la aplicación">
            <span className="vl-brand__mark">
              <MarcaVelora />
            </span>
            <span className="vl-brand__type">
              <span className="vl-brand__word">VELORA</span>
              <span className="vl-brand__tag">Escuela de patinaje</span>
            </span>
          </a>
          <button
            className="vl-icon-button vl-rail__toggle"
            type="button"
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
            aria-controls="riel-contenido"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            <Icono nombre={menuAbierto ? 'cerrar' : 'menu'} />
          </button>
        </div>

        <div id="riel-contenido" className="vl-rail__body" hidden={esMovil && !menuAbierto}>
          {grupos.length > 0 && (
            <nav className="vl-nav" aria-label="Navegación principal">
              {grupos.map((grupo) => (
                <div key={grupo.grupo} className="vl-nav__group">
                  <p className="vl-nav__heading">{grupo.grupo}</p>
                  <ul>
                    {grupo.enlaces.map((enlace) => (
                      <li key={enlace.pagina}>
                        {enlace.pagina === paginaActual ? (
                          <span aria-current="page">{enlace.texto}</span>
                        ) : (
                          <a href={`#/${enlace.pagina}`} onClick={() => setMenuAbierto(false)}>
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

          <div className="vl-user">
            {sesion && (
              <div className="vl-user__who">
                <Avatar nombre={sesion.nombre} tamano="sm" />
                <div>
                  <p className="vl-user__name">{sesion.nombre}</p>
                  <p className="vl-user__role">{rolesTexto}</p>
                </div>
              </div>
            )}
            <label htmlFor="usuario-prueba">Usuario de prueba</label>
            <select
              id="usuario-prueba"
              className="vl-select"
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
          </div>
        </div>
      </aside>

      <main className="vl-main">{children}</main>
    </div>
  )
}
