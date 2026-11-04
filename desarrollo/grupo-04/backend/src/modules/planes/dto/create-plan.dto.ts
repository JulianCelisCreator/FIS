import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { BillingPeriod, PlanType } from '../plan.enums';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsEnum(PlanType)
  type!: PlanType;

  @IsEnum(BillingPeriod)
  billingPeriod!: BillingPeriod;

  @ValidateIf((dto: CreatePlanDto) => dto.billingPeriod === BillingPeriod.MONTHLY)
  @IsInt()
  @Min(1)
  @Max(5)
  paymentDueDay!: number;

}
