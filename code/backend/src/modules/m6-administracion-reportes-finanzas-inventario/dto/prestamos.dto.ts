import { IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CrearPrestamoDto {
  @IsInt()
  @Min(1)
  uniformeId!: number;

  @IsInt()
  @Min(1)
  patinadorId!: number;

  @IsInt()
  @Min(1)
  responsableId!: number;

  @IsInt()
  @Min(1)
  cantidad = 1;

  @IsDateString()
  fechaDevolucionPrevista!: string;

  @IsIn(['NUEVO', 'BUEN_ESTADO', 'CON_DESGASTE'])
  estadoEntrega!: 'NUEVO' | 'BUEN_ESTADO' | 'CON_DESGASTE';
}

export class RecibirPrestamoDto {
  @IsIn(['DEVUELTO', 'PERDIDA_DANO'])
  estado!: 'DEVUELTO' | 'PERDIDA_DANO';

  @IsOptional()
  @IsIn(['BUEN_ESTADO', 'CON_DESGASTE', 'DANADO'])
  estadoRecepcion?: 'BUEN_ESTADO' | 'CON_DESGASTE' | 'DANADO';

  @IsOptional()
  @IsString()
  @Length(1, 500)
  observacion?: string;
}
