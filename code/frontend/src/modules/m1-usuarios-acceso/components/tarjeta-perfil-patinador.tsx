import { Alerta, Insignia, ListaDatos, TarjetaPersona } from '../../../shared/ui/componentes.tsx'
import type { DetalleAutorizacion } from '../types/autorizaciones.types.ts'
import { detallePatinador, ETIQUETA_REQUISITO, textoAcudientes } from '../utils/autorizacion.ts'

/**
 * PlayerProfileCard de HU-M1-09: identidad del menor y estado del perfil.
 * Si está bloqueado, el Alert enumera exactamente qué requisito falta.
 */
export function TarjetaPerfilPatinador({ detalle }: { detalle: DetalleAutorizacion }) {
  const bloqueado = detalle.perfil.estado === 'BLOQUEADO'

  return (
    <article className="vl-card m1-perfil" aria-labelledby="perfil-patinador-titulo">
      <header className="m1-perfil__head">
        <div>
          <h2 id="perfil-patinador-titulo" className="vl-text-heading-h4">
            Perfil del patinador
          </h2>
          <div className="m1-perfil__persona">
            <TarjetaPersona nombre={detalle.nombre} detalle={detallePatinador(detalle)} />
          </div>
        </div>
        <Insignia entidad="perfil" estado={bloqueado ? 'bloqueado' : 'habilitado'} />
      </header>

      <ListaDatos
        filas={[
          ['Edad', `${detalle.edad} años`],
          ['Documento', `${detalle.tipoDocumento} ${detalle.numeroDocumento}`],
          ['Acudiente', textoAcudientes(detalle.acudientes)],
        ]}
      />

      {!detalle.activo && (
        <Alerta tono="warning" titulo="Patinador inactivo">
          <p>No se pueden registrar autorizaciones mientras la ficha esté inactiva.</p>
        </Alerta>
      )}

      {!detalle.esMenor ? (
        <Alerta tono="info" titulo="No requiere autorización">
          <p>El patinador es mayor de edad y gestiona su perfil por sí mismo.</p>
        </Alerta>
      ) : bloqueado ? (
        <Alerta tono="warning" titulo="Perfil bloqueado">
          <p>Falta completar:</p>
          <ul className="m1-familia__requisitos">
            {detalle.perfil.requisitosFaltantes.map((requisito) => (
              <li key={requisito}>{ETIQUETA_REQUISITO[requisito]}</li>
            ))}
          </ul>
        </Alerta>
      ) : (
        <Alerta tono="success" titulo="Perfil habilitado">
          <p>El patinador puede participar en las actividades del club.</p>
        </Alerta>
      )}
    </article>
  )
}
