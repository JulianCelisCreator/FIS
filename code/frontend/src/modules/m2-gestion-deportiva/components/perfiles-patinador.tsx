import { useEffect, useState, type FormEvent } from 'react'
import { Alerta, Campo } from '../../../shared/ui/componentes.tsx'
import { actualizarPerfilPatinador, crearPerfilPatinador, listarPerfilesPatinador } from '../services/m2.service.ts'
import type { DatosPerfilPatinador, PerfilPatinador } from '../types/m2.types.ts'

const PERFIL_VACIO: DatosPerfilPatinador = {
  tipoDocumento: 'TI', numeroDocumento: '', nombres: '', apellidos: '', fechaNacimiento: '', genero: 'FEMENINO', telefonoContacto: '',
}

function fechaLocal(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
}

/** HU-M2-01 y HU-M2-02: administra la ficha deportiva usando el catálogo compartido de patinadores. */
export function PerfilesPatinador() {
  const [perfiles, setPerfiles] = useState<PerfilPatinador[]>([])
  const [perfilEditando, setPerfilEditando] = useState<number | null>(null)
  const [datos, setDatos] = useState<DatosPerfilPatinador>(PERFIL_VACIO)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    listarPerfilesPatinador()
      .then((resultado) => vigente && setPerfiles(resultado))
      .catch((e: Error) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false))
    return () => { vigente = false }
  }, [version])

  const actualizarCampo = <K extends keyof DatosPerfilPatinador>(campo: K, valor: DatosPerfilPatinador[K]) => {
    setDatos((anterior) => ({ ...anterior, [campo]: valor }))
  }

  const limpiar = () => {
    setPerfilEditando(null)
    setDatos(PERFIL_VACIO)
  }

  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    setGuardando(true)
    setError(null)
    setAviso(null)
    try {
      const normalizados = { ...datos, telefonoContacto: datos.telefonoContacto?.trim() || null }
      if (perfilEditando === null) {
        await crearPerfilPatinador(normalizados)
        setAviso('El perfil quedó registrado.')
      } else {
        await actualizarPerfilPatinador(perfilEditando, normalizados)
        setAviso('Los cambios del perfil quedaron guardados.')
      }
      limpiar()
      setVersion((actual) => actual + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el perfil.')
    } finally {
      setGuardando(false)
    }
  }

  const editar = (perfil: PerfilPatinador) => {
    setPerfilEditando(perfil.id)
    setDatos({
      tipoDocumento: perfil.tipoDocumento,
      numeroDocumento: perfil.numeroDocumento,
      nombres: perfil.nombres,
      apellidos: perfil.apellidos,
      fechaNacimiento: perfil.fechaNacimiento,
      genero: perfil.genero,
      telefonoContacto: perfil.telefonoContacto ?? '',
    })
    setError(null)
    setAviso(null)
  }

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb" aria-label="Ruta"><span>Gestión deportiva</span><span aria-hidden="true">/</span><span aria-current="page">Perfiles de patinador</span></nav>
          <h1>Perfiles de patinador</h1>
          <p className="vl-text-body-sm">Registra y actualiza la ficha deportiva con los datos que usa el resto de la plataforma.</p>
        </div>
      </header>

      {error && <Alerta tono="error" titulo="No se pudo completar la operación">{error}</Alerta>}
      {aviso && <Alerta tono="success" titulo="Cambios guardados">{aviso}</Alerta>}

      <section className="vl-card vl-stack" aria-labelledby="m2-form-perfil-titulo">
        <h2 id="m2-form-perfil-titulo" className="vl-text-heading-h4">{perfilEditando === null ? 'Registrar patinador' : 'Actualizar perfil'}</h2>
        <form className="vl-filter-bar" onSubmit={guardar}>
          <Campo etiqueta="Tipo de documento" id="m2-tipo-documento" obligatorio>
            <select className="vl-select" id="m2-tipo-documento" value={datos.tipoDocumento} onChange={(e) => actualizarCampo('tipoDocumento', e.target.value)} required>
              <option value="CC">Cédula de ciudadanía</option><option value="TI">Tarjeta de identidad</option><option value="RC">Registro civil</option><option value="CE">Cédula de extranjería</option><option value="PASAPORTE">Pasaporte</option><option value="OTRO">Otro</option>
            </select>
          </Campo>
          <Campo etiqueta="Número de documento" id="m2-numero-documento" obligatorio>
            <input className="vl-input" id="m2-numero-documento" maxLength={30} value={datos.numeroDocumento} onChange={(e) => actualizarCampo('numeroDocumento', e.target.value)} required />
          </Campo>
          <Campo etiqueta="Nombres" id="m2-nombres" obligatorio>
            <input className="vl-input" id="m2-nombres" maxLength={100} value={datos.nombres} onChange={(e) => actualizarCampo('nombres', e.target.value)} required />
          </Campo>
          <Campo etiqueta="Apellidos" id="m2-apellidos" obligatorio>
            <input className="vl-input" id="m2-apellidos" maxLength={100} value={datos.apellidos} onChange={(e) => actualizarCampo('apellidos', e.target.value)} required />
          </Campo>
          <Campo etiqueta="Fecha de nacimiento" id="m2-fecha-nacimiento" obligatorio>
            <input className="vl-input" id="m2-fecha-nacimiento" type="date" min="1900-01-02" max={fechaLocal()} value={datos.fechaNacimiento} onChange={(e) => actualizarCampo('fechaNacimiento', e.target.value)} required />
          </Campo>
          <Campo etiqueta="Género deportivo" id="m2-genero" obligatorio ayuda="Se usa para ubicar al patinador en las categorías de competencia.">
            <select className="vl-select" id="m2-genero" value={datos.genero} onChange={(e) => actualizarCampo('genero', e.target.value as DatosPerfilPatinador['genero'])} required>
              <option value="FEMENINO">Femenino</option><option value="MASCULINO">Masculino</option>
            </select>
          </Campo>
          <Campo etiqueta="Teléfono de contacto" id="m2-telefono">
            <input className="vl-input" id="m2-telefono" maxLength={30} value={datos.telefonoContacto ?? ''} onChange={(e) => actualizarCampo('telefonoContacto', e.target.value)} />
          </Campo>
          <div className="vl-filter-bar">
            <button className="vl-button vl-button--primary" type="submit" disabled={guardando || cargando}>{guardando ? 'Guardando…' : perfilEditando === null ? 'Registrar patinador' : 'Guardar cambios'}</button>
            {perfilEditando !== null && <button className="vl-button vl-button--ghost" type="button" onClick={limpiar}>Cancelar edición</button>}
          </div>
        </form>
      </section>

      <section className="vl-stack" aria-labelledby="m2-lista-perfiles-titulo">
        <h2 id="m2-lista-perfiles-titulo" className="vl-text-heading-h4">Patinadores registrados</h2>
        {cargando && <p className="vl-text-body-sm" role="status">Cargando perfiles…</p>}
        {!cargando && perfiles.length === 0 && <Alerta tono="info" titulo="Aún no hay patinadores">Registra el primer perfil para empezar el catálogo deportivo.</Alerta>}
        {perfiles.length > 0 && <div className="vl-table-wrap"><table className="vl-table">
          <thead><tr><th>Patinador</th><th>Documento</th><th>Fecha de nacimiento</th><th>Género</th><th>Teléfono</th><th><span className="app-oculto">Acciones</span></th></tr></thead>
          <tbody>{perfiles.map((perfil) => <tr key={perfil.id}>
            <td data-label="Patinador">{perfil.nombres} {perfil.apellidos}</td>
            <td data-label="Documento">{perfil.tipoDocumento} {perfil.numeroDocumento}</td>
            <td data-label="Fecha de nacimiento">{perfil.fechaNacimiento}</td>
            <td data-label="Género">{perfil.genero === 'FEMENINO' ? 'Femenino' : 'Masculino'}</td>
            <td data-label="Teléfono">{perfil.telefonoContacto || '—'}</td>
            <td data-label="Acciones"><button className="vl-button vl-button--ghost vl-button--sm" type="button" onClick={() => editar(perfil)}>Editar</button></td>
          </tr>)}</tbody>
        </table></div>}
      </section>
    </div>
  )
}
