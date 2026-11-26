import { useEffect, useState, type FormEvent } from 'react'
import { Alerta, Campo } from '../../../shared/ui/componentes.tsx'
import { listarAcudientes, listarPatinadores, vincularAcudiente } from '../services/m2.service.ts'
import type { AcudienteDisponible, PatinadorConAcudientes } from '../types/m2.types.ts'

/** HU-M2-03: relaciona un perfil existente de patinador con una cuenta existente de acudiente. */
export function AsociacionPerfiles() {
  const [patinadores, setPatinadores] = useState<PatinadorConAcudientes[] | null>(null)
  const [acudientes, setAcudientes] = useState<AcudienteDisponible[]>([])
  const [patinadorId, setPatinadorId] = useState('')
  const [acudienteId, setAcudienteId] = useState('')
  const [parentesco, setParentesco] = useState('')
  const [esPrincipal, setEsPrincipal] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    setBuscando(true)
    Promise.all([listarPatinadores(), listarAcudientes()])
      .then(([perfiles, cuentas]) => {
        if (!vigente) return
        setPatinadores(perfiles)
        setAcudientes(cuentas)
        setError(null)
      })
      .catch((e: Error) => vigente && setError(e.message))
      .finally(() => vigente && setBuscando(false))
    return () => {
      vigente = false
    }
  }, [version])

  const patinador = patinadores?.find((fila) => String(fila.id) === patinadorId)
  const vinculados = patinador?.acudientes ?? []
  const idsVinculados = new Set(vinculados.map((fila) => fila.id))
  const disponibles = acudientes.filter((fila) => !idsVinculados.has(fila.id))

  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!patinadorId || !acudienteId || !parentesco.trim()) return
    setGuardando(true)
    setError(null)
    setAviso(null)
    try {
      await vincularAcudiente(Number(patinadorId), {
        acudienteId: Number(acudienteId),
        parentesco: parentesco.trim(),
        esPrincipal,
      })
      setAviso('La relación quedó guardada y ya aparece en los perfiles asociados.')
      setAcudienteId('')
      setParentesco('')
      setEsPrincipal(false)
      setVersion((actual) => actual + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo asociar el acudiente.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb" aria-label="Ruta">
            <span>Gestión deportiva</span><span aria-hidden="true">/</span><span aria-current="page">Asociar acudiente</span>
          </nav>
          <h1>Asociar acudiente</h1>
          <p className="vl-text-body-sm">Vincula perfiles ya registrados para que la relación quede visible desde ambos perfiles.</p>
        </div>
      </header>

      {error && <Alerta tono="error" titulo="No se pudo completar la operación">{error}</Alerta>}
      {aviso && <Alerta tono="success" titulo="Asociación guardada">{aviso}</Alerta>}
      {buscando && <p className="vl-text-body-sm" role="status">Cargando perfiles registrados…</p>}

      <section className="vl-stack" aria-labelledby="titulo-asociar">
        <h2 id="titulo-asociar" className="vl-text-heading-h4">Nueva relación</h2>
        <form className="vl-filter-bar" onSubmit={guardar}>
          <Campo etiqueta="Patinador" id="m2-patinador" obligatorio>
            <select id="m2-patinador" className="vl-select" value={patinadorId} onChange={(e) => { setPatinadorId(e.target.value); setAcudienteId(''); setAviso(null) }} required>
              <option value="">Selecciona un patinador</option>
              {patinadores?.map((fila) => <option key={fila.id} value={fila.id}>{fila.nombre} · {fila.tipoDocumento} {fila.numeroDocumento}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Acudiente registrado" id="m2-acudiente" obligatorio>
            <select id="m2-acudiente" className="vl-select" value={acudienteId} onChange={(e) => setAcudienteId(e.target.value)} required disabled={!patinadorId || disponibles.length === 0}>
              <option value="">{!patinadorId ? 'Primero selecciona un patinador' : disponibles.length === 0 ? 'No hay acudientes disponibles' : 'Selecciona un acudiente'}</option>
              {disponibles.map((fila) => <option key={fila.id} value={fila.id}>{fila.nombre} · {fila.correo}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Relación con el patinador" id="m2-parentesco" obligatorio>
            <input id="m2-parentesco" className="vl-input" maxLength={40} value={parentesco} onChange={(e) => setParentesco(e.target.value)} placeholder="Madre, padre, tutor legal…" required />
          </Campo>
          <label className="vl-check-row" htmlFor="m2-principal">
            <input id="m2-principal" type="checkbox" checked={esPrincipal} onChange={(e) => setEsPrincipal(e.target.checked)} />
            <span>Marcar como acudiente principal</span>
          </label>
          <div className="vl-form-actions">
            <button className="vl-button vl-button--primary" type="submit" disabled={guardando || buscando || !patinadorId || !acudienteId || !parentesco.trim()}>
              {guardando ? 'Guardando…' : 'Asociar perfiles'}
            </button>
          </div>
        </form>
      </section>

      <section className="vl-stack" aria-labelledby="titulo-relaciones">
        <div className="vl-stack">
          <h2 id="titulo-relaciones" className="vl-text-heading-h4">Acudientes asociados</h2>
          <p className="vl-text-body-sm">{patinador ? `Relaciones registradas para ${patinador.nombre}.` : 'Selecciona un patinador para revisar sus relaciones actuales.'}</p>
        </div>
        {patinador && vinculados.length === 0 && <Alerta tono="info" titulo="Aún no hay acudientes asociados">Al vincular un perfil, la relación aparecerá aquí y en las consultas de M5.</Alerta>}
        {vinculados.length > 0 && (
          <div className="vl-table-wrap">
            <table className="vl-table">
              <thead><tr><th>Acudiente</th><th>Documento</th><th>Correo</th><th>Relación</th><th>Principal</th></tr></thead>
              <tbody>{vinculados.map((fila) => (
                <tr key={fila.id}>
                  <td data-label="Acudiente">{fila.nombre}</td>
                  <td data-label="Documento">{fila.tipoDocumento && fila.numeroDocumento ? `${fila.tipoDocumento} ${fila.numeroDocumento}` : '—'}</td>
                  <td data-label="Correo">{fila.correo}</td>
                  <td data-label="Relación">{fila.parentesco}</td>
                  <td data-label="Principal">{fila.esPrincipal ? 'Sí' : 'No'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
