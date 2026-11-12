export type TipoUniforme =
  | 'CAMISETA'
  | 'CHAQUETA'
  | 'PANTALON'
  | 'UNIFORME_COMPLETO';

export interface Uniforme {
  id: number;
  referencia: string;
  tipo: TipoUniforme;
  talla: string;
  proveedorId: number | null;
  proveedor: string | null;
  costo: number;
  precioVenta: number;
  cantidadDisponible: number;
  cantidadMinima: number;
  estadoStock: 'STOCK_NORMAL' | 'ALERTA_MINIMO';
  activo: boolean;
}
