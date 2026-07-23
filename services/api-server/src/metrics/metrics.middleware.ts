import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (req.path === '/metrics') {
      next();
      return;
    }
    const start = process.hrtime.bigint();
    const route = req.route?.path
      ? `${req.baseUrl || ''}${req.route.path}`
      : req.path;

    res.on('finish', () => {
      const sec = Number(process.hrtime.bigint() - start) / 1e9;
      const labels = {
        method: req.method,
        route: route || 'unknown',
        status: String(res.statusCode),
      };
      this.metrics.httpRequests.inc(labels);
      this.metrics.httpDuration.observe(labels, sec);
    });
    next();
  }
}
