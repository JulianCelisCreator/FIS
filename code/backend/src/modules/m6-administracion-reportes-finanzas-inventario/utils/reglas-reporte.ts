// Reglas de los reportes financieros (HU-6.4).

export const TIPOS_REPORTE = ['ingresos', 'pagos', 'cartera', 'movimientos-uniformes'] as const;
export type TipoReporte = (typeof TIPOS_REPORTE)[number];

export type FormatoValor = 'texto' | 'fecha' | 'cop' | 'numero';

export interface ColumnaReporte {
  clave: string;
  etiqueta: string;
  formato: FormatoValor;
}

export interface TotalReporte {
  clave: string;
  etiqueta: string;
  valor: number;
  formato: 'cop' | 'numero';
}

export type FilaReporte = Record<string, string | number | null>;

export interface Reporte {
  tipo: TipoReporte;
  titulo: string;
  desde: string;
  hasta: string;
  /** Fecha y hora de generación (ISO 8601). */
  generadoEn: string;
  totales: TotalReporte[];
  columnas: ColumnaReporte[];
  filas: FilaReporte[];
  /** Sin registros en el período: totales en cero y alerta informativa. */
  sinDatos: boolean;
  /** Aclaraciones que la pantalla y el archivo muestran bajo el título. */
  notas: string[];
}

export class ErrorReglaReporte extends Error {
  constructor(
    mensaje: string,
    /** NO_ENCONTRADO → 404, INVALIDO → 400. */
    readonly motivo: 'NO_ENCONTRADO' | 'INVALIDO' = 'INVALIDO',
  ) {
    super(mensaje);
    this.name = 'ErrorReglaReporte';
  }
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function esFechaValida(texto: string): boolean {
  if (!FECHA.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === texto;
}

export function validarTipoReporte(tipo: string): TipoReporte {
  if (!(TIPOS_REPORTE as readonly string[]).includes(tipo)) {
    throw new ErrorReglaReporte(
      `El tipo de reporte no existe. Usa uno de: ${TIPOS_REPORTE.join(', ')}`,
      'NO_ENCONTRADO',
    );
  }
  return tipo as TipoReporte;
}

/** Fecha inicial y final obligatorias, con formato AAAA-MM-DD, e inicial ≤ final. */
export function validarRango(desde?: string, hasta?: string): { desde: string; hasta: string } {
  if (!desde || !hasta) throw new ErrorReglaReporte('Indica la fecha inicial y la fecha final del reporte');
  if (!esFechaValida(desde)) throw new ErrorReglaReporte('La fecha inicial no es válida (AAAA-MM-DD)');
  if (!esFechaValida(hasta)) throw new ErrorReglaReporte('La fecha final no es válida (AAAA-MM-DD)');
  if (desde > hasta) throw new ErrorReglaReporte('La fecha inicial no puede ser posterior a la fecha final');
  return { desde, hasta };
}

const suma = (valores: number[]) => valores.reduce((total, valor) => total + valor, 0);

interface Encabezado {
  desde: string;
  hasta: string;
  generadoEn: string;
}

function armar(
  tipo: TipoReporte,
  titulo: string,
  encabezado: Encabezado,
  columnas: ColumnaReporte[],
  filas: FilaReporte[],
  totales: TotalReporte[],
  notas: string[] = [],
): Reporte {
  return { tipo, titulo, ...encabezado, totales, columnas, filas, sinDatos: filas.length === 0, notas };
}

// --- Ingresos ----------------------------------------------------------------

export const ETIQUETAS_CONCEPTO: Record<string, string> = {
  MENSUALIDAD: 'Mensualidades',
  SESION: 'Pagos por sesión',
  MATRICULA: 'Matrículas',
  GASTOS_ADMINISTRATIVOS: 'Gastos administrativos',
  VENTA_UNIFORME: 'Ventas de uniformes',
  PRESTAMO_IMPLEMENTO: 'Préstamos de implementos',
  OTRO: 'Pagos sin cobro asociado',
};

export interface IngresoPorConcepto {
  concepto: string;
  pagos: number;
  valor: number;
}

export interface Reembolsos {
  devoluciones: number;
  valor: number;
}

export function reporteIngresos(
  encabezado: Encabezado,
  conceptos: IngresoPorConcepto[],
  reembolsos: Reembolsos,
): Reporte {
  const orden = Object.keys(ETIQUETAS_CONCEPTO);
  const filas: FilaReporte[] = [...conceptos]
    .filter((fila) => fila.valor > 0)
    .sort((a, b) => orden.indexOf(a.concepto) - orden.indexOf(b.concepto))
    .map((fila) => ({
      concepto: ETIQUETAS_CONCEPTO[fila.concepto] ?? fila.concepto,
      registros: fila.pagos,
      valor: fila.valor,
    }));
  if (reembolsos.valor > 0) {
    filas.push({
      concepto: 'Reembolsos por devoluciones parciales de uniformes',
      registros: reembolsos.devoluciones,
      valor: -reembolsos.valor,
    });
  }
  const brutos = suma(conceptos.map((fila) => fila.valor));
  const ventas = suma(conceptos.filter((fila) => fila.concepto === 'VENTA_UNIFORME').map((fila) => fila.valor));
  return armar(
    'ingresos',
    'Reporte de ingresos',
    encabezado,
    [
      { clave: 'concepto', etiqueta: 'Concepto', formato: 'texto' },
      { clave: 'registros', etiqueta: 'Registros', formato: 'numero' },
      { clave: 'valor', etiqueta: 'Valor', formato: 'cop' },
    ],
    filas,
    [
      { clave: 'ingresosBrutos', etiqueta: 'Pagos registrados', valor: brutos, formato: 'cop' },
      { clave: 'reembolsos', etiqueta: 'Reembolsos', valor: reembolsos.valor, formato: 'cop' },
      { clave: 'ingresosNetos', etiqueta: 'Total de ingresos', valor: brutos - reembolsos.valor, formato: 'cop' },
      { clave: 'ventasUniformes', etiqueta: 'Ventas de uniformes (netas)', valor: ventas - reembolsos.valor, formato: 'cop' },
    ],
    ['Los pagos anulados no se incluyen.'],
  );
}

// --- Pagos recibidos -----------------------------------------------------------

export const ETIQUETAS_TIPO_PAGO: Record<string, string> = {
  COBRO: 'Cobro',
  SESION: 'Sesión',
  MATRICULA: 'Matrícula',
  VENTA_UNIFORME: 'Venta de uniformes',
};

export const ETIQUETAS_MEDIO: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  CONSIGNACION: 'Consignación',
};

export interface PagoRecibido {
  fecha: string;
  comprobante: string | null;
  patinador: string;
  tipo: string;
  medio: string;
  referencia: string | null;
  monto: number;
}

export function reportePagos(encabezado: Encabezado, pagos: PagoRecibido[]): Reporte {
  const porMedio = (medio: string) => suma(pagos.filter((pago) => pago.medio === medio).map((pago) => pago.monto));
  return armar(
    'pagos',
    'Reporte de pagos recibidos',
    encabezado,
    [
      { clave: 'fecha', etiqueta: 'Fecha', formato: 'fecha' },
      { clave: 'comprobante', etiqueta: 'Comprobante', formato: 'texto' },
      { clave: 'patinador', etiqueta: 'Patinador', formato: 'texto' },
      { clave: 'tipo', etiqueta: 'Tipo', formato: 'texto' },
      { clave: 'medio', etiqueta: 'Medio de pago', formato: 'texto' },
      { clave: 'referencia', etiqueta: 'Referencia', formato: 'texto' },
      { clave: 'monto', etiqueta: 'Valor', formato: 'cop' },
    ],
    pagos.map((pago) => ({
      ...pago,
      tipo: ETIQUETAS_TIPO_PAGO[pago.tipo] ?? pago.tipo,
      medio: ETIQUETAS_MEDIO[pago.medio] ?? pago.medio,
    })),
    [
      { clave: 'pagos', etiqueta: 'Pagos registrados', valor: pagos.length, formato: 'numero' },
      { clave: 'total', etiqueta: 'Valor recibido', valor: suma(pagos.map((pago) => pago.monto)), formato: 'cop' },
      { clave: 'efectivo', etiqueta: 'Efectivo', valor: porMedio('EFECTIVO'), formato: 'cop' },
      { clave: 'transferencia', etiqueta: 'Transferencia', valor: porMedio('TRANSFERENCIA'), formato: 'cop' },
      { clave: 'consignacion', etiqueta: 'Consignación', valor: porMedio('CONSIGNACION'), formato: 'cop' },
    ],
    ['Los pagos anulados no se incluyen.'],
  );
}

// --- Cartera pendiente ---------------------------------------------------------

export interface CarteraPatinador {
  patinador: string;
  cobros: number;
  vencimientoMasAntiguo: string;
  saldo: number;
  saldoVencido: number;
}

export function reporteCartera(encabezado: Encabezado, cartera: CarteraPatinador[]): Reporte {
  const filas = cartera
    .filter((fila) => fila.saldo > 0)
    .map((fila) => ({ ...fila, estado: fila.saldoVencido > 0 ? 'Vencido' : 'Pendiente' }));
  return armar(
    'cartera',
    'Reporte de cartera pendiente',
    encabezado,
    [
      { clave: 'patinador', etiqueta: 'Patinador', formato: 'texto' },
      { clave: 'cobros', etiqueta: 'Cobros pendientes', formato: 'numero' },
      { clave: 'vencimientoMasAntiguo', etiqueta: 'Vencimiento más antiguo', formato: 'fecha' },
      { clave: 'estado', etiqueta: 'Estado', formato: 'texto' },
      { clave: 'saldoVencido', etiqueta: 'Saldo vencido', formato: 'cop' },
      { clave: 'saldo', etiqueta: 'Saldo pendiente', formato: 'cop' },
    ],
    filas,
    [
      { clave: 'saldoPendiente', etiqueta: 'Saldo pendiente de cartera', valor: suma(filas.map((fila) => fila.saldo)), formato: 'cop' },
      { clave: 'saldoVencido', etiqueta: 'Saldo vencido', valor: suma(filas.map((fila) => fila.saldoVencido)), formato: 'cop' },
      { clave: 'patinadores', etiqueta: 'Patinadores con saldo', valor: filas.length, formato: 'numero' },
    ],
    [`Saldo a la fecha final (${encabezado.hasta}). Los pagos anulados no reducen la cartera.`],
  );
}

// --- Movimientos de uniformes --------------------------------------------------

export const ETIQUETAS_MOVIMIENTO: Record<string, string> = {
  ENTRADA: 'Entrada',
  VENTA: 'Venta',
  PRESTAMO: 'Préstamo',
  DEVOLUCION: 'Devolución',
  BAJA: 'Baja',
  AJUSTE: 'Ajuste',
};

export interface MovimientoUniforme {
  fecha: string;
  referencia: string;
  talla: string;
  tipo: string;
  cantidad: number;
  /** Solo en ventas: cantidad × valor unitario de la venta. */
  valor: number | null;
  observacion: string | null;
  registradoPor: string;
}

/** Ventas y devoluciones con fecha en el período (ambas, aunque se anule el pago). */
export interface ValoresVentas {
  valorVentas: number;
  valorDevuelto: number;
}

export function reporteMovimientos(
  encabezado: Encabezado,
  movimientos: MovimientoUniforme[],
  ventas: ValoresVentas,
): Reporte {
  const unidades = (tipo: string) =>
    Math.abs(suma(movimientos.filter((mov) => mov.tipo === tipo).map((mov) => mov.cantidad)));
  return armar(
    'movimientos-uniformes',
    'Reporte de movimientos de uniformes',
    encabezado,
    [
      { clave: 'fecha', etiqueta: 'Fecha', formato: 'fecha' },
      { clave: 'referencia', etiqueta: 'Referencia', formato: 'texto' },
      { clave: 'talla', etiqueta: 'Talla', formato: 'texto' },
      { clave: 'tipo', etiqueta: 'Movimiento', formato: 'texto' },
      { clave: 'cantidad', etiqueta: 'Cantidad', formato: 'numero' },
      { clave: 'valor', etiqueta: 'Valor de venta', formato: 'cop' },
      { clave: 'observacion', etiqueta: 'Observación', formato: 'texto' },
      { clave: 'registradoPor', etiqueta: 'Registrado por', formato: 'texto' },
    ],
    movimientos.map((mov) => ({ ...mov, tipo: ETIQUETAS_MOVIMIENTO[mov.tipo] ?? mov.tipo })),
    [
      { clave: 'valorVentas', etiqueta: 'Ventas de uniformes', valor: ventas.valorVentas, formato: 'cop' },
      { clave: 'valorDevuelto', etiqueta: 'Devoluciones de ventas', valor: ventas.valorDevuelto, formato: 'cop' },
      { clave: 'ventasNetas', etiqueta: 'Ventas netas', valor: ventas.valorVentas - ventas.valorDevuelto, formato: 'cop' },
      { clave: 'unidadesVendidas', etiqueta: 'Unidades vendidas', valor: unidades('VENTA'), formato: 'numero' },
      { clave: 'unidadesPrestadas', etiqueta: 'Unidades prestadas', valor: unidades('PRESTAMO'), formato: 'numero' },
      { clave: 'unidadesDevueltas', etiqueta: 'Unidades devueltas', valor: unidades('DEVOLUCION'), formato: 'numero' },
    ],
    ['Cantidad positiva = entra al inventario; negativa = sale.'],
  );
}
