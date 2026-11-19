import { useEffect, useState, type FormEvent } from 'react'
import { Alerta, Campo, DialogoConfirmacion, Insignia } from '../../../shared/ui/componentes.tsx'
import {
  actualizarGrupoM3,
  cambiarEstadoGrupoM3,
  crearGrupoM3,
  inscribirEnGrupoM3,
  listarGruposM3,
  obtenerCatalogosGruposM3,
} from '../services/m3-grupos.service.ts'
import {
  CATALOGOS_M3_FALLBACK,
  ETIQUETA_DIA_COMPLETO,
  ETIQUETA_DIA_CORTO,
  type CatalogosConfiguracionM3,
  type DiaSemanaM3,
  type EstadoCupoGrupoM3,
  type GrupoConfiguradoM3,
} from '../types/m3.types.ts'
import { MedidorAforo } from './medidor-aforo.tsx'
import './configuracion-grupos.css'

type Aviso = { tono: 'success' | 'warning' | 'error' | 'info'; titulo?: string; texto: string } | null

interface ErroresFormularioGrupo {
  nombre?: string
  nivelId?: string
  categoriaId?: string
  sedeId?: string
  dias?: string
  aforoMax?: string
  ocupados?: string
}

/**
 * HU-3.1: Configuración de grupos y aforo (Actor: Administrador | RF2.5, RF1.4).
 * Vista de creación, edición y listado de grupos con validación de campos obligatorios,
 * control contra capacidad física de sede (DEP-G4-01), barra de progreso con código de
 * colores (Verde <90%, Amarillo >=90%, Rojo 100%) y bloqueo de inscripción al 100%.
 */
export function ConfiguracionGrupos() {
  const [catalogos, setCatalogos] = useState<CatalogosConfiguracionM3>(CATALOGOS_M3_FALLBACK)
  const [grupos, setGrupos] = useState<GrupoConfiguradoM3[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState<Aviso>(null)

  // Campos del formulario de creación / edición
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [nivelId, setNivelId] = useState('NIV-01')
  const [categoriaId, setCategoriaId] = useState('CAT-02')
  const [sedeId, setSedeId] = useState('SEDE-NORTE-P1')
  const [diasSeleccionados, setDiasSeleccionados] = useState<DiaSemanaM3[]>(['Lunes', 'Miercoles'])
  const [aforoMaxTexto, setAforoMaxTexto] = useState('20')
  const [ocupadosTexto, setOcupadosTexto] = useState('0')
  const [errores, setErrores] = useState<ErroresFormularioGrupo>({})

  // Filtros de tabla (FilterBar)
  const [buscar, setBuscar] = useState('')
  const [filtroNivel, setFiltroNivel] = useState('')
  const [filtroSede, setFiltroSede] = useState('')
  const [filtroEstadoCupo, setFiltroEstadoCupo] = useState<EstadoCupoGrupoM3 | 'desactivado' | ''>('')

  // Diálogo de confirmación para Desactivar / Reactivar (nunca Eliminar)
  const [grupoPorCambiarEstado, setGrupoPorCambiarEstado] = useState<GrupoConfiguradoM3 | null>(null)

  useEffect(() => {
    let activo = true
    Promise.all([obtenerCatalogosGruposM3(), listarGruposM3()])
      .then(([cat, lista]) => {
        if (!activo) return
        setCatalogos(cat)
        setGrupos(lista)
        setCargando(false)
      })
      .catch(() => {
        if (!activo) return
        setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [])

  const sedeSeleccionada = catalogos.sedes.find((s) => s.sedeId === sedeId) ?? catalogos.sedes[0]
  const aforoMaxNumero = Number.parseInt(aforoMaxTexto, 10)
  const ocupadosNumero = Number.parseInt(ocupadosTexto || '0', 10)

  const alternarDia = (dia: DiaSemanaM3) => {
    setDiasSeleccionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia],
    )
    setErrores((prev) => ({ ...prev, dias: undefined }))
  }

  const limpiarFormulario = () => {
    setEditandoId(null)
    setNombre('')
    setNivelId(catalogos.niveles[0]?.nivelId ?? 'NIV-01')
    setCategoriaId(catalogos.categorias[1]?.categoriaId ?? 'CAT-02')
    setSedeId(catalogos.sedes[0]?.sedeId ?? 'SEDE-NORTE-P1')
    setDiasSeleccionados(['Lunes', 'Miercoles'])
    setAforoMaxTexto('20')
    setOcupadosTexto('0')
    setErrores({})
  }

  const cargarParaEdicion = (grupo: GrupoConfiguradoM3) => {
    setEditandoId(grupo.grupoId)
    setNombre(grupo.nombre)
    setNivelId(grupo.nivelId)
    setCategoriaId(grupo.categoriaId)
    setSedeId(grupo.sedeId)
    setDiasSeleccionados([...grupo.dias])
    setAforoMaxTexto(String(grupo.aforoMax))
    setOcupadosTexto(String(grupo.ocupados))
    setErrores({})
    setAviso(null)
  }

  const validarFormulario = (): boolean => {
    const nuevosErrores: ErroresFormularioGrupo = {}

    if (!nombre.trim()) {
      nuevosErrores.nombre = 'Ingrese el nombre obligatorio del grupo.'
    }
    if (!nivelId) {
      nuevosErrores.nivelId = 'Seleccione un nivel técnico.'
    }
    if (!categoriaId) {
      nuevosErrores.categoriaId = 'Seleccione una categoría.'
    }
    if (!sedeId) {
      nuevosErrores.sedeId = 'Seleccione una sede y pista.'
    }
    if (diasSeleccionados.length === 0) {
      nuevosErrores.dias = 'Seleccione al menos un día.'
    }
    if (!Number.isInteger(aforoMaxNumero) || aforoMaxNumero <= 0) {
      nuevosErrores.aforoMax = 'Ingrese un cupo máximo entero mayor a 0.'
    } else if (sedeSeleccionada && aforoMaxNumero > sedeSeleccionada.aforoMaximoFisico) {
      nuevosErrores.aforoMax = `No puede superar el aforo físico máximo de ${sedeSeleccionada.nombreSede} (${sedeSeleccionada.aforoMaximoFisico} personas según DEP-G4-01).`
    }
    if (!Number.isInteger(ocupadosNumero) || ocupadosNumero < 0) {
      nuevosErrores.ocupados = 'Los cupos ocupados no pueden ser negativos.'
    } else if (Number.isInteger(aforoMaxNumero) && ocupadosNumero > aforoMaxNumero) {
      nuevosErrores.ocupados = 'Los cupos ocupados no pueden superar el cupo máximo.'
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const manejarGuardarGrupo = async (evento: FormEvent) => {
    evento.preventDefault()
    setAviso(null)
    if (!validarFormulario()) return

    setGuardando(true)
    try {
      const payload = {
        nombre: nombre.trim(),
        nivelId,
        categoriaId,
        sedeId,
        dias: diasSeleccionados,
        aforoMax: aforoMaxNumero,
        ocupados: ocupadosNumero,
      }

      if (editandoId) {
        const actualizado = await actualizarGrupoM3(editandoId, payload)
        setGrupos((prev) => prev.map((g) => (g.grupoId === editandoId ? actualizado : g)))
        setAviso({
          tono: actualizado.estadoCupo === 'lleno' ? 'warning' : 'success',
          titulo: 'Grupo actualizado',
          texto: `Se actualizó el grupo «${actualizado.nombre}» (${actualizado.ocupados}/${actualizado.aforoMax} cupos).`,
        })
      } else {
        const creado = await crearGrupoM3(payload)
        setGrupos((prev) => [...prev, creado])
        setAviso({
          tono: creado.estadoCupo === 'lleno' ? 'warning' : 'success',
          titulo: 'Grupo creado correctamente',
          texto: `El grupo «${creado.nombre}» fue registrado en la sede ${creado.sedeNombre} con cupo máximo de ${creado.aforoMax} personas.`,
        })
      }
      limpiarFormulario()
    } catch (error) {
      setAviso({
        tono: 'error',
        titulo: 'No se pudo guardar el grupo',
        texto: error instanceof Error ? error.message : 'Verifique los datos ingresados.',
      })
    } finally {
      setGuardando(false)
    }
  }

  const manejarInscripcionDemo = async (grupo: GrupoConfiguradoM3) => {
    setAviso(null)
    if (grupo.ocupados >= grupo.aforoMax || !grupo.activo) {
      setAviso({
        tono: 'error',
        titulo: 'Inscripción bloqueada por aforo (100 %)',
        texto: `El grupo «${grupo.nombre}» no tiene cupos disponibles (${grupo.ocupados}/${grupo.aforoMax}).`,
      })
      return
    }
    try {
      const actualizado = await inscribirEnGrupoM3(grupo.grupoId)
      setGrupos((prev) => prev.map((g) => (g.grupoId === grupo.grupoId ? actualizado : g)))
      if (actualizado.estadoCupo === 'lleno') {
        setAviso({
          tono: 'error',
          titulo: 'Cupo lleno alcanzado (100 %)',
          texto: `El grupo «${actualizado.nombre}» llegó a ${actualizado.ocupados}/${actualizado.aforoMax} cupos. Las nuevas inscripciones han quedado bloqueadas automáticamente.`,
        })
      } else if (actualizado.alerta90) {
        setAviso({
          tono: 'warning',
          titulo: 'Alerta de capacidad al 90 %',
          texto: `El grupo «${actualizado.nombre}» alcanzó ${actualizado.ocupados}/${actualizado.aforoMax} cupos (${actualizado.porcentajeOcupacion} %).`,
        })
      } else {
        setAviso({
          tono: 'success',
          titulo: 'Cupo asignado',
          texto: `Ocupación actualizada en «${actualizado.nombre}»: ${actualizado.ocupados}/${actualizado.aforoMax} cupos.`,
        })
      }
    } catch (error) {
      setAviso({
        tono: 'error',
        titulo: 'Inscripción bloqueada',
        texto: error instanceof Error ? error.message : 'No hay cupos disponibles.',
      })
    }
  }

  const confirmarCambioEstado = async () => {
    if (!grupoPorCambiarEstado) return
    const nuevoEstado = !grupoPorCambiarEstado.activo
    try {
      const actualizado = await cambiarEstadoGrupoM3(grupoPorCambiarEstado.grupoId, nuevoEstado)
      setGrupos((prev) =>
        prev.map((g) => (g.grupoId === actualizado.grupoId ? actualizado : g)),
      )
      setAviso({
        tono: 'info',
        titulo: nuevoEstado ? 'Grupo reactivado' : 'Grupo desactivado',
        texto: `El grupo «${actualizado.nombre}» ahora se encuentra ${nuevoEstado ? 'activo y visible para programación' : 'desactivado (sin borrado físico)'}.`,
      })
    } catch (error) {
      setAviso({
        tono: 'error',
        titulo: 'Error al cambiar estado',
        texto: error instanceof Error ? error.message : 'No se pudo actualizar el estado del grupo.',
      })
    } finally {
      setGrupoPorCambiarEstado(null)
    }
  }

  const gruposFiltrados = grupos.filter((g) => {
    const termino = buscar.trim().toLowerCase()
    if (
      termino &&
      !g.nombre.toLowerCase().includes(termino) &&
      !g.sedeNombre.toLowerCase().includes(termino) &&
      !g.nivelNombre.toLowerCase().includes(termino)
    ) {
      return false
    }
    if (filtroNivel && g.nivelId !== filtroNivel) return false
    if (filtroSede && g.sedeId !== filtroSede) return false
    if (filtroEstadoCupo === 'desactivado' && g.activo) return false
    if (
      filtroEstadoCupo &&
      filtroEstadoCupo !== 'desactivado' &&
      (!g.activo || g.estadoCupo !== filtroEstadoCupo)
    ) {
      return false
    }
    return true
  })

  const totalActivos = grupos.filter((g) => g.activo).length
  const totalConCupo = grupos.filter((g) => g.activo && g.estadoCupo === 'con-cupo').length
  const totalAlerta90 = grupos.filter((g) => g.activo && g.estadoCupo === 'alerta-90').length
  const totalLlenos = grupos.filter((g) => g.activo && g.estadoCupo === 'lleno').length

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb" aria-label="Ruta">
            <span>Inicio</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Grupos</span>
          </nav>
          <h1>Configuración de grupos</h1>
          <p className="vl-text-body-sm">
            HU-3.1 · Organiza la oferta de clases por nivel técnico (DEP-M2-01), categoría (DEP-M2-02) y
            capacidad física de sede (DEP-G4-01). Alerta visual desde el 90 % y bloqueo automático al 100 %.
          </p>
        </div>
      </header>

      {/* Tablero KPI de ocupación de grupos */}
      <dl className="app-tablero" aria-label="Resumen de aforo de grupos">
        <div>
          <dt>Grupos activos</dt>
          <dd className="app-tablero__cifra">{totalActivos}</dd>
        </div>
        <div>
          <dt>Con cupo (&lt; 90 %)</dt>
          <dd className="app-tablero__cifra">{totalConCupo}</dd>
        </div>
        <div>
          <dt>Alerta al 90 % (≥ 90 %)</dt>
          <dd className="app-tablero__cifra">{totalAlerta90}</dd>
        </div>
        <div>
          <dt>Cupo lleno (100 % bloqueado)</dt>
          <dd className="app-tablero__cifra app-tablero__cifra--alerta">{totalLlenos}</dd>
        </div>
      </dl>

      {aviso && (
        <Alerta tono={aviso.tono} titulo={aviso.titulo}>
          <p>{aviso.texto}</p>
        </Alerta>
      )}

      {/* Formulario Nuevo Grupo / Editar Grupo (Wireframe HU-3.1) */}
      <section className="vl-card vl-stack" aria-labelledby="titulo-form-grupo">
        <h2 id="titulo-form-grupo" className="vl-text-heading-h4">
          {editandoId ? `Editar grupo (${editandoId})` : 'Nuevo grupo'}
        </h2>

        <form className="vl-stack" onSubmit={manejarGuardarGrupo} noValidate>
          <div className="m3-grupos__form-grid">
            <Campo
              etiqueta="Nombre"
              id="grupo-nombre"
              obligatorio
              error={errores.nombre}
            >
              <input
                id="grupo-nombre"
                className="vl-input"
                type="text"
                placeholder="Ej. Iniciación Norte A"
                value={nombre}
                aria-invalid={ Boolean(errores.nombre) || undefined }
                onChange={(e) => {
                  setNombre(e.target.value)
                  setErrores((prev) => ({ ...prev, nombre: undefined }))
                }}
              />
            </Campo>

            <Campo
              etiqueta="Nivel técnico"
              id="grupo-nivel"
              obligatorio
              error={errores.nivelId}
              ayuda="Catálogo activo DEP-M2-01"
            >
              <select
                id="grupo-nivel"
                className="vl-select"
                value={nivelId}
                aria-invalid={Boolean(errores.nivelId) || undefined}
                onChange={(e) => setNivelId(e.target.value)}
              >
                {catalogos.niveles.map((n) => (
                  <option key={n.nivelId} value={n.nivelId}>
                    {n.nombre}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo
              etiqueta="Categoría deportiva"
              id="grupo-categoria"
              obligatorio
              error={errores.categoriaId}
              ayuda="Catálogo del club DEP-M2-02"
            >
              <select
                id="grupo-categoria"
                className="vl-select"
                value={categoriaId}
                aria-invalid={Boolean(errores.categoriaId) || undefined}
                onChange={(e) => setCategoriaId(e.target.value)}
              >
                {catalogos.categorias.map((c) => (
                  <option key={c.categoriaId} value={c.categoriaId}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo
              etiqueta="Sede"
              id="grupo-sede"
              obligatorio
              error={errores.sedeId}
              ayuda={
                sedeSeleccionada
                  ? `${sedeSeleccionada.pista} · Aforo físico máx.: ${sedeSeleccionada.aforoMaximoFisico} (DEP-G4-01)`
                  : 'Seleccione sede'
              }
            >
              <select
                id="grupo-sede"
                className="vl-select"
                value={sedeId}
                aria-invalid={Boolean(errores.sedeId) || undefined}
                onChange={(e) => {
                  setSedeId(e.target.value)
                  setErrores((prev) => ({ ...prev, sedeId: undefined, aforoMax: undefined }))
                }}
              >
                {catalogos.sedes.map((s) => (
                  <option key={s.sedeId} value={s.sedeId}>
                    {s.nombreSede} — {s.pista} (máx. {s.aforoMaximoFisico})
                  </option>
                ))}
              </select>
            </Campo>

            <Campo
              etiqueta="Cupo máximo"
              id="grupo-cupo"
              obligatorio
              error={errores.aforoMax}
              ayuda={`Máximo de personas por grupo (límite físico sede: ${sedeSeleccionada?.aforoMaximoFisico ?? 25}).`}
            >
              <input
                id="grupo-cupo"
                className="vl-input vl-input--numeric"
                type="number"
                min={1}
                max={sedeSeleccionada?.aforoMaximoFisico ?? 50}
                value={aforoMaxTexto}
                aria-invalid={Boolean(errores.aforoMax) || undefined}
                onChange={(e) => {
                  setAforoMaxTexto(e.target.value)
                  setErrores((prev) => ({ ...prev, aforoMax: undefined }))
                }}
              />
            </Campo>

            <Campo
              etiqueta="Inscritos iniciales / ocupados"
              id="grupo-ocupados"
              error={errores.ocupados}
              ayuda="Permite simular el estado inicial (<90 %, ≥90 % o 100 %)."
            >
              <input
                id="grupo-ocupados"
                className="vl-input vl-input--numeric"
                type="number"
                min={0}
                max={Number.isInteger(aforoMaxNumero) && aforoMaxNumero > 0 ? aforoMaxNumero : 50}
                value={ocupadosTexto}
                aria-invalid={Boolean(errores.ocupados) || undefined}
                onChange={(e) => {
                  setOcupadosTexto(e.target.value)
                  setErrores((prev) => ({ ...prev, ocupados: undefined }))
                }}
              />
            </Campo>
          </div>

          <div className="m3-grupos__form-grid">
            <div style={{ gridColumn: '1 / -1' }}>
              <Campo
                etiqueta="Días de clase"
                id="grupo-dias"
                obligatorio
                error={errores.dias}
                ayuda="Seleccione uno o más días de entrenamiento semanal."
              >
                <div className="m3-grupos__dias-grid" role="group" aria-label="Días de clase">
                  {catalogos.diasDisponibles.map((dia) => {
                    const activo = diasSeleccionados.includes(dia)
                    return (
                      <label
                        key={dia}
                        className={`m3-grupos__dia-chip ${activo ? 'm3-grupos__dia-chip--activo' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={activo}
                          onChange={() => alternarDia(dia)}
                        />
                        <span>{ETIQUETA_DIA_COMPLETO[dia]}</span>
                      </label>
                    )
                  })}
                </div>
              </Campo>
            </div>
          </div>

          {/* Vista previa en vivo del CapacityMeter */}
          <div className="m3-grupos__preview-aforo">
            <MedidorAforo
              ocupados={Number.isInteger(ocupadosNumero) ? ocupadosNumero : 0}
              aforoMax={Number.isInteger(aforoMaxNumero) ? aforoMaxNumero : 0}
              etiqueta="Vista previa de aforo"
              mostrarPorcentaje
            />
          </div>

          <div className="app-actions" style={{ justifyContent: 'flex-start' }}>
            <button
              className="vl-button vl-button--primary"
              type="submit"
              aria-disabled={guardando || undefined}
            >
              {guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Guardar grupo'}
            </button>
            <button
              className="vl-button vl-button--secondary"
              type="button"
              onClick={limpiarFormulario}
            >
              Cancelar
            </button>
          </div>
        </form>
      </section>

      {/* Barra de filtros (FilterBar) */}
      <form
        className="vl-filter-bar"
        role="search"
        aria-label="Filtrar grupos configurados"
        onSubmit={(e) => e.preventDefault()}
      >
        <Campo etiqueta="Buscar grupo" id="filtro-buscar-grupo">
          <input
            id="filtro-buscar-grupo"
            className="vl-input"
            type="search"
            placeholder="Nombre, nivel o sede…"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </Campo>

        <Campo etiqueta="Nivel" id="filtro-nivel-grupo">
          <select
            id="filtro-nivel-grupo"
            className="vl-select"
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
          >
            <option value="">Todos</option>
            {catalogos.niveles.map((n) => (
              <option key={n.nivelId} value={n.nivelId}>
                {n.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Sede" id="filtro-sede-grupo">
          <select
            id="filtro-sede-grupo"
            className="vl-select"
            value={filtroSede}
            onChange={(e) => setFiltroSede(e.target.value)}
          >
            <option value="">Todas</option>
            {catalogos.sedes.map((s) => (
              <option key={s.sedeId} value={s.sedeId}>
                {s.nombreSede}
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Estado" id="filtro-estado-grupo">
          <select
            id="filtro-estado-grupo"
            className="vl-select"
            value={filtroEstadoCupo}
            onChange={(e) =>
              setFiltroEstadoCupo(e.target.value as EstadoCupoGrupoM3 | 'desactivado' | '')
            }
          >
            <option value="">Todos</option>
            <option value="con-cupo">Con cupo (&lt; 90 %)</option>
            <option value="alerta-90">Alerta al 90 % (≥ 90 %)</option>
            <option value="lleno">Lleno (100 %)</option>
            <option value="desactivado">Desactivado</option>
          </select>
        </Campo>
      </form>

      {/* Tabla de grupos configurados (DataTable) */}
      {cargando ? (
        <div className="vl-card">
          <p className="vl-text-body-sm" role="status">
            Cargando grupos configurados…
          </p>
        </div>
      ) : gruposFiltrados.length === 0 ? (
        <div className="vl-card vl-stack">
          <p className="vl-text-heading-h5">No se encontraron grupos con los filtros aplicados</p>
          <p className="vl-text-body-sm">
            Ajuste los criterios de búsqueda o cree un nuevo grupo en el formulario superior.
          </p>
        </div>
      ) : (
        <div className="vl-table-wrap">
          <table className="vl-table" aria-label="Listado general de grupos y aforo">
            <thead>
              <tr>
                <th scope="col">Grupo</th>
                <th scope="col">Nivel</th>
                <th scope="col">Sede</th>
                <th scope="col">Días</th>
                <th scope="col">Ocupación</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gruposFiltrados.map((grupo) => {
                const cupoLleno = grupo.ocupados >= grupo.aforoMax
                const bloqueado = cupoLleno || !grupo.activo
                return (
                  <tr
                    key={grupo.grupoId}
                    className={!grupo.activo ? 'app-fila-anulada' : undefined}
                  >
                    <td data-label="Grupo">
                      <div>
                        <strong>{grupo.nombre}</strong>
                        <span className="app-dato-secundario">
                          {grupo.grupoId} · {grupo.categoriaNombre}
                        </span>
                      </div>
                    </td>
                    <td data-label="Nivel">{grupo.nivelNombre}</td>
                    <td data-label="Sede">
                      <div>
                        <span>{grupo.sedeNombre}</span>
                        <span className="app-dato-secundario">
                          {grupo.pista} (máx. {grupo.aforoMaximoFisicoSede})
                        </span>
                      </div>
                    </td>
                    <td data-label="Días">
                      <span className="m3-grupos__dias-lista">
                        {grupo.dias.map((d) => ETIQUETA_DIA_CORTO[d]).join(' · ')}
                      </span>
                    </td>
                    <td data-label="Ocupación">
                      <MedidorAforo
                        ocupados={grupo.ocupados}
                        aforoMax={grupo.aforoMax}
                        etiqueta={`Ocupación ${grupo.nombre}`}
                        mostrarPorcentaje
                      />
                    </td>
                    <td data-label="Estado">
                      <div>
                        <Insignia
                          entidad="grupo"
                          estado={grupo.activo ? grupo.estadoCupo : 'desactivado'}
                        />
                        {cupoLleno && grupo.activo && (
                          <span className="m3-grupos__bloqueado-nota">
                            Inscripción bloqueada (100 %)
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label="Acciones">
                      <div className="m3-grupos__acciones-celda">
                        <button
                          className="vl-button vl-button--secondary vl-button--sm"
                          type="button"
                          disabled={bloqueado}
                          aria-disabled={bloqueado || undefined}
                          title={
                            cupoLleno
                              ? 'Inscripción bloqueada: el grupo alcanzó el 100 % de su cupo'
                              : 'Simular inscripción de patinador en este grupo'
                          }
                          onClick={() => manejarInscripcionDemo(grupo)}
                        >
                          {cupoLleno ? 'Sin cupos (100 %)' : '+1 Inscribir'}
                        </button>
                        <button
                          className="vl-button vl-button--ghost vl-button--sm"
                          type="button"
                          onClick={() => cargarParaEdicion(grupo)}
                        >
                          Editar
                        </button>
                        <button
                          className="vl-button vl-button--ghost vl-button--sm"
                          type="button"
                          onClick={() => setGrupoPorCambiarEstado(grupo)}
                        >
                          {grupo.activo ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Diálogo de confirmación para Desactivar / Reactivar (sin borrado físico) */}
      <DialogoConfirmacion
        abierto={Boolean(grupoPorCambiarEstado)}
        titulo={
          grupoPorCambiarEstado?.activo
            ? `Desactivar grupo «${grupoPorCambiarEstado.nombre}»`
            : `Reactivar grupo «${grupoPorCambiarEstado?.nombre ?? ''}»`
        }
        textoConfirmar={grupoPorCambiarEstado?.activo ? 'Desactivar grupo' : 'Reactivar grupo'}
        alConfirmar={confirmarCambioEstado}
        alCancelar={() => setGrupoPorCambiarEstado(null)}
      >
        <p>
          {grupoPorCambiarEstado?.activo
            ? 'El grupo no se eliminará físicamente: conservará su historial pero bloqueará nuevas inscripciones mientras esté desactivado.'
            : 'El grupo volverá a estar activo en el listado general respetando su aforo configurado.'}
        </p>
      </DialogoConfirmacion>
    </div>
  )
}
