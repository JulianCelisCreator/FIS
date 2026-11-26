import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { RegistrarPolizaDto } from '../dto/registrar-poliza.dto.js';
import {
  AutorizacionesRepository,
  type PatinadorConAutorizacion,
} from '../repositories/autorizaciones.repository.js';
import {
  PolizasRepository,
  type PolizaRegistrada,
} from '../repositories/polizas.repository.js';
import {
  AlmacenPolizas,
  nombreDescargaPoliza,
  validarArchivoPoliza,
  type ArchivoGuardado,
  type ArchivoSubido,
} from '../utils/archivo-poliza.js';
import {
  MENSAJE_POLIZA_DUPLICADA,
  MENSAJE_POLIZA_PATINADOR_INACTIVO,
  MENSAJE_POLIZA_SIN_ACUDIENTE,
  MENSAJE_POLIZA_SOLO_MENOR,
  validarConsultaPoliza,
  validarDatosPoliza,
  validarRegistroPoliza,
} from '../validators/poliza.validator.js';

/** Card «Póliza médica» (HU-M1-10): póliza actual, historial y acciones. */
export interface DetallePoliza extends PatinadorConAutorizacion {
  polizaActual: PolizaRegistrada | null;
  historial: PolizaRegistrada[];
  puedeRegistrar: boolean;
  motivoNoRegistra: string | null;
}

export interface ArchivoDescargable {
  contenido: Buffer;
  tipo: string;
  nombre: string;
}

/**
 * HU-M1-10 · Gestión de póliza del patinador (RF-M1-10).
 *
 * El Acudiente registra la póliza de sus patinadores menores y el
 * Administrador puede hacerlo en su nombre. Cada registro guarda una fila
 * nueva: «reemplazar» no borra la anterior y conserva el historial. La
 * vigencia se calcula al consultar (CA-03), no con un proceso programado.
 *
 * No hay flujo de revisión del Fisioterapeuta (REQUIREMENTS §7, punto 4); por
 * eso la póliza registrada queda APROBADA y M4-07 la puede validar.
 */
@Injectable()
export class PolizasService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly autorizaciones: AutorizacionesRepository,
    private readonly polizas: PolizasRepository,
    private readonly almacen: AlmacenPolizas,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  /** CA-03 y CA-04: póliza actual, historial y estado del perfil del menor. */
  async detalle(
    usuario: UsuarioAutenticado,
    patinadorId: number,
  ): Promise<DetallePoliza> {
    const patinador = await this.autorizaciones.obtenerDetalle(
      this.baseDatos.consultor,
      patinadorId,
    );
    validarConsultaPoliza(usuario, patinador);
    const historial = await this.polizas.listar(
      this.baseDatos.consultor,
      patinadorId,
    );
    return this.conAcciones(patinador, historial);
  }

  /**
   * CA-01, CA-02 y CA-05: valida el archivo y las fechas, guarda el adjunto en
   * el almacenamiento privado y registra la póliza en una transacción. Si algo
   * falla, el archivo recién guardado se elimina.
   */
  async registrar(
    usuario: UsuarioAutenticado,
    patinadorId: number,
    dto: RegistrarPolizaDto,
    archivo: ArchivoSubido | undefined,
  ): Promise<DetallePoliza> {
    validarArchivoPoliza(archivo);
    const datos = validarDatosPoliza(dto);
    // No se escribe nada al disco hasta comprobar permisos y datos del patinador.
    const estado: { guardado: ArchivoGuardado | null } = { guardado: null };

    try {
      return await this.baseDatos.transaccion(async (consultor) => {
        await this.autorizaciones.bloquear(consultor, patinadorId);
        const patinador = await this.autorizaciones.obtenerDetalle(
          consultor,
          patinadorId,
        );
        validarRegistroPoliza(usuario, patinador);
        estado.guardado = await this.almacen.guardar(archivo);
        const guardado = estado.guardado;

        const polizaId = await this.polizas.crear(consultor, {
          patinadorId,
          ...datos,
          archivo: guardado,
          registradoPor: usuario.id,
        });

        await this.auditoria.registrar(consultor, {
          modulo: 'M1',
          tabla: 'poliza',
          registroId: polizaId,
          accion: 'REGISTRAR_POLIZA',
          valorNuevo: {
            patinadorId,
            aseguradora: datos.aseguradora,
            numeroPoliza: datos.numeroPoliza,
            vigenteDesde: datos.vigenteDesde,
            vigenteHasta: datos.vigenteHasta,
            archivo: {
              nombre: guardado.nombre,
              tipo: guardado.tipo,
              tamano: guardado.tamano,
            },
          },
          usuarioId: usuario.id,
        });

        const historial = await this.polizas.listar(consultor, patinadorId);
        const actualizado = await this.autorizaciones.obtenerDetalle(
          consultor,
          patinadorId,
        );
        if (!actualizado) throw new NotFoundException('El patinador no existe.');
        return this.conAcciones(actualizado, historial);
      });
    } catch (error) {
      if (estado.guardado) await this.almacen.eliminar(estado.guardado.clave);
      if (esViolacionUnica(error)) {
        throw new ConflictException(MENSAJE_POLIZA_DUPLICADA);
      }
      throw error;
    }
  }

  /** Descarga autenticada del adjunto; el archivo nunca se expone como estático. */
  async obtenerArchivo(
    usuario: UsuarioAutenticado,
    patinadorId: number,
    polizaId: number,
  ): Promise<ArchivoDescargable> {
    const patinador = await this.autorizaciones.obtenerDetalle(
      this.baseDatos.consultor,
      patinadorId,
    );
    validarConsultaPoliza(usuario, patinador);

    const poliza = await this.polizas.obtenerArchivo(
      this.baseDatos.consultor,
      patinadorId,
      polizaId,
    );
    if (!poliza) throw new NotFoundException('La póliza no existe.');
    if (!poliza.archivoUrl) {
      throw new NotFoundException('La póliza no tiene un archivo adjunto.');
    }

    let contenido: Buffer;
    try {
      contenido = await this.almacen.leer(poliza.archivoUrl);
    } catch {
      throw new NotFoundException(
        'No se encontró el archivo de la póliza. Vuelve a registrarla.',
      );
    }

    return {
      contenido,
      tipo: poliza.archivoTipo ?? 'application/octet-stream',
      nombre: nombreDescargaPoliza(
        poliza.archivoNombre,
        poliza.numeroPoliza,
        poliza.archivoTipo ?? '',
      ),
    };
  }

  private conAcciones(
    patinador: PatinadorConAutorizacion,
    historial: PolizaRegistrada[],
  ): DetallePoliza {
    const motivoNoRegistra = motivoParaNoRegistrar(patinador);
    return {
      ...patinador,
      polizaActual:
        historial.find((poliza) => poliza.estadoRevision !== 'RECHAZADA') ??
        null,
      historial,
      puedeRegistrar: motivoNoRegistra === null,
      motivoNoRegistra,
    };
  }
}

/** Explica por qué no se muestra el botón de registro (CA-04 y privacidad). */
function motivoParaNoRegistrar(
  patinador: PatinadorConAutorizacion,
): string | null {
  if (!patinador.activo) return MENSAJE_POLIZA_PATINADOR_INACTIVO;
  if (!patinador.esMenor) return MENSAJE_POLIZA_SOLO_MENOR;
  if (patinador.acudientes.length === 0) return MENSAJE_POLIZA_SIN_ACUDIENTE;
  return null;
}

/** Código 23505 de PostgreSQL: la póliza ya existe para ese patinador. */
function esViolacionUnica(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}
