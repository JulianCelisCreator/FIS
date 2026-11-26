import {
  ArgumentsHost,
  BadRequestException,
  Body,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  Param,
  ParseIntPipe,
  PayloadTooLargeException,
  Post,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { UsuarioActual } from '../../../common/auth/decoradores.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { RegistrarPolizaDto } from '../dto/registrar-poliza.dto.js';
import { PolizasService } from '../services/polizas.service.js';
import {
  LIMITE_DURO_POLIZA,
  MENSAJE_TAMANO_ARCHIVO,
  MENSAJE_TIPO_ARCHIVO,
  TIPOS_ARCHIVO_POLIZA,
  type ArchivoSubido,
} from '../utils/archivo-poliza.js';

const OPCIONES_ARCHIVO: MulterOptions = {
  limits: { fileSize: LIMITE_DURO_POLIZA, files: 1 },
  fileFilter: (_solicitud, archivo, aceptar) => {
    if (!TIPOS_ARCHIVO_POLIZA[archivo.mimetype]) {
      aceptar(new BadRequestException(MENSAJE_TIPO_ARCHIVO), false);
      return;
    }
    aceptar(null, true);
  },
};

/**
 * CA-05: Multer corta los archivos muy grandes antes del servicio y devuelve
 * «File too large». Se traduce al motivo en español que espera el usuario.
 */
@Catch(PayloadTooLargeException)
class FiltroTamanoPoliza implements ExceptionFilter {
  catch(_error: PayloadTooLargeException, contexto: ArgumentsHost): void {
    contexto
      .switchToHttp()
      .getResponse<Response>()
      .status(413)
      .json({
        statusCode: 413,
        message: MENSAJE_TAMANO_ARCHIVO,
        error: 'Payload Too Large',
      });
  }
}

@Controller('m1/polizas')
@UseGuards(AutenticacionGuard)
export class PolizasController {
  constructor(private readonly polizasService: PolizasService) {}

  /** CA-03 y CA-04: póliza actual, historial y estado del perfil. */
  @Get(':patinadorId')
  detalle(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('patinadorId', ParseIntPipe) patinadorId: number,
  ) {
    return this.polizasService.detalle(usuario, patinadorId);
  }

  /** Descarga privada del adjunto; solo el Administrador o el Acudiente vinculado. */
  @Get(':patinadorId/archivo/:polizaId')
  archivo(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('patinadorId', ParseIntPipe) patinadorId: number,
    @Param('polizaId', ParseIntPipe) polizaId: number,
  ) {
    return this.polizasService
      .obtenerArchivo(usuario, patinadorId, polizaId)
      .then(
        (archivo) =>
          new StreamableFile(archivo.contenido, {
            type: archivo.tipo,
            disposition: `inline; filename="${archivo.nombre}"`,
            length: archivo.contenido.length,
          }),
      );
  }

  /** CA-01, CA-02 y CA-05: registra la póliza con su documento adjunto. */
  @Post(':patinadorId')
  @UseFilters(FiltroTamanoPoliza)
  @UseInterceptors(FileInterceptor('archivo', OPCIONES_ARCHIVO))
  registrar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('patinadorId', ParseIntPipe) patinadorId: number,
    @Body() dto: RegistrarPolizaDto,
    @UploadedFile() archivo: ArchivoSubido | undefined,
  ) {
    return this.polizasService.registrar(usuario, patinadorId, dto, archivo);
  }
}
