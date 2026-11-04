import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { Roles } from './auth/roles.decorator';
import { RolesGuard } from './auth/roles.guard';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { ListPlansQueryDto } from './dto/list-plans-query.dto';
import { PlanesService } from './planes.service';

interface AuthenticatedRequest extends Request {
  user?: { sub?: string; id?: string; userId?: string; role?: string; roles?: string[] };
}

@Controller('planes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador')
export class PlanesController {
  constructor(private readonly planesService: PlanesService) {}

  @Get()
  list(@Query() query: ListPlansQueryDto) {
    return this.planesService.list(query);
  }

  @Post()
  create(@Body() dto: CreatePlanDto, @Req() request: AuthenticatedRequest) {
    return this.planesService.create(dto, this.actorId(request));
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePlanDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.planesService.update(id, dto, this.actorId(request));
  }

  // No se expone DELETE: RF-M5-03 exige desactivación lógica y conservación del historial.
  @Patch(':id/desactivar')
  deactivate(@Param('id', new ParseUUIDPipe()) id: string, @Req() request: AuthenticatedRequest) {
    return this.planesService.deactivate(id, this.actorId(request));
  }

  @Post(':id/tarifas')
  registerTariff(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateTariffDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.planesService.registerTariff(id, dto, this.actorId(request));
  }

  @Get(':id/tarifas')
  tariffHistory(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.planesService.tariffHistory(id);
  }

  @Get(':id/auditoria')
  auditHistory(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.planesService.auditHistory(id);
  }

  private actorId(request: AuthenticatedRequest): string {
    const user = request.user;
    const id = user?.sub ?? user?.id ?? user?.userId;
    if (!id) throw new UnauthorizedException('El usuario autenticado no incluye un identificador.');
    return String(id);
  }
}
