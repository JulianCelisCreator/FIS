import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ServicePlan } from './service-plan.entity';

@Entity({ name: 'plan_tariffs' })
@Unique('uq_plan_tariff_effective_date', ['planId', 'effectiveFrom'])
export class PlanTariff {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @ManyToOne(() => ServicePlan, (plan) => plan.tariffs, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_id' })
  plan!: ServicePlan;

  // La tarifa es un nuevo registro, no una modificación del precio histórico.
  @Column({ name: 'amount_cop', type: 'integer' })
  amountCop!: number;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom!: string;

  @Column({ name: 'created_by', type: 'varchar', length: 120 })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
