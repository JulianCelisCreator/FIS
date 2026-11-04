import { IsInt, IsNotEmpty, Matches, Min } from 'class-validator';

export class CreateTariffDto {
  @IsInt()
  @Min(1)
  amountCop!: number;

  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'effectiveFrom debe tener formato AAAA-MM-DD.',
  })
  effectiveFrom!: string;
}
