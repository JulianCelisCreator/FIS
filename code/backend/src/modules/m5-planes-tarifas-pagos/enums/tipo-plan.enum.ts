/** Tipos de plan (columna plan.tipo). El tipo fija periodicidad, días y gimnasio. */
export enum TipoPlan {
  DIA_UNICO = 'DIA_UNICO',
  TRES_DIAS = 'TRES_DIAS',
  SEIS_DIAS = 'SEIS_DIAS',
  SEIS_DIAS_GIMNASIO = 'SEIS_DIAS_GIMNASIO',
}

export interface CaracteristicasTipoPlan {
  periodicidad: 'MENSUAL' | 'POR_SESION';
  diasPorSemana: number | null;
  incluyeGimnasio: boolean;
}

/** Lo que implica cada tipo; por eso tipo y periodicidad no se editan (RF-M5-02). */
export const CARACTERISTICAS_TIPO_PLAN: Record<TipoPlan, CaracteristicasTipoPlan> = {
  [TipoPlan.DIA_UNICO]: { periodicidad: 'POR_SESION', diasPorSemana: null, incluyeGimnasio: false },
  [TipoPlan.TRES_DIAS]: { periodicidad: 'MENSUAL', diasPorSemana: 3, incluyeGimnasio: false },
  [TipoPlan.SEIS_DIAS]: { periodicidad: 'MENSUAL', diasPorSemana: 6, incluyeGimnasio: false },
  [TipoPlan.SEIS_DIAS_GIMNASIO]: { periodicidad: 'MENSUAL', diasPorSemana: 6, incluyeGimnasio: true },
};

/** Días límite de pago que ofrece el formulario de planes. */
export const DIAS_LIMITE_PAGO = [5, 10, 15, 20];
