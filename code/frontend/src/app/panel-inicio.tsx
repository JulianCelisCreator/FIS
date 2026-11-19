import { Alerta } from '../shared/ui/componentes.tsx'
import { NOMBRE_ROL, type Sesion } from '../shared/sesion/sesion.types.ts'
import { DESCRIPCION_ROL, type Pantalla } from './accesos-por-rol.ts'

/**
 * Inicio de la aplicación (HU-M1-07): saluda, dice qué es cada rol de la
 * persona y muestra solo las pantallas a las que su rol tiene acceso.
 */
export function PanelInicio({
  sesion,
  pantallas,
  error,
}: {
  sesion: Sesion
  pantallas: readonly Pantalla[]
  error: string | null
}) {
  return (
    <div className="app-page">
      <header className="vl-stack">
        <nav className="vl-breadcrumb" aria-label="Ruta">
          <span aria-current="page">Inicio</span>
        </nav>
        <h1>Hola, {sesion.nombre}</h1>
        <ul className="vl-text-body-sm">
          {sesion.roles.map((rol) => (
            <li key={rol}>
              <strong>{NOMBRE_ROL[rol]}.</strong> {DESCRIPCION_ROL[rol]}
            </li>
          ))}
        </ul>
      </header>

      {error && (
        <Alerta tono="error" titulo="Algo salió mal">
          {error}
        </Alerta>
      )}

      {pantallas.length === 0 ? (
        <Alerta tono="info" titulo="Aún no hay pantallas para tu rol">
          <p>Las pantallas de tu rol se irán habilitando a medida que la escuela active los módulos.</p>
        </Alerta>
      ) : (
        <section aria-labelledby="titulo-accesos" className="vl-stack">
          <h2 id="titulo-accesos">Tus accesos</h2>
          <div className="app-cols app-cols--2">
            {pantallas.map((pantalla) => (
              <article key={pantalla.pagina} className="vl-card vl-stack">
                <h3>{pantalla.texto}</h3>
                <p className="vl-text-body-sm">{pantalla.descripcion}</p>
                <a className="vl-button vl-button--secondary app-boton-inicio" href={`#/${pantalla.pagina}`}>
                  Abrir
                </a>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}