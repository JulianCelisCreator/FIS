import type { TipoUniforme, Uniforme } from '../types/uniforme';

interface FiltrosUniformes {
  buscar?: string;
  tipo?: TipoUniforme;
  activo?: 'true' | 'false';
}

interface CrearUniforme {
  referencia: string;
  tipo: TipoUniforme;
  talla: string;
  costo: number;
  precioVenta: number;
  cantidadDisponible: number;
  cantidadMinima: number;
}

async function solicitud<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  const respuesta = await fetch(`/api${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...opciones?.headers,
    },
  });

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null) as { message?: string } | null;
    throw new Error(cuerpo?.message ?? 'No fue posible completar la operación');
  }
  return respuesta.json() as Promise<T>;
}

export function listarUniformes(filtros: FiltrosUniformes = {}) {
  const parametros = new URLSearchParams();
  if (filtros.buscar) parametros.set('buscar', filtros.buscar);
  if (filtros.tipo) parametros.set('tipo', filtros.tipo);
  if (filtros.activo) parametros.set('activo', filtros.activo);
  const consulta = parametros.size ? `?${parametros.toString()}` : '';
  return solicitud<Uniforme[]>(`/m6/uniformes${consulta}`);
}

export function crearUniforme(datos: CrearUniforme) {
  return solicitud<Uniforme>('/m6/uniformes', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export function ajustarStock(id: number, cantidad: number, observacion: string) {
  return solicitud<Uniforme>(`/m6/uniformes/${id}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ cantidad, observacion }),
  });
}

export function desactivarUniforme(id: number, motivo: string) {
  return solicitud<Uniforme>(`/m6/uniformes/${id}/desactivar`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}
