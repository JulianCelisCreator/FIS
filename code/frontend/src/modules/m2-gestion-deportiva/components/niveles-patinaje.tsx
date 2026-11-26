import { useEffect, useState, type FormEvent } from 'react'
import { Alerta, Campo, Insignia } from '../../../shared/ui/componentes.tsx'
import { actualizarNivel, crearNivel, listarNiveles } from '../services/m2.service.ts'
import type { NivelPatinaje } from '../types/m2.types.ts'

/** HU-M2-04: catálogo de niveles ordenados que comparten los módulos M3 y M4. */
export function NivelesPatinaje() {
  const [niveles, setNiveles] = useState<NivelPatinaje[] | null>(null)
  const [nivelEditando, setNivelEditando] = useState<number | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [orden, setOrden] = useState('')
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    listarNiveles()
      .then((datos) => {
        if (!vigente) return
        setNiveles(datos)
        setError(null)
      })
      .catch((e: Error) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [version])

  const limpiar = () => {
    setNivelEditando(null)
    setNombre('')
    setDescripcion('')
    setOrden('')
  }

  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const numeroOrden = Number(orden)
    if (!nombre.trim() || !Number.isInteger(numeroOrden) || numeroOrden < 1) return
    setGuardando(true)
    setError(null)
    setAviso(null)
    try {
      if (nivelEditando === null) {
        await crearNivel({ nombre: nombre.trim(), descripcion: descripcion.trim() || undefined, orden: numeroOrden })
        setAviso('El nivel quedó creado en el catálogo.')
      } else {
        await actualizarNivel(nivelEditando, { nombre: nombre.trim(), descripcion: descripcion.trim() || null, orden: numeroOrden })
        setAviso('Los cambios del nivel quedaron guardados.')
      }
      limpiar()
      setVersion((actual) => actual + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el nivel.')
    } finally {
      setGuardando(false)
    }
  }

  const editar = (nivel: NivelPatinaje) => {
    setNivelEditando(nivel.id)
    setNombre(nivel.nombre)
    setDescripcion(nivel.descripcion ?? '')
    setOrden(String(nivel.orden))
    setAviso(null)
  }

  const cambiarEstado = async (nivel: NivelPatinaje) => {
    setError(null)
    setAviso(null)
    try {
      await actualizarNivel(nivel.id, { activo: !nivel.activo })
      setAviso(nivel.activo ? 'El nivel quedó inactivo. Se conserva su historial.' : 'El nivel quedó activo.')
      setVersion((actual) => actual + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el estado del nivel.')
    }
  }

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb" aria-label="Ruta">
            <span>Gestión deportiva</span><span aria-hidden="true">/</span><span aria-current="page">Niveles de patinaje</span>
          </nav>
          <h1>Niveles de patinaje</h1>
          <p className="vl-text-body-sm">Administra el catálogo de menor a mayor dificultad. Los niveles usados se inactivan para conservar su historial.</p>
        </div>
      </header>

      {error && <Alerta tono="error" titulo="No se pudo completar la operación">{error}</Alerta>}
      {aviso && <Alerta tono="success" titulo="Cambios guardados">{aviso}</Alerta>}

      <section className="vl-card vl-stack" aria-labelledby="titulo-form-nivel">
        <h2 id="titulo-form-nivel" className="vl-text-heading-h4">{nivelEditando === null ? 'Crear nivel' : 'Editar nivel'}</h2>
        <form className="vl-filter-bar" onSubmit={guardar}>
          <Campo etiqueta="Nombre del nivel" id="m2-nivel-nombre" obligatorio>
            <input id="m2-nivel-nombre" className="vl-input" maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Fundamentos, Intermedio…" required />
          </Campo>
          <Campo etiqueta="Descripción" id="m2-nivel-descripcion">
            <input id="m2-nivel-descripcion" className="vl-input" maxLength={250} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Habilidades que caracterizan este nivel" />
          </Campo>
          <Campo etiqueta="Orden de avance" id="m2-nivel-orden" ayuda="Un número menor indica menor dificultad." obligatorio>
            <input id="m2-nivel-orden" className="vl-input" type="number" min={1} max={32767} step={1} value={orden} onChange={(e) => setOrden(e.target.value)} required />
          </Campo>
          <div className="vl-filter-bar">
            <button className="vl-button vl-button--primary" type="submit" disabled={guardando || cargando || !nombre.trim() || !orden}>
              {guardando ? 'Guardando…' : nivelEditando === null ? 'Crear nivel' : 'Guardar cambios'}
            </button>
            {nivelEditando !== null && <button className="vl-button vl-button--ghost" type="button" onClick={limpiar}>Cancelar edición</button>}
          </div>
        </form>
      </section>

      <section className="vl-stack" aria-labelledby="titulo-lista-niveles">
        <div className="vl-stack">
          <h2 id="titulo-lista-niveles" className="vl-text-heading-h4">Catálogo de niveles</h2>
          <p className="vl-text-body-sm">El orden se usa para mostrar el progreso de los patinadores y debe ser único.</p>
        </div>
        {cargando && <p className="vl-text-body-sm" role="status">Cargando niveles…</p>}
        {niveles?.length === 0 && <Alerta tono="info" titulo="Aún no hay niveles">Crea el primer nivel para comenzar el catálogo deportivo.</Alerta>}
        {!!niveles?.length && (
          <div className="vl-table-wrap">
            <table className="vl-table">
              <thead><tr><th>Orden</th><th>Nivel</th><th>Descripción</th><th>Patinadores</th><th>Estado</th><th><span className="app-oculto">Acciones</span></th></tr></thead>
              <tbody>{niveles.map((nivel) => (
                <tr key={nivel.id}>
                  <td data-label="Orden">{nivel.orden}</td>
                  <td data-label="Nivel">{nivel.nombre}</td>
                  <td data-label="Descripción">{nivel.descripcion || '—'}</td>
                  <td data-label="Patinadores">{nivel.patinadoresAsignados}</td>
                  <td data-label="Estado"><Insignia entidad="plan" estado={nivel.activo ? 'activo' : 'inactivo'} /></td>
                  <td data-label="Acciones">
                    <div className="vl-filter-bar">
                      <button className="vl-button vl-button--ghost vl-button--sm" type="button" onClick={() => editar(nivel)}>Editar</button>
                      <button className="vl-button vl-button--ghost vl-button--sm" type="button" onClick={() => void cambiarEstado(nivel)}>
                        {nivel.activo ? 'Inactivar' : 'Reactivar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
