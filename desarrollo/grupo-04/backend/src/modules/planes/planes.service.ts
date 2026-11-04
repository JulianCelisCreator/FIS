import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, LessThanOrEqual } from 'typeorm';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { ListPlansQueryDto } from './dto/list-plans-query.dto';
import { PlanAuditLog } from './entities/plan-audit-log.entity';
import { PlanTariff } from './entities/plan-tariff.entity';
import { ServicePlan } from './entities/service-plan.entity';
import { BillingPeriod, PlanStatus, PlanType } from './plan.enums';

@Injectable()
export class PlanesService {
  constructor(private readonly dataSource: DataSource) {}

  async list(query: ListPlansQueryDto) {
    const planRepo = this.dataSource.getRepository(ServicePlan);
    const tariffRepo = this.dataSource.getRepository(PlanTariff);
    const builder = planRepo.createQueryBuilder('plan').orderBy('plan.createdAt', 'DESC');
    if (!query.includeInactive) builder.where('plan.status = :status', { status: PlanStatus.ACTIVE });

    const [plans, tariffs] = await Promise.all([
      builder.getMany(),
      tariffRepo.find({
        where: { effectiveFrom: LessThanOrEqual(this.todayInBogota()) },
        order: { effectiveFrom: 'ASC' },
      }),
    ]);

    // Como las tarifas se recorren cronológicamente, la última de cada plan reemplaza la anterior.
    const currentTariffByPlan = new Map<string, PlanTariff>();
    for (const tariff of tariffs) currentTariffByPlan.set(tariff.planId, tariff);

    return plans.map((plan) => {
      const currentTariff = currentTariffByPlan.get(plan.id) ?? null;
      return {
        ...plan,
        currentTariff,
        availableForAssignment: plan.status === PlanStatus.ACTIVE && currentTariff !== null,
      };
    });
  }

  async create(dto: CreatePlanDto, actorUserId: string) {
    this.assertPlanRules(dto.type, dto.billingPeriod, dto.paymentDueDay);
    const normalizedName = dto.name.trim();

    try {
      return await this.dataSource.transaction(async (manager) => {
        const plans = manager.getRepository(ServicePlan);
        const duplicate = await plans
          .createQueryBuilder('plan')
          .where('LOWER(plan.name) = LOWER(:name)', { name: normalizedName })
          .andWhere('plan.status = :status', { status: PlanStatus.ACTIVE })
          .getOne();
        if (duplicate) throw new ConflictException('Ya existe un plan activo con ese nombre.');

        const plan = plans.create({
          name: normalizedName,
          type: dto.type,
          billingPeriod: dto.billingPeriod,
          paymentDueDay: dto.billingPeriod === BillingPeriod.MONTHLY ? dto.paymentDueDay : null,
          status: PlanStatus.ACTIVE,
          createdBy: actorUserId,
          updatedBy: actorUserId,
          deactivatedBy: null,
          deactivatedAt: null,
        });
        const saved = await plans.save(plan);
        await this.writeAudit(manager, saved.id, actorUserId, 'PLAN_CREATED', {
          after: this.auditPlanSnapshot(saved),
        });
        return { ...saved, currentTariff: null };
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Ya existe un plan activo con ese nombre.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdatePlanDto, actorUserId: string) {
    if (dto.name === undefined && dto.paymentDueDay === undefined) {
      throw new BadRequestException('Indica el nombre o el día límite que deseas modificar.');
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const plans = manager.getRepository(ServicePlan);
        const plan = await plans.findOne({ where: { id } });
        if (!plan) throw new NotFoundException('El plan no existe.');

        const before = this.auditPlanSnapshot(plan);
        if (dto.name !== undefined) {
          const name = dto.name.trim();
          if (!name) throw new BadRequestException('El nombre del plan es obligatorio.');
          if (plan.status === PlanStatus.ACTIVE) {
            const duplicate = await plans
              .createQueryBuilder('other')
              .where('LOWER(other.name) = LOWER(:name)', { name })
              .andWhere('other.status = :status', { status: PlanStatus.ACTIVE })
              .andWhere('other.id <> :id', { id })
              .getOne();
            if (duplicate) throw new ConflictException('Ya existe otro plan activo con ese nombre.');
          }
          plan.name = name;
        }

        if (dto.paymentDueDay !== undefined) {
          if (plan.billingPeriod !== BillingPeriod.MONTHLY) {
            throw new BadRequestException('El plan por sesión no tiene día límite de pago mensual.');
          }
          if (!Number.isInteger(dto.paymentDueDay) || dto.paymentDueDay < 1 || dto.paymentDueDay > 5) {
            throw new BadRequestException('El día límite debe estar entre el 1 y el 5.');
          }
          plan.paymentDueDay = dto.paymentDueDay;
        }

        // Tipo y periodicidad no se aceptan en UpdatePlanDto, de acuerdo con RF-M5-02.
        plan.updatedBy = actorUserId;
        const saved = await plans.save(plan);
        await this.writeAudit(manager, saved.id, actorUserId, 'PLAN_UPDATED', {
          before,
          after: this.auditPlanSnapshot(saved),
          note: 'El cambio del día límite aplica únicamente a cobros generados después del cambio.',
        });
        return saved;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Ya existe otro plan activo con ese nombre.');
      }
      throw error;
    }
  }

  async deactivate(id: string, actorUserId: string) {
    return this.dataSource.transaction(async (manager) => {
      const plans = manager.getRepository(ServicePlan);
      const plan = await plans.findOne({ where: { id } });
      if (!plan) throw new NotFoundException('El plan no existe.');
      if (plan.status === PlanStatus.INACTIVE) {
        throw new ConflictException('El plan ya está desactivado.');
      }

      const before = this.auditPlanSnapshot(plan);
      plan.status = PlanStatus.INACTIVE;
      plan.deactivatedBy = actorUserId;
      plan.deactivatedAt = new Date();
      plan.updatedBy = actorUserId;
      const saved = await plans.save(plan);
      await this.writeAudit(manager, saved.id, actorUserId, 'PLAN_DEACTIVATED', {
        before,
        after: this.auditPlanSnapshot(saved),
        note: 'Desactivación lógica; se conservan el plan, las tarifas y sus relaciones históricas.',
      });
      return saved;
    });
  }

  async registerTariff(planId: string, dto: CreateTariffDto, actorUserId: string) {
    this.assertRealIsoDate(dto.effectiveFrom);
    const today = this.todayInBogota();
    if (dto.effectiveFrom < today) {
      throw new BadRequestException(`La fecha de vigencia no puede ser anterior a hoy (${today}).`);
    }
    if (!Number.isSafeInteger(dto.amountCop) || dto.amountCop <= 0) {
      throw new BadRequestException('La tarifa debe ser un valor entero en COP mayor que cero.');
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const plans = manager.getRepository(ServicePlan);
        const tariffs = manager.getRepository(PlanTariff);
        const plan = await plans.findOne({ where: { id: planId } });
        if (!plan) throw new NotFoundException('El plan no existe.');

        const sameDate = await tariffs.findOne({ where: { planId, effectiveFrom: dto.effectiveFrom } });
        if (sameDate) {
          throw new ConflictException('Ya existe una tarifa de este plan con esa fecha de vigencia. Registra otra fecha.');
        }

        const previous = await tariffs.findOne({
          where: { planId, effectiveFrom: LessThanOrEqual(dto.effectiveFrom) },
          order: { effectiveFrom: 'DESC' },
        });
        const tariff = tariffs.create({
          planId,
          amountCop: dto.amountCop,
          effectiveFrom: dto.effectiveFrom,
          createdBy: actorUserId,
        });
        const saved = await tariffs.save(tariff);
        await this.writeAudit(manager, planId, actorUserId, 'TARIFF_REGISTERED', {
          tariffId: saved.id,
          effectiveFrom: saved.effectiveFrom,
          amountCop: saved.amountCop,
          previousTariff: previous
            ? { tariffId: previous.id, effectiveFrom: previous.effectiveFrom, amountCop: previous.amountCop }
            : null,
        });
        return saved;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Ya existe una tarifa de este plan con esa fecha de vigencia.');
      }
      throw error;
    }
  }

  async tariffHistory(planId: string) {
    await this.getExistingPlan(planId);
    return this.dataSource.getRepository(PlanTariff).find({
      where: { planId },
      order: { effectiveFrom: 'DESC', createdAt: 'DESC' },
    });
  }

  async auditHistory(planId: string) {
    await this.getExistingPlan(planId);
    return this.dataSource.getRepository(PlanAuditLog).find({
      where: { planId },
      order: { createdAt: 'DESC' },
    });
  }

  private async getExistingPlan(id: string): Promise<ServicePlan> {
    const plan = await this.dataSource.getRepository(ServicePlan).findOne({ where: { id } });
    if (!plan) throw new NotFoundException('El plan no existe.');
    return plan;
  }

  private assertPlanRules(type: PlanType, period: BillingPeriod, dueDay?: number) {
    const requiredPeriod = type === PlanType.SINGLE_DAY ? BillingPeriod.SESSION : BillingPeriod.MONTHLY;
    if (period !== requiredPeriod) {
      throw new BadRequestException(
        type === PlanType.SINGLE_DAY
          ? 'El plan de día único debe facturarse por sesión.'
          : 'Los planes de 3 días, 6 días y 6 días + gimnasio deben tener facturación mensual.',
      );
    }
    if (period === BillingPeriod.MONTHLY && (!Number.isInteger(dueDay) || dueDay! < 1 || dueDay! > 5)) {
      throw new BadRequestException('Para un plan mensual, configura un día límite entre el 1 y el 5.');
    }
  }

  private todayInBogota(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
    return `${value('year')}-${value('month')}-${value('day')}`;
  }

  private assertRealIsoDate(value: string) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException('La fecha de vigencia no es una fecha válida.');
    }
  }

  private auditPlanSnapshot(plan: ServicePlan) {
    return {
      id: plan.id,
      name: plan.name,
      type: plan.type,
      billingPeriod: plan.billingPeriod,
      paymentDueDay: plan.paymentDueDay,
      status: plan.status,
      deactivatedBy: plan.deactivatedBy,
      deactivatedAt: plan.deactivatedAt,
    };
  }

  private async writeAudit(
    manager: EntityManager,
    planId: string,
    actorUserId: string,
    action: PlanAuditLog['action'],
    changes: Record<string, unknown>,
  ) {
    const repo = manager.getRepository(PlanAuditLog);
    await repo.save(repo.create({ planId, actorUserId, action, changes }));
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
  }
}
