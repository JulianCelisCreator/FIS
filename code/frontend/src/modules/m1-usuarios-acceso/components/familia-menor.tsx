import { useEffect, useState } from 'react'
import { Alerta } from '../../../shared/ui/componentes.tsx'
import { useSesion } from '../../../shared/sesion/use-sesion.ts'
import { enlace } from '../../../shared/utils/use-ruta.ts'
import {
  detalleAutorizacion,
  listarPatinadoresAutorizacion,
} from '../services/autorizaciones.service.ts'
import { detallePoliza } from '../services/polizas.service.ts'
import type {
  DetalleAutorizacion,
  PatinadorConAutorizacion,
} from '../types/autorizaciones.types.ts'
import type { DetallePoliza } from '../types/polizas.types.ts'
import { DialogoAutorizacion } from './dialogo-autorizacion.tsx'
import { DialogoPoliza } from './dialogo-poliza.tsx'
import { SelectorContextoPatinador } from './selector-contexto-patinador.tsx'
import { TarjetaAutorizacion } from './tarjeta-autorizacion.tsx'
import { TarjetaPerfilPatinador } from './tarjeta-perfil-patinador.tsx'
import { TarjetaPoliza } from './tarjeta-poliza.tsx'
import './familia-menor.css'

interface RespuestaDetalle {
  /** Consulta que respondió; si no coincide con la actual, se está cargando. */
  consulta: string
  detalle: DetalleAutorizacion | null
  error: string | null
}

interface RespuestaPoliza {
  consulta: string
  detalle: DetallePoliza | null
  error: string | null
}

/**
 * HU-M1-09 · Familia del menor.
 *
 * El acudiente consulta la autorización de sus patinadores y la registra; con
 * más de un hijo cambia de patinador con el selector de contexto. El
 * Administrador ve a todos y puede registrar en nombre del acudiente.
 */
export function FamiliaMenor({ patinadorInicial }: { patinadorInicial?: number }) {
  const { sesion, tieneRol } = useSesion()
  const esAdministrador = tieneRol('ADMINISTRADOR')

  const [lista, setLista] = useState<PatinadorConAutorizacion[] | null>(null)
  const [errorLista, setErrorLista] = useState<string | null>(null)
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(patinadorInicial ?? null)
  const [respuestaDetalle, setRespuestaDetalle] = useState<RespuestaDetalle | null>(null)
  const [respuestaPoliza, setRespuestaPoliza] = useState<RespuestaPoliza | null>(null)
  const [version, setVersion] = useState(0)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [dialogoPolizaAbierto, setDialogoPolizaAbierto] = useState(false)
  const [aviso, setAviso] = useState<{
    tono: 'success' | 'warning'
    titulo: string
    texto: string
  } | null>(null)

  const consulta = `${seleccionadoId ?? ''}|${version}`
  const respondida = respuestaDetalle?.consulta === consulta
  const detalle = respondida ? respuestaDetalle.detalle : null
  const cargandoDetalle = seleccionadoId !== null && !respondida
  const errorDetalle = respondida ? respuestaDetalle.error : null

  const respondidaPoliza = respuestaPoliza?.consulta === consulta
  const poliza = respondidaPoliza ? respuestaPoliza.detalle : null
  const cargandoPoliza = seleccionadoId !== null && !respondidaPoliza
  const errorPoliza = respondidaPoliza ? respuestaPoliza.error : null

  useEffect(() => {
    let vigente = true
    listarPatinadoresAutorizacion()
      .then((patinadores) => {
        if (!vigente) return
        setLista(patinadores)
        setErrorLista(null)
        setSeleccionadoId((actual) =>
          actual && patinadores.some((patinador) => patinador.id === actual)
            ? actual
            : (patinadores[0]?.id ?? null),
        )
      })
      .catch((error: Error) => {
        if (!vigente) return
        setErrorLista(error.message)
      })
    return () => {
      vigente = false
    }
  }, [version])

  useEffect(() => {
    if (seleccionadoId === null) return
    let vigente = true
    detalleAutorizacion(seleccionadoId)
      .then((actual) => {
        if (vigente) setRespuestaDetalle({ consulta, detalle: actual, error: null })
      })
      .catch((error: Error) => {
        if (vigente) setRespuestaDetalle({ consulta, detalle: null, error: error.message })
      })
    return () => {
      vigente = false
    }
  }, [seleccionadoId, version, consulta])

  useEffect(() => {
    if (seleccionadoId === null) return
    let vigente = true
    detallePoliza(seleccionadoId)
      .then((actual) => {
        if (vigente) setRespuestaPoliza({ consulta, detalle: actual, error: null })
      })
      .catch((error: Error) => {
        if (vigente) setRespuestaPoliza({ consulta, detalle: null, error: error.message })
      })
    return () => {
      vigente = false
    }
  }, [seleccionadoId, version, consulta])

  const seleccionar = (patinadorId: number) => {
    setSeleccionadoId(patinadorId)
    setAviso(null)
    window.history.replaceState(null, '', enlace('familia-menor', { patinador: patinadorId }))
  }

  const registrada = (actualizado: DetalleAutorizacion) => {
    const siguienteVersion = version + 1
    setDialogoAbierto(false)
    setRespuestaDetalle({
      consulta: `${actualizado.id}|${siguienteVersion}`,
      detalle: actualizado,
      error: null,
    })
    setAviso({
      tono: 'success',
      titulo: 'Autorización registrada',
      texto: `La autorización de ${actualizado.nombre} quedó registrada.`,
    })
    setVersion(siguienteVersion)
  }

  /** El texto cambió entre abrir el diálogo y guardar: se recarga el vigente. */
  const textoDesactualizado = () => {
    setDialogoAbierto(false)
    setAviso({
      tono: 'warning',
      titulo: 'El texto de la autorización cambió',
      texto: 'Abre de nuevo la autorización y acepta la versión vigente para registrarla.',
    })
    setVersion((v) => v + 1)
  }

  const reintentar = () => setVersion((v) => v + 1)

  /**
   * CA-01 y CA-04: al registrar la póliza se refresca también el detalle de la
   * autorización, porque el estado del perfil del menor depende de ella.
   */
  const polizaRegistrada = (actualizado: DetallePoliza) => {
    const siguienteVersion = version + 1
    setDialogoPolizaAbierto(false)
    setRespuestaPoliza({
      consulta: `${actualizado.id}|${siguienteVersion}`,
      detalle: actualizado,
      error: null,
    })
    setAviso({
      tono: 'success',
      titulo: 'Póliza registrada',
      texto: `La póliza de ${actualizado.nombre} quedó registrada.`,
    })
    setVersion(siguienteVersion)
  }

  return (
    <div className="app-page">
      <header className="vl-stack">
        <nav className="vl-breadcrumb" aria-label="Ruta">
          <span>Usuarios</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Familia del menor</span>
        </nav>
        <h1>Familia del menor</h1>
        <p className="vl-text-body-sm">
          {esAdministrador
            ? 'Consulta y registra la autorización de los patinadores menores en nombre de su acudiente.'
            : 'Consulta y registra la autorización de tus patinadores menores para habilitar su perfil.'}
        </p>
      </header>

      {aviso && (
        <Alerta tono={aviso.tono} titulo={aviso.titulo}>
          <p>{aviso.texto}</p>
        </Alerta>
      )}

      {errorLista && (
        <Alerta tono="error" titulo="No se pudieron cargar los patinadores">
          <p>{errorLista}</p>
        </Alerta>
      )}

      {!errorLista && lista === null && (
        <p className="vl-text-caption" role="status">
          Cargando patinadores…
        </p>
      )}

      {lista?.length === 0 && (
        <div className="vl-card vl-stack">
          <p className="vl-text-heading-h5">No hay patinadores para mostrar</p>
          <p className="vl-text-body-sm">
            {esAdministrador
              ? 'Crea o activa la ficha de un patinador y vincula a su acudiente.'
              : 'El Administrador debe vincular a tu hijo o hija antes de registrar la autorización.'}
          </p>
        </div>
      )}

      {lista && lista.length > 0 && (
        <SelectorContextoPatinador
          patinadores={lista}
          seleccionadoId={seleccionadoId}
          alSeleccionar={seleccionar}
          esAdministrador={esAdministrador}
        />
      )}

      {cargandoDetalle && (
        <p className="vl-text-caption" role="status">
          Cargando autorización…
        </p>
      )}

      {errorDetalle && (
        <Alerta tono="error" titulo="No se pudo cargar la autorización">
          <p>{errorDetalle}</p>
          <button className="vl-button vl-button--secondary vl-button--sm" type="button" onClick={reintentar}>
            Reintentar
          </button>
        </Alerta>
      )}

      {detalle && seleccionadoId !== null && (
        <div className="app-cols app-cols--2 m1-familia__paneles">
          <TarjetaPerfilPatinador detalle={detalle} />
          <TarjetaAutorizacion detalle={detalle} alRegistrar={() => setDialogoAbierto(true)} />
        </div>
      )}

      {cargandoPoliza && (
        <p className="vl-text-caption" role="status">
          Cargando póliza…
        </p>
      )}

      {errorPoliza && (
        <Alerta tono="error" titulo="No se pudo cargar la póliza">
          <p>{errorPoliza}</p>
          <button className="vl-button vl-button--secondary vl-button--sm" type="button" onClick={reintentar}>
            Reintentar
          </button>
        </Alerta>
      )}

      {poliza && seleccionadoId !== null && (
        <TarjetaPoliza detalle={poliza} alRegistrar={() => setDialogoPolizaAbierto(true)} />
      )}

      {dialogoPolizaAbierto && poliza?.puedeRegistrar && (
        <DialogoPoliza
          detalle={poliza}
          alCerrar={() => setDialogoPolizaAbierto(false)}
          alRegistrar={polizaRegistrada}
        />
      )}

      {dialogoAbierto && detalle?.puedeRegistrar && sesion && (
        <DialogoAutorizacion
          detalle={detalle}
          esAdministrador={esAdministrador}
          usuarioId={sesion.id}
          alCerrar={() => setDialogoAbierto(false)}
          alRegistrar={registrada}
          alTextoDesactualizado={textoDesactualizado}
        />
      )}
    </div>
  )
}
