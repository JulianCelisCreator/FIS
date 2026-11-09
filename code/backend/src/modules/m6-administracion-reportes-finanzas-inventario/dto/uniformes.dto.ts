import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsNumber,
  NotEquals,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export enum TipoUniforme {
  CAMISETA = 'CAMISETA',
  CHAQUETA = 'CHAQUETA',
  PANTALON = 'PANTALON',
  UNIFORME_COMPLETO = 'UNIFORME_COMPLETO',
  IMPLEMENTO = 'IMPLEMENTO',
}

export class FiltrosUniformesDto {
  @IsOptional()
  @IsString()
  buscar?: string;

  @IsOptional()
  @IsEnum(TipoUniforme)
  tipo?: TipoUniforme;

  @IsOptional()
  @IsString()
  talla?: string;

  @IsOptional()
  @IsBooleanString()
  activo?: string;
}

export class CrearUniformeDto {
  @IsString()
  @Length(1, 100)
  referencia!: string;

  @IsEnum(TipoUniforme)
  tipo!: TipoUniforme;

  @IsString()
  @Length(1, 30)
  talla!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  proveedorId?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costo!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioVenta!: number;

  @IsInt()
  @Min(0)
  cantidadDisponible = 0;

  @IsInt()
  @Min(0)
  cantidadMinima = 0;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  fotoUrl?: string | null;
}

export class AjustarStockDto {
  @IsInt()
  @NotEquals(0)
  cantidad!: number;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  observacion?: string;
}

export class EditarUniformeDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  referencia?: string;

  @IsOptional()
  @IsEnum(TipoUniforme)
  tipo?: TipoUniforme;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  talla?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  proveedorId?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costo?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioVenta?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cantidadDisponible?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cantidadMinima?: number;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  fotoUrl?: string | null;
}

export class DesactivarUniformeDto {
  @IsString()
  @Length(1, 500)
  motivo!: string;
}
