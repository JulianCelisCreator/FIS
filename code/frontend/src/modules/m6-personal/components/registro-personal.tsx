import { useEffect, useState } from 'react'
import { Alerta, Campo, DialogoConfirmacion, Insignia } from '../../../shared/ui/componentes.tsx'
import { formatoFecha } from '../../../shared/utils/formato.ts'
import {
  cambiarRolContador,
  crearPersonal,
  cuentasDisponibles,
  desactivarPersonal,
  editarPersonal,
  listarPersonal,
  reactivarPersonal,
} from '../services/personal.service.ts'
import {
  CARGOS,
  TIPOS_DOCUMENTO,
  nombreCompleto,
  textoCargo,
  validarDatosPersonal,
  type CuentaDisponible,
  type DatosPersonal,
  type EstadoPersonal,
  type PaginaPersonal,
  type Personal,
} from '../types/personal.types.ts'

const VACIO: DatosPersonal = {
  tipoDocumento: 'CC',
  numeroDocumento: '',
  nombres: '',
  apellidos: '',
  correo: '',
  telefono: '',
  cargo: 'PROFESOR',
  usuarioId: null,
}

type Edicion = { id: number | null; datos: DatosPersonal; cuentaActual: Personal['cuenta'] }

/** Registro y administración del personal (HU-6.2). Solo Administrador. */
export function RegistroPersonal() {
  const [pagina, setPagina] = useState<PaginaPersonal | null>(null)
  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState<EstadoPersonal | ''>('')
  const [numeroPagina, setNumeroPagina] = useState(1)
  const [version, setVersion] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const [erroresCampo, setErroresCampo] = useState<Partial<Record<keyof DatosPersonal, string>>>({})
  const [errorDialogo, setErrorDialogo] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [busquedaCuenta, setBusquedaCuenta] = useState('')
  const [cuentas, setCuentas] = useState<CuentaDisponible[]>([])

  const [porDesactivar, setPorDesactivar] = useState<Personal | null>(null)
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    let vigente = true
    const espera = setTimeout(() => {
      listarPersonal({ buscar, estado, pagina: numeroPagina })
        .then((resultado) => vigente && (setPagina(resultado), setError(null)))
        .catch((e: Error) => vigente && setError(e.message))
    }, 250)
    return () => {
      vigente = false
      clearTimeout(espera)
    }
  }, [buscar, estado, numeroPagina, version])

  const dialogoAbierto = edicion !== null
  useEffect(() => {
    if (!dialogoAbierto) return
    let vigente = true
    const espera = setTimeout(() => {
      cuentasDisponibles(busquedaCuenta)
        .then((lista) => vigente && setCuentas(lista))
        .catch(() => vigente && setCuentas([]))
    }, 250)
    return () => {
      vigente = false
      clearTimeout(espera)
    }
  }, [dialogoAbierto, busquedaCuenta])

  const abrir = (persona?: Personal) => {
    setErroresCampo({})
    setErrorDialogo(null)
    setBusquedaCuenta('')
    setEdicion(persona
      ? {
          id: persona.id,
          cuentaActual: persona.cuenta,
          datos: {
            tipoDocumento: persona.tipoDocumento,
            numeroDocumento: persona.numeroDocumento,
            nombres: persona.nombres,
            apellidos: persona.apellidos,
            correo: persona.correo,
            telefono: persona.telefono,
            cargo: persona.cargo,
            usuarioId: persona.cuenta?.id ?? null,
          },
        }
      : { id: null, datos: { ...VACIO }, cuentaActual: null })
  }

  const cambiar = <K extends keyof DatosPersonal>(campo: K, valor: DatosPersonal[K]) => {
    setEdicion((actual) => actual && { ...actual, datos: { ...actual.datos, [campo]: valor } })
    setErroresCampo((actuales) => ({ ...actuales, [campo]: undefined }))
  }

  const guardar = async () => {
    if (!edicion) return
    const errores = validarDatosPersonal(edicion.datos)
    setErroresCampo(errores)
    if (Object.keys(errores).length > 0) {
      setErrorDialogo('Revisa los campos marcados.')
      return
    }
    setOcupado(true)
    setErrorDialogo(null)
    try {
      const persona = edicion.id === null
        ? await crearPersonal(edicion.datos)
        : await editarPersonal(edicion.id, edicion.datos)
      setAviso(`${nombreCompleto(persona)} quedó ${edicion.id === null ? 'registrado' : 'actualizado'} en el personal.`)
      setEdicion(null)
      setVersion((valor) => valor + 1)
    } catch (e) {
      setErrorDialogo(e instanceof Error ? e.message : 'No se pudo guardar.')
    } finally {
      setOcupado(false)
    }
  }

  const confirmarDesactivar = async () => {
    if (!porDesactivar) return
    setOcupado(true)
    try {
      const persona = await desactivarPersonal(porDesactivar.id, motivo)
      setAviso(`${nombreCompleto(persona)} quedó inactivo. Su historial se conserva.`)
      setPorDesactivar(null)
      setVersion((valor) => valor + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo desactivar.')
      setPorDesactivar(null)
    } finally {
      setOcupado(false)
    }
  }

  const reactivar = async (persona: Personal) => {
    setError(null)
    try {
      await reactivarPersonal(persona.id)
      setAviso(`${nombreCompleto(persona)} quedó activo de nuevo.`)
      setVersion((valor) => valor + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reactivar.')
    }
  }

  const [rolPendiente, setRolPendiente] = useState<{ persona: Personal; asignar: boolean } | null>(null)

  const confirmarRol = async () => {
    if (!rolPendiente) return
    setOcupado(true)
    setError(null)
    try {
      const persona = await cambiarRolContador(rolPendiente.persona.id, rolPendiente.asignar)
      setAviso(rolPendiente.asignar
        ? `${nombreCompleto(persona)} ahora tiene el rol Contador: consulta y exporta reportes y registra pagos.`
        : `Se retiró el rol Contador a ${nombreCompleto(persona)}.`)
      setVersion((valor) => valor + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el rol.')
    } finally {
      setRolPendiente(null)
      setOcupado(false)
    }
  }

  const totalPaginas = pagina ? Math.max(1, Math.ceil(pagina.total / pagina.tamano)) : 1
  const datos = edicion?.datos
  const opcionesCuenta = edicion?.cuentaActual && !cuentas.some((c) => c.id === edicion.cuentaActual?.id)
    ? [{ id: edicion.cuentaActual.id, nombre: 'Cuenta actual', correo: edicion.cuentaActual.correo, estado: edicion.cuentaActual.estado, roles: edicion.cuentaActual.roles }, ...cuentas]
    : cuentas

  return (
    <div className="app-page">
      <header className="app-head">
        <div className="vl-stack">
          <nav className="vl-breadcrumb"><span>Administración</span><span>/</span><span>Personal</span></nav>
          <h1>Personal</h1>
          <p className="vl-text-body-sm">Datos laborales y de contacto del personal. Desactivar conserva el historial.</p>
        </div>
        <button className="vl-button vl-button--primary" type="button" onClick={() => abrir()}>Registrar persona</button>
      </header>

      {aviso && <Alerta tono="success"><p>{aviso}</p></Alerta>}
      {error && <Alerta tono="error" titulo="No se pudo completar la operación"><p>{error}</p></Alerta>}

      <div className="vl-filter-bar">
        <Campo etiqueta="Buscar por documento o nombre" id="personal-buscar">
          <input id="personal-buscar" className="vl-input" type="search" value={buscar}
            onChange={(e) => { setBuscar(e.target.value); setNumeroPagina(1) }} />
        </Campo>
        <Campo etiqueta="Estado" id="personal-estado">
          <select id="personal-estado" className="vl-select" value={estado}
            onChange={(e) => { setEstado(e.target.value as EstadoPersonal | ''); setNumeroPagina(1) }}>
            <option value="">Activos e inactivos</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
        </Campo>
      </div>

      {pagina && pagina.total === 0 && (
        <Alerta tono="info" titulo="Sin resultados"><p>No hay personal que coincida con la búsqueda.</p></Alerta>
      )}

      {pagina && pagina.total > 0 && (
        <div className="vl-table-wrap">
          <table className="vl-table">
            <thead>
              <tr><th>Nombre</th><th>Documento</th><th>Cargo</th><th>Contacto</th><th>Cuenta</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {pagina.datos.map((persona) => (
                <tr key={persona.id}>
                  <td data-label="Nombre">{nombreCompleto(persona)}</td>
                  <td data-label="Documento">{persona.tipoDocumento} {persona.numeroDocumento}</td>
                  <td data-label="Cargo"><span className="vl-badge vl-badge--neutral">{textoCargo(persona.cargo)}</span></td>
                  <td data-label="Contacto">{persona.correo}<br /><span className="vl-text-caption">{persona.telefono}</span></td>
                  <td data-label="Cuenta">
                    {persona.cuenta ? (
                      <>
                        {persona.cuenta.correo}
                        {persona.cuenta.roles.includes('CONTADOR') && (
                          <> <span className="vl-badge vl-badge--neutral">Contador</span></>
                        )}
                      </>
                    ) : <span className="vl-text-caption">Sin cuenta vinculada</span>}
                  </td>
                  <td data-label="Estado">
                    <Insignia entidad="personal" estado={persona.estado.toLowerCase()} />
                    {persona.fechaRetiro && <p className="vl-text-caption">Retiro: {formatoFecha(persona.fechaRetiro)}</p>}
                  </td>
                  <td data-label="Acciones">
                    <div className="vl-stack">
                      <button className="vl-button vl-button--secondary" type="button" onClick={() => abrir(persona)}>Editar</button>
                      {persona.cuenta?.roles.includes('CONTADOR') ? (
                        <button className="vl-button vl-button--secondary" type="button"
                          onClick={() => setRolPendiente({ persona, asignar: false })}>Retirar rol Contador</button>
                      ) : persona.estado === 'ACTIVO' && persona.cuenta && (
                        <button className="vl-button vl-button--secondary" type="button"
                          onClick={() => setRolPendiente({ persona, asignar: true })}>Asignar rol Contador</button>
                      )}
                      {persona.estado === 'ACTIVO' ? (
                        <button className="vl-button vl-button--danger" type="button"
                          onClick={() => { setMotivo(''); setPorDesactivar(persona) }}>Desactivar</button>
                      ) : (
                        <button className="vl-button vl-button--secondary" type="button" onClick={() => reactivar(persona)}>Reactivar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagina && totalPaginas > 1 && (
        <nav className="vl-filter-bar" aria-label="Paginación">
          <button className="vl-button vl-button--secondary" type="button" disabled={numeroPagina <= 1}
            onClick={() => setNumeroPagina((n) => n - 1)}>Anterior</button>
          <span className="vl-text-body-sm">Página {numeroPagina} de {totalPaginas} · {pagina.total} personas</span>
          <button className="vl-button vl-button--secondary" type="button" disabled={numeroPagina >= totalPaginas}
            onClick={() => setNumeroPagina((n) => n + 1)}>Siguiente</button>
        </nav>
      )}

      <DialogoConfirmacion
        abierto={edicion !== null}
        titulo={edicion?.id === null ? 'Registrar persona' : 'Editar persona'}
        textoConfirmar={edicion?.id === null ? 'Registrar' : 'Guardar cambios'}
        variante="form"
        ocupado={ocupado}
        alConfirmar={guardar}
        alCancelar={() => setEdicion(null)}
      >
        {errorDialogo && <Alerta tono="error"><p>{errorDialogo}</p></Alerta>}
        {datos && (
          <>
            <Campo etiqueta="Tipo de documento" id="personal-tipo" obligatorio>
              <select id="personal-tipo" className="vl-select" value={datos.tipoDocumento}
                onChange={(e) => cambiar('tipoDocumento', e.target.value as DatosPersonal['tipoDocumento'])}>
                {TIPOS_DOCUMENTO.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.texto}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Número de documento" id="personal-documento" obligatorio error={erroresCampo.numeroDocumento}>
              <input id="personal-documento" className="vl-input" value={datos.numeroDocumento}
                onChange={(e) => cambiar('numeroDocumento', e.target.value)} />
            </Campo>
            <Campo etiqueta="Nombres" id="personal-nombres" obligatorio error={erroresCampo.nombres}>
              <input id="personal-nombres" className="vl-input" value={datos.nombres}
                onChange={(e) => cambiar('nombres', e.target.value)} />
            </Campo>
            <Campo etiqueta="Apellidos" id="personal-apellidos" obligatorio error={erroresCampo.apellidos}>
              <input id="personal-apellidos" className="vl-input" value={datos.apellidos}
                onChange={(e) => cambiar('apellidos', e.target.value)} />
            </Campo>
            <Campo etiqueta="Correo" id="personal-correo" obligatorio error={erroresCampo.correo}>
              <input id="personal-correo" className="vl-input" type="email" value={datos.correo}
                onChange={(e) => cambiar('correo', e.target.value)} />
            </Campo>
            <Campo etiqueta="Teléfono" id="personal-telefono" obligatorio error={erroresCampo.telefono}>
              <input id="personal-telefono" className="vl-input" type="tel" value={datos.telefono}
                onChange={(e) => cambiar('telefono', e.target.value)} />
            </Campo>
            <Campo etiqueta="Cargo" id="personal-cargo" obligatorio>
              <select id="personal-cargo" className="vl-select" value={datos.cargo}
                onChange={(e) => cambiar('cargo', e.target.value as DatosPersonal['cargo'])}>
                {CARGOS.map((cargo) => <option key={cargo.valor} value={cargo.valor}>{cargo.texto}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Buscar cuenta de usuario (M1)" id="personal-buscar-cuenta"
              ayuda="Opcional. Vincula una cuenta que ya exista; M6 no crea cuentas.">
              <input id="personal-buscar-cuenta" className="vl-input" type="search" value={busquedaCuenta}
                onChange={(e) => setBusquedaCuenta(e.target.value)} />
            </Campo>
            <Campo etiqueta="Cuenta vinculada" id="personal-cuenta">
              <select id="personal-cuenta" className="vl-select" value={datos.usuarioId ?? ''}
                onChange={(e) => cambiar('usuarioId', e.target.value ? Number(e.target.value) : null)}>
                <option value="">Sin cuenta vinculada</option>
                {opcionesCuenta.map((cuenta) => (
                  <option key={cuenta.id} value={cuenta.id}>{cuenta.correo} · {cuenta.nombre}</option>
                ))}
              </select>
            </Campo>
          </>
        )}
      </DialogoConfirmacion>

      <DialogoConfirmacion
        abierto={rolPendiente !== null}
        titulo={rolPendiente?.asignar ? 'Asignar rol Contador' : 'Retirar rol Contador'}
        textoConfirmar={rolPendiente?.asignar ? 'Asignar rol' : 'Retirar rol'}
        ocupado={ocupado}
        alConfirmar={confirmarRol}
        alCancelar={() => setRolPendiente(null)}
      >
        {rolPendiente?.asignar ? (
          <p>
            {nombreCompleto(rolPendiente.persona)} podrá consultar y exportar reportes financieros, registrar pagos y consultar
            cartera e historial. No podrá anular pagos ni modificar usuarios, grupos, horarios, matrículas ni inventario.
          </p>
        ) : (
          <p>{rolPendiente && nombreCompleto(rolPendiente.persona)} dejará de tener acceso a la información financiera.</p>
        )}
      </DialogoConfirmacion>

      <DialogoConfirmacion
        abierto={porDesactivar !== null}
        titulo="Desactivar persona"
        textoConfirmar="Desactivar"
        ocupado={ocupado}
        alConfirmar={confirmarDesactivar}
        alCancelar={() => setPorDesactivar(null)}
      >
        <p>
          {porDesactivar && nombreCompleto(porDesactivar)} quedará inactivo. No se borra su historial ni sus registros asociados.
          {porDesactivar?.cuenta?.roles.includes('CONTADOR') && ' También pierde el rol Contador.'}
        </p>
        <Campo etiqueta="Motivo (opcional)" id="personal-motivo">
          <input id="personal-motivo" className="vl-input" value={motivo} maxLength={500}
            onChange={(e) => setMotivo(e.target.value)} />
        </Campo>
      </DialogoConfirmacion>
    </div>
  )
}
