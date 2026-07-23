import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

/**
 * Prometheus metrics (Sprint 9).
 * Scraped at GET /metrics (text/plain).
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  readonly httpRequests: Counter<string>;
  readonly httpDuration: Histogram<string>;
  readonly ticketsSubmitted: Counter<string>;
  readonly ticketsApproved: Counter<string>;
  readonly blindboxOpened: Counter<string>;
  readonly couponsRedeemed: Counter<string>;
  readonly checkins: Counter<string>;
  readonly appInfo: Gauge<string>;

  constructor() {
    this.httpRequests = new Counter({
      name: 'te_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });
    this.httpDuration = new Histogram({
      name: 'te_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });
    this.ticketsSubmitted = new Counter({
      name: 'te_tickets_submitted_total',
      help: 'Tickets submitted for review',
      registers: [this.registry],
    });
    this.ticketsApproved = new Counter({
      name: 'te_tickets_approved_total',
      help: 'Tickets approved (auto or manual)',
      registers: [this.registry],
    });
    this.blindboxOpened = new Counter({
      name: 'te_blindbox_opened_total',
      help: 'Blind boxes opened',
      labelNames: ['result'],
      registers: [this.registry],
    });
    this.couponsRedeemed = new Counter({
      name: 'te_coupons_redeemed_total',
      help: 'Coupons redeemed by merchants',
      registers: [this.registry],
    });
    this.checkins = new Counter({
      name: 'te_checkins_total',
      help: 'User check-ins',
      labelNames: ['status'],
      registers: [this.registry],
    });
    this.appInfo = new Gauge({
      name: 'te_app_info',
      help: 'App info gauge',
      labelNames: ['version', 'db_mode'],
      registers: [this.registry],
    });
  }

  onModuleInit() {
    collectDefaultMetrics({ register: this.registry, prefix: 'te_' });
    this.appInfo.set(
      {
        version: process.env.npm_package_version || '0.0.1',
        db_mode: process.env.DB_MODE || 'memory',
      },
      1,
    );
  }

  async metricsText(): Promise<string> {
    return this.registry.metrics();
  }

  contentType() {
    return this.registry.contentType;
  }
}
