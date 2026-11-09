import { Body, Controller, Post } from '@nestjs/common';
import { RegistrarUsuarioDto } from '../dto/registrar-usuario.dto.js';
import { RegistroService } from '../services/registro.service.js';

/** Pantalla pública de acceso (W01): no exige sesión. */
@Controller('m1/acceso')
export class AccesoController {
  constructor(private readonly registroService: RegistroService) {}

  /** RF-M1-01: crear una cuenta propia (Patinador, Acudiente, Profesor o Visitante). */
  @Post('registro')
  registrar(@Body() dto: RegistrarUsuarioDto) {
    return this.registroService.registrar(dto);
  }
}
