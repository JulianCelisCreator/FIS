import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { ExportarHistorialDto, FiltrosHistorialDto } from '../dto/consultas.dto.js';
import { CarteraRepository } from '../repositories/cartera.repository.js';
import { ConsultasPagosRepository, LIMITE_HISTORIAL } from '../repositories/consultas-pagos.repository.js';
import { PatinadoresRepository } from '../repositories/patinadores.repository.js';
import { comprobantePdf } from '../utils/documentos/comprobante-pdf.js';
import { fecha, medio } from '../utils/documentos/formato.js';
import { historialPdf, historialXlsx, totalSinAnulados } from '../utils/documentos/historial.js';
import { validarConsultaDePagos } from '../validators/acceso-patinador.validator.js';

export interface Archivo {
  nombre: string;
  tipo: string;
  contenido: Buffer;
}

function validarRango(filtros: FiltrosHistorialDto): void {
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    throw new BadRequestException('«Desde» no puede ser posterior a «Hasta»');
  }
}

/** Filtros en palabras, para dejarlos escritos en el documento exportado. */
function describirFiltros(filtros: FiltrosHistorialDto): string {
  const partes = [
    filtros.desde && `desde ${fecha(filtros.desde)}`,
    filtros.hasta && `hasta ${fecha(filtros.hasta)}`,
    filtros.medio && `medio ${medio(filtros.medio)}`,
    filtros.estado && `estado ${filtros.estado === 'ANULADO' ? 'Anulado' : 'Registrado'}`,
    filtros.buscar?.trim() && `búsqueda «${filtros.buscar.trim()}»`,
  ].filter(Boolean);
  return partes.length ? partes.join(' · ') : 'todos los pagos';
}

/**
 * Consultas de pagos de M5: historial con exportación (RF-M5-16), comprobante
 * en PDF (RF-M5-15) y estado de cuenta de un patinador (RF-M5-17 y RF-M5-18).
 */
@Injectable()
export class ConsultasPagosService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly consultas: ConsultasPagosRepository,
    private readonly cartera: CarteraRepository,
    private readonly patinadores: PatinadoresRepository,
  ) {}

  /** RF-M5-16: pagos con filtros; los anulados aparecen, pero no suman al total. */
  async historial(filtros: FiltrosHistorialDto) {
    validarRango(filtros);
    const pagos = await this.consultas.historial(this.baseDatos.consultor, filtros);
    return {
      pagos,
      total: totalSinAnulados(pagos),
      registrados: pagos.filter((p) => p.estado === 'REGISTRADO').length,
      limite: LIMITE_HISTORIAL,
    };
  }

  /** RF-M5-16: el historial filtrado en PDF o XLSX. */
  async exportarHistorial(usuario: UsuarioAutenticado, dto: ExportarHistorialDto): Promise<Archivo> {
    validarRango(dto);
    const [pagos, [autor]] = await Promise.all([
      this.consultas.historial(this.baseDatos.consultor, dto),
      this.baseDatos.consultar<{ nombre: string }>(
        `SELECT nombres || ' ' || apellidos AS nombre FROM usuario WHERE id = $1`,
        [usuario.id],
      ),
    ]);
    const contexto = { filtros: describirFiltros(dto), generadoPor: autor?.nombre ?? '—', generadoEn: new Date() };
    const sufijo = new Date().toISOString().slice(0, 10);
    if (dto.formato === 'xlsx') {
      return {
        nombre: `historial-pagos-${sufijo}.xlsx`,
        tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        contenido: await historialXlsx(pagos, contexto),
      };
    }
    return {
      nombre: `historial-pagos-${sufijo}.pdf`,
      tipo: 'application/pdf',
      contenido: await historialPdf(pagos, contexto),
    };
  }

  /**
   * RF-M5-15: comprobante en PDF. Administrador y Contador descargan todos; el
   * acudiente, los de sus patinadores; el patinador mayor, los suyos.
   */
  async comprobante(usuario: UsuarioAutenticado, pagoId: number): Promise<Archivo> {
    const consultor = this.baseDatos.consultor;
    const patinadorId = await this.consultas.patinadorDelPago(consultor, pagoId);
    if (patinadorId === null) throw new NotFoundException('El pago no existe');
    validarConsultaDePagos(usuario, await this.patinadores.obtenerContexto(consultor, patinadorId));

    const datos = await this.consultas.datosComprobante(consultor, pagoId);
    if (!datos) throw new NotFoundException('El pago no tiene comprobante');
    return {
      nombre: `comprobante-${datos.numero}.pdf`,
      tipo: 'application/pdf',
      contenido: await comprobantePdf(datos),
    };
  }

  /**
   * Estado de cuenta de un patinador: cartera, plan, cobros y pagos. Lo usan
   * «Mis pagos» del acudiente y del patinador mayor (RF-M5-17, RF-M5-18) y el
   * detalle de la cartera (RF-M5-13). El menor no ve sus pagos.
   */
  async estadoCuenta(usuario: UsuarioAutenticado, patinadorId: number) {
    const consultor = this.baseDatos.consultor;
    validarConsultaDePagos(usuario, await this.patinadores.obtenerContexto(consultor, patinadorId));

    const [cartera, plan, cobros, pagos] = await Promise.all([
      this.cartera.dePatinador(consultor, patinadorId),
      this.consultas.planActual(consultor, patinadorId),
      this.consultas.cobros(consultor, patinadorId),
      this.consultas.historial(consultor, { patinadorId }),
    ]);
    if (!cartera) throw new NotFoundException('El patinador no existe');
    return {
      patinador: {
        id: cartera.patinadorId,
        nombre: cartera.patinador,
        documento: cartera.documento,
        esMenor: cartera.esMenor,
      },
      cartera: {
        estado: cartera.estado,
        saldoPendiente: cartera.saldoPendiente,
        cobrosVencidos: cartera.cobrosVencidos,
        vencimientoMasAntiguo: cartera.vencimientoMasAntiguo,
      },
      plan,
      cobros,
      pagos,
    };
  }
}
