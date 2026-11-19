import { Alerta } from '../../../shared/ui/componentes.tsx'

export function AvisoApiPendienteM5({ peticiones }: { peticiones: string[] }) {
  return (
    <Alerta tono="warning" titulo="Peticiones pendientes del Módulo 5">
      <p>
        Esta pantalla usa datos ficticios locales y no modifica la base de datos. Los cambios se reinician al recargar el
        navegador. Cuando el Módulo 5 implemente estas peticiones, se podrán conectar:
      </p>
      <ul>
        {peticiones.map((peticion) => <li key={peticion}>{peticion}</li>)}
      </ul>
    </Alerta>
  )
}
