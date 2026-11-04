import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'plan_audit_logs' })
@Index('idx_plan_audit_logs_plan_created', ['planId', 'createdAt'])
export class PlanAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @Column({ name: 'actor_user_id', type: 'varchar', length: 120 })
  actorUserId!: string;

  @Column({ name: 'action', type: 'varchar', length: 40 })
  action!: 'PLAN_CREATED' | 'PLAN_UPDATED' | 'PLAN_DEACTIVATED' | 'TARIFF_REGISTERED';

  @Column({ name: 'changes', type: 'jsonb', default: () => "'{}'::jsonb" })
  changes!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
