import { IsBoolean, IsBooleanString, IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class CrearProveedorDto {
  @IsString()
  @Length(1, 120)
  razonSocial!: string;

  @IsString()
  @Length(1, 30)
  nitDocumento!: string;

  @IsOptional()
  @IsEmail()
  correo?: string;

  @IsOptional()
  @IsString()
  @Length(7, 30)
  telefono?: string;
}

export class FiltrosProveedoresDto {
  @IsOptional()
  @IsString()
  buscar?: string;

  @IsOptional()
  @IsBooleanString()
  activo?: string;
}

export class EstadoProveedorDto {
  @IsBoolean()
  activo!: boolean;
}
