import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class WorkerAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const secret =
      this.config.get<string>('WORKER_SECRET') || 'te-worker-dev-secret';
    const header = req.header('x-worker-secret') || req.header('X-Worker-Secret');
    if (!header || header !== secret) {
      throw new UnauthorizedException('invalid worker secret');
    }
    return true;
  }
}
