import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BillingPeriod, PlanStatus, PlanType } from '../plan.enums';
import { PlanTariff } from './plan-tariff.entity';

@Entity({ name: 'service_plans' })
export class ServicePlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: false })
  name!: string;

  @Column({ type: 'enum', enum: PlanType, enumName: 'service_plan_type_enum' })
  type!: PlanType;

  @Column({
    name: 'billing_period',
    type: 'enum',
    enum: BillingPeriod,
    enumName: 'service_plan_billing_period_enum',
  })
  billingPeriod!: BillingPeriod;

  // Regla de la academia: las mensualidades vencen como máximo el día 5.
  // El día 10 es la regla de mora de cartera, no la fecha límite editable del plan.
  @Column({ name: 'payment_due_day', type: 'smallint', nullable: true })
  paymentDueDay!: number | null;

  @Column({
    type: 'enum',
    enum: PlanStatus,
    enumName: 'service_plan_status_enum',
    default: PlanStatus.ACTIVE,
  })
  status!: PlanStatus;

  @Column({ name: 'created_by', type: 'varchar', length: 120 })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_by', type: 'varchar', length: 120, nullable: true })
  updatedBy!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'deactivated_by', type: 'varchar', length: 120, nullable: true })
  deactivatedBy!: string | null;

  @Column({ name: 'deactivated_at', type: 'timestamptz', nullable: true })
  deactivatedAt!: Date | null;

  @OneToMany(() => PlanTariff, (tariff) => tariff.plan)
  tariffs!: PlanTariff[];
}
