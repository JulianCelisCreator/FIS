import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/** Medios de pago aceptados por M5 (RF-M5-09); M6 no define medios propios. */
export const MEDIOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'CONSIGNACION'] as const;
export type MedioPago = (typeof MEDIOS_PAGO)[number];

export const TIPOS_COMPRADOR = ['PATINADOR', 'ACUDIENTE'] as const;
export type TipoComprador = (typeof TIPOS_COMPRADOR)[number];

export class ItemVentaDto {
  @IsInt()
  @Min(1)
  uniformeId!: number;

  @IsInt()
  @Min(1)
  @Max(1000)
  cantidad!: number;
}

/**
 * Venta de uno o más uniformes (HU-6.7). El valor unitario no se recibe: el
 * servidor usa el precio de venta vigente de cada referencia.
 */
export class RegistrarVentaDto {
  @IsInt()
  @Min(1)
  patinadorId!: number;

  @IsIn(TIPOS_COMPRADOR)
  compradorTipo!: TipoComprador;

  /** Usuario del acudiente vinculado al patinador; obligatorio si compra un acudiente. */
  @ValidateIf((dto: RegistrarVentaDto) => dto.compradorTipo === 'ACUDIENTE')
  @IsInt()
  @Min(1)
  acudienteId?: number;

  @IsIn(MEDIOS_PAGO)
  medioPago!: MedioPago;

  /** Obligatoria para transferencia y consignación (mismo CHECK que pago en M5). */
  @ValidateIf((dto: RegistrarVentaDto) => dto.medioPago !== 'EFECTIVO' || dto.referenciaPago !== undefined)
  @IsString()
  @Length(1, 100)
  referenciaPago?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ItemVentaDto)
  items!: ItemVentaDto[];
}

export class FiltrosVentasDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  buscar?: string;
}
