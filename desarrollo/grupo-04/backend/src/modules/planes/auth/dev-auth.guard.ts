
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class DevAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const enabled = process.env.DEV_AUTH_BYPASS === 'true';
    const isProduction = process.env.NODE_ENV === 'production';

    const request = context.switchToHttp().getRequest<
      Request & {
        user?: { sub: string; role: string };
      }
    >();

    const address = request.socket.remoteAddress;
    const isLocal = [
      '127.0.0.1',
      '::1',
      '::ffff:127.0.0.1',
    ].includes(address ?? '');

    if (!enabled || isProduction || !isLocal) {
      throw new ForbiddenException(
        'Acceso temporal permitido solo en desarrollo local.',
      );
    }

    request.user = {
      sub: 'local-dev-admin',
      role: 'Administrador',
    };

    return true;
  }
}
