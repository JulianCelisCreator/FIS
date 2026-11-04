export enum PlanType {
  SINGLE_DAY = 'SINGLE_DAY',
  THREE_DAYS_WEEK = 'THREE_DAYS_WEEK',
  SIX_DAYS_WEEK = 'SIX_DAYS_WEEK',
  SIX_DAYS_WEEK_GYM = 'SIX_DAYS_WEEK_GYM',
}

export enum BillingPeriod {
  SESSION = 'SESSION',
  MONTHLY = 'MONTHLY',
}

export enum PlanStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  [PlanType.SINGLE_DAY]: 'Día único',
  [PlanType.THREE_DAYS_WEEK]: '3 días/semana',
  [PlanType.SIX_DAYS_WEEK]: '6 días/semana',
  [PlanType.SIX_DAYS_WEEK_GYM]: '6 días/semana + gimnasio',
};

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  [BillingPeriod.SESSION]: 'Por sesión',
  [BillingPeriod.MONTHLY]: 'Mensual',
};
