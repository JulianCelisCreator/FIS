import { useEffect, useState, type FormEvent } from 'react'
import { Alerta, Campo } from '../../../shared/ui/componentes.tsx'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'
import {
  configurarObservaciones,
  crearCategoria,
  editarCategoria,
  listarCategorias,
  obtenerCatalogoClub,
  obtenerEstadoObservaciones,
} from '../services/seguimiento.service.ts'
import { PERMISOS_M2_SEGUIMIENTO, type CategoriaClub, type GeneroCategoria, type NivelClub } from '../types/seguimiento.types.ts'

interface DatosCategoria {
  nombre: string
  edadMinima: string
  edadMaxima: string
  nivelMinimoId: string
  genero: GeneroCategoria
}

const CATEGORIA_VACIA: DatosCategoria = {
  nombre: '',
  edadMinima: '',
  edadMaxima: '',
  nivelMinimoId: '',
  genero: 'MIXTO',
}

function textoEdad(categoria: CategoriaClub): string {
  return categoria.edadMaxima === null
    ? `Desde ${categoria.edadMinima} años`
    : `${categoria.edadMinima} a ${categoria.edadMaxima} años`
}

function textoGenero(genero: GeneroCategoria): string {
  return genero === 'MIXTO' ? 'Mixta' : genero === 'FEMENINO' ? 'Femenina' : 'Masculina'
}

/** RF-M2-07, RF-M2-17 y RF-M2-19: administra o consulta los catálogos según el permiso. */
export function Categorias() {
  const { tienePermiso } = useSesion()
  const puedeGestionar = tienePermiso(PERMISOS_M2_SEGUIMIENTO.categoriaGestionar)
  const puedeConsultar = tienePermiso(PERMISOS_M2_SEGUIMIENTO.categoriaConsultar)
  const puedeConfigurarObservaciones = tienePermiso(PERMISOS_M2_SEGUIMIENTO.observacionHabilitar)
  const [categorias, setCategorias] = useState<CategoriaClub[] | null>(null)
  const [niveles, setNiveles] = useState<NivelClub[]>([])
  const [editando, setEditando] = useState<number | null>(null)
  const [datos, setDatos] = useState<DatosCategoria>(CATEGORIA_VACIA)
  const [observacionesHabilitadas, setObservacionesHabilitadas] = useState<boolean | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    const cargar = async () => {
      setCargando(true)
      try {
        const [catalogo, listaAdministrativa, estadoObservaciones] = await Promise.all([
          obtenerCatalogoClub(),
          puedeGestionar ? listarCategorias() : Promise.resolve(null),
          puedeConfigurarObservaciones ? obtenerEstadoObservaciones() : Promise.resolve(null),
        ])
        if (!vigente) return
        setNiveles(catalogo.niveles ?? [])
        setCategorias(listaAdministrativa ?? catalogo.categorias)
        if (estadoObservaciones) setObservacionesHabilitadas(estadoObservaciones.habilitada)
        setError(null)
      } catch (e) {
        if (vigente) setError(e instanceof Error ? e.message : 'No se pudieron cargar los catálogos.')
      } finally {
        if (vigente) setCargando(false)
      }
    }
    void cargar()
    return () => { vigente = false }
  }, [puedeGestionar, puedeConfigurarObservaciones, version])

  const actualizar = <K extends keyof DatosCategoria>(campo: K, valor: DatosCategoria[K]) => {
    setDatos((anterior) => ({ ...anterior, [campo]: valor }))
  }

  const limpiar = () => {
    setEditando(null)
    setDatos(CATEGORIA_VACIA)
  }

  const editar = (categoria: CategoriaClub) => {
    setEditando(categoria.id)
    setDatos({
      nombre: categoria.nombre,
      edadMinima: String(categoria.edadMinima),
      edadMaxima: categoria.edadMaxima === null ? '' : String(categoria.edadMaxima),
      nivelMinimoId: categoria.nivelMinimo ? String(categoria.nivelMinimo.id) : '',
      genero: categoria.genero,
    })
    setError(null)
    setAviso(null)
  }

  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const edadMinima = Number(datos.edadMinima)
    const edadMaxima = datos.edadMaxima === '' ? null : Number(datos.edadMaxima)
    if (!datos.nombre.trim() || !Number.isInteger(edadMinima) || (edadMaxima !== null && (!Number.isInteger(edadMaxima) || edadMaxima < edadMinima))) {
      setError('Revisa el nombre y el rango de edades de la categoría.')
      return
    }
    setGuardando(true)
    setError(null)
    setAviso(null)
    try {
      const entrada = {
        nombre: datos.nombre.trim(),
        edadMinima,
        edadMaxima,
        nivelMinimoId: datos.nivelMinimoId ? Number(datos.nivelMinimoId) : null,
        genero: datos.genero,
      }
      if (editando === null) {
        const creada = await crearCategoria(entrada)
        setAviso(`Se creó la categoría ${creada.nombre}.`)
      } else {
        const actualizada = await editarCategoria(editando, entrada)
        setAviso(`Se guardaron los cambios de ${actualizada.nombre}.`)
      }
      limpiar()
      setVersion((actual) => actual + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la categoría.')
    } finally {
      setGuardando(false)
    }
  }

  const cambiarEstado = async (categoria: CategoriaClub) => {
    setError(null)
    setAviso(null)
    try {
      await editarCategoria(categoria.id, { activo: !categoria.activo })
      setAviso(categoria.activo ? `La categoría ${categoria.nombre} quedó inactiva.` : `La categoría ${categoria.nombre} quedó activa.`)
      setVersion((actual) => actual + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el estado de la categoría.')
    }
  }

  const cambiarObservaciones = async (habilitada: boolean) => {
    setGuardando(true)
    setError(null)
    setAviso(null)
    try {
      const resultado = await configurarObservaciones(habilitada)
      setObservacionesHabilitadas(resultado.habilitada)
      setAviso(resultado.habilitada
        ? 'Los patinadores pueden consultar las observaciones visibles.'
        : 'La consulta de observaciones quedó deshabilitada.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar la configuración.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb" aria-label="Ruta">
            <span>Gestión deportiva</span><span aria-hidden="true">/</span><span aria-current="page">Niveles y categorías</span>
          </nav>
          <h1>Niveles y categorías</h1>
          <p className="vl-text-body-sm">Consulta los catálogos del club y administra las categorías según tus permisos.</p>
        </div>
      </header>

      {error && <Alerta tono="error" titulo="No se pudo completar la operación">{error}</Alerta>}
      {aviso && <Alerta tono="success" titulo="Cambios guardados">{aviso}</Alerta>}
      {cargando && <p className="vl-text-body-sm" role="status">Cargando catálogos…</p>}

      {puedeGestionar && (
        <section className="vl-card vl-stack" aria-labelledby="m2-categoria-formulario">
          <h2 id="m2-categoria-formulario" className="vl-text-heading-h4">{editando === null ? 'Crear categoría' : 'Editar categoría'}</h2>
          <form className="vl-stack" onSubmit={guardar}>
            <div className="app-cols app-cols--2">
              <Campo etiqueta="Nombre de la categoría" id="m2-categoria-nombre" obligatorio>
                <input id="m2-categoria-nombre" className="vl-input" maxLength={100} value={datos.nombre} onChange={(e) => actualizar('nombre', e.target.value)} required />
              </Campo>
              <Campo etiqueta="Género" id="m2-categoria-genero" obligatorio>
                <select id="m2-categoria-genero" className="vl-select" value={datos.genero} onChange={(e) => actualizar('genero', e.target.value as GeneroCategoria)} required>
                  <option value="MIXTO">Mixta</option>
                  <option value="FEMENINO">Femenina</option>
                  <option value="MASCULINO">Masculina</option>
                </select>
              </Campo>
              <Campo etiqueta="Edad mínima" id="m2-categoria-edad-minima" obligatorio>
                <input id="m2-categoria-edad-minima" className="vl-input vl-input--numeric" type="number" min={0} max={120} step={1} value={datos.edadMinima} onChange={(e) => actualizar('edadMinima', e.target.value)} required />
              </Campo>
              <Campo etiqueta="Edad máxima" id="m2-categoria-edad-maxima" ayuda="Déjala vacía si no hay límite superior.">
                <input id="m2-categoria-edad-maxima" className="vl-input vl-input--numeric" type="number" min={0} max={120} step={1} value={datos.edadMaxima} onChange={(e) => actualizar('edadMaxima', e.target.value)} />
              </Campo>
              <Campo etiqueta="Nivel mínimo" id="m2-categoria-nivel">
                <select id="m2-categoria-nivel" className="vl-select" value={datos.nivelMinimoId} onChange={(e) => actualizar('nivelMinimoId', e.target.value)}>
                  <option value="">Sin nivel mínimo</option>
                  {niveles.map((nivel) => <option key={nivel.id} value={nivel.id}>{nivel.orden}. {nivel.nombre}</option>)}
                </select>
              </Campo>
            </div>
            <div className="app-actions">
              {editando !== null && <button className="vl-button vl-button--ghost" type="button" onClick={limpiar}>Cancelar edición</button>}
              <button className="vl-button vl-button--primary" type="submit" disabled={guardando || cargando}>
                {guardando ? 'Guardando…' : editando === null ? 'Crear categoría' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </section>
      )}

      {puedeConfigurarObservaciones && (
        <section className="vl-card vl-stack" aria-labelledby="m2-observaciones-configuracion">
          <h2 id="m2-observaciones-configuracion" className="vl-text-heading-h4">Consulta de observaciones</h2>
          <p className="vl-text-body-sm">Controla si cada patinador puede consultar las observaciones que el profesor marcó como visibles.</p>
          {observacionesHabilitadas === null
            ? <p className="vl-text-caption" role="status">Cargando configuración…</p>
            : (
              <label className="vl-check-row">
                <input
                  type="checkbox"
                  checked={observacionesHabilitadas}
                  disabled={guardando}
                  onChange={(e) => void cambiarObservaciones(e.target.checked)}
                />
                <span>{observacionesHabilitadas ? 'Habilitada para los patinadores' : 'Deshabilitada para los patinadores'}</span>
              </label>
            )}
        </section>
      )}

      {(puedeGestionar || puedeConsultar) && (
        <section className="vl-stack" aria-labelledby="m2-categorias-listado">
          <h2 id="m2-categorias-listado" className="vl-text-heading-h4">Categorías del club</h2>
          {categorias?.length === 0 && !cargando && <Alerta tono="info" titulo="Aún no hay categorías">Cuando se creen, aparecerán aquí con sus criterios de edad y nivel.</Alerta>}
          {!!categorias?.length && (
            <div className="vl-table-wrap">
              <table className="vl-table">
                <thead><tr><th>Categoría</th><th>Edad</th><th>Género</th><th>Nivel mínimo</th>{puedeGestionar && <th>Patinadores</th>}<th>Estado</th>{puedeGestionar && <th><span className="app-oculto">Acciones</span></th>}</tr></thead>
                <tbody>
                  {categorias.map((categoria) => (
                    <tr key={categoria.id}>
                      <td data-label="Categoría">{categoria.nombre}</td>
                      <td data-label="Edad">{textoEdad(categoria)}</td>
                      <td data-label="Género">{textoGenero(categoria.genero)}</td>
                      <td data-label="Nivel mínimo">{categoria.nivelMinimo ? `${categoria.nivelMinimo.orden}. ${categoria.nivelMinimo.nombre}` : 'Sin requisito'}</td>
                      {puedeGestionar && <td data-label="Patinadores" className="vl-num">{categoria.patinadoresAsignados ?? 0}</td>}
                      <td data-label="Estado">{categoria.activo ? 'Activa' : 'Inactiva'}</td>
                      {puedeGestionar && (
                        <td data-label="Acciones">
                          <div className="app-actions">
                            <button className="vl-button vl-button--ghost vl-button--sm" type="button" onClick={() => editar(categoria)}>Editar</button>
                            <button
                              className="vl-button vl-button--ghost vl-button--sm"
                              type="button"
                              disabled={categoria.activo && (categoria.patinadoresAsignados ?? 0) > 0}
                              title={categoria.activo && (categoria.patinadoresAsignados ?? 0) > 0 ? 'Cambia primero de categoría a los patinadores asignados.' : undefined}
                              onClick={() => void cambiarEstado(categoria)}
                            >
                              {categoria.activo ? 'Inactivar' : 'Reactivar'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {niveles.length > 0 && (
        <section className="vl-stack" aria-labelledby="m2-niveles-listado">
          <h2 id="m2-niveles-listado" className="vl-text-heading-h4">Niveles de patinaje</h2>
          <div className="vl-table-wrap">
            <table className="vl-table">
              <thead><tr><th>Orden</th><th>Nivel</th><th>Descripción</th></tr></thead>
              <tbody>
                {niveles.map((nivel) => (
                  <tr key={nivel.id}>
                    <td data-label="Orden" className="vl-num">{nivel.orden}</td>
                    <td data-label="Nivel">{nivel.nombre}</td>
                    <td data-label="Descripción">{nivel.descripcion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
