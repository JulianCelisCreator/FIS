import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// RF-M5-02: el tipo y la periodicidad son inmutables. Para cambiarlos se crea otro plan.
export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  paymentDueDay?: number;
}
