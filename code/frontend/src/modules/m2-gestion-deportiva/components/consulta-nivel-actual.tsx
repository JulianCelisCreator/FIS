import { useEffect, useState } from 'react'
import { Alerta, Campo } from '../../../shared/ui/componentes.tsx'
import { consultarNivelActual, listarPerfilesConNivel } from '../services/m2.service.ts'
import type { PerfilNivelActual } from '../types/m2.types.ts'

/** HU-M2-05: muestra el nivel vigente de los perfiles autorizados para la sesión. */
export function ConsultaNivelActual() {
  const [perfiles, setPerfiles] = useState<PerfilNivelActual[]>([])
  const [patinadorId, setPatinadorId] = useState('')
  const [perfil, setPerfil] = useState<PerfilNivelActual | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    listarPerfilesConNivel()
      .then((datos) => {
        if (!vigente) return
        setPerfiles(datos)
        setPatinadorId(datos[0] ? String(datos[0].id) : '')
        setError(null)
      })
      .catch((e: Error) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false))
    return () => { vigente = false }
  }, [])

  useEffect(() => {
    if (!patinadorId) {
      setPerfil(null)
      return
    }
    let vigente = true
    setCargando(true)
    consultarNivelActual(Number(patinadorId))
      .then((datos) => vigente && setPerfil(datos))
      .catch((e: Error) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false))
    return () => { vigente = false }
  }, [patinadorId])

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb" aria-label="Ruta">
            <span>Gestión deportiva</span><span aria-hidden="true">/</span><span aria-current="page">Nivel actual</span>
          </nav>
          <h1>Consulta de nivel actual</h1>
          <p className="vl-text-body-sm">Consulta el nivel vigente del patinador y la fecha desde la que está asignado.</p>
        </div>
      </header>

      {error && <Alerta tono="error" titulo="No se pudo consultar el nivel">{error}</Alerta>}
      {cargando && <p className="vl-text-body-sm" role="status">Cargando perfiles y nivel actual…</p>}
      {!cargando && perfiles.length === 0 && !error && <Alerta tono="info" titulo="No hay perfiles disponibles">Tu cuenta todavía no tiene un perfil de patinador asociado para consultar.</Alerta>}

      {perfiles.length > 1 && (
        <Campo etiqueta="Patinador" id="m2-consulta-patinador" obligatorio>
          <select id="m2-consulta-patinador" className="vl-select" value={patinadorId} onChange={(e) => { setError(null); setPatinadorId(e.target.value) }}>
            {perfiles.map((fila) => <option key={fila.id} value={fila.id}>{fila.nombre}</option>)}
          </select>
        </Campo>
      )}

      {perfil && !cargando && (
        <section className="vl-card vl-stack" aria-labelledby="m2-nivel-actual-titulo">
          <h2 id="m2-nivel-actual-titulo" className="vl-text-heading-h4">{perfil.nombre}</h2>
          {perfil.nivelActual ? (
            <>
              <p className="vl-text-heading-h3">Nivel {perfil.nivelActual.orden}: {perfil.nivelActual.nombre}</p>
              <p className="vl-text-body-sm">Vigente desde {new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${perfil.nivelActual.desde}T00:00:00Z`))}</p>
            </>
          ) : (
            <Alerta tono="info" titulo="Sin nivel asignado">El perfil todavía no tiene un nivel vigente en su historial deportivo.</Alerta>
          )}
        </section>
      )}
    </div>
  )
}
