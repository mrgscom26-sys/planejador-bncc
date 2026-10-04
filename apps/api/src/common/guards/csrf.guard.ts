import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    // Safe read-only HTTP methods do not require CSRF header
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Exclude public login if requested directly without cookies
    if (request.path === '/api/auth/login' || request.path === '/auth/login') {
      return true;
    }

    // Validate custom header for mutations
    const requestedWith = request.headers['x-requested-with'];
    const hasAuthBearer = request.headers['authorization']?.startsWith('Bearer ');

    if (!requestedWith && !hasAuthBearer) {
      throw new ForbiddenException('Requisição rejeitada por proteção CSRF. Cabeçalho x-requested-with ausente.');
    }

    return true;
  }
}
