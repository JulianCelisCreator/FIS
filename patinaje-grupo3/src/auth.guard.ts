import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
@Injectable()
export class AdminGuard implements CanActivate {
 canActivate(context: ExecutionContext): boolean {
  const valor = context.switchToHttp().getRequest().headers['x-admin-key'];
  const clave = process.env.ADMIN_API_KEY;
  if (!clave || typeof valor !== 'string') throw new UnauthorizedException('Credencial de administrador requerida');
  const a=Buffer.from(valor), b=Buffer.from(clave);
  if(a.length!==b.length || !timingSafeEqual(a,b)) throw new UnauthorizedException('Credencial inválida');
  return true;
 }
}
