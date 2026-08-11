import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { isTestAccount } from './test-accounts';

@Injectable()
export class TestAccountGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    if (!isTestAccount(request.user?.email)) {
      throw new ForbiddenException('Narzędzia testowe są dostępne wyłącznie dla kont testowych');
    }
    return true;
  }
}
