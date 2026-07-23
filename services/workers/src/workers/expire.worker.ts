import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiClientService } from '../api/api-client.service';
import { QUEUES, type CouponExpireScanJob } from '../common/queues';
import { MqService } from '../mq/mq.service';

/**
 * coupon expire worker:
 * - consumes coupon.expire.scan
 * - optional timer publishes scan jobs (or calls API directly if MQ offline)
 */
@Injectable()
export class ExpireWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ExpireWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private runs = 0;
  private lastExpired = 0;
  private lastScanned = 0;

  constructor(
    private readonly mq: MqService,
    private readonly api: ApiClientService,
    private readonly config: ConfigService,
  ) {}

  get stats() {
    return {
      runs: this.runs,
      lastExpired: this.lastExpired,
      lastScanned: this.lastScanned,
    };
  }

  async onApplicationBootstrap() {
    await this.mq.consume<CouponExpireScanJob>(
      QUEUES.COUPON_EXPIRE_SCAN,
      async (job) => {
        await this.handle(job);
      },
    );

    const interval = Number(
      this.config.get<string>('EXPIRE_SCAN_INTERVAL_MS') || 60000,
    );
    if (interval > 0) {
      this.timer = setInterval(() => {
        void this.tick();
      }, interval);
      // first run shortly after boot
      setTimeout(() => void this.tick(), 3000);
      this.logger.log(`Expire scanner timer every ${interval}ms`);
    }
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    const job: CouponExpireScanJob = {
      trigger: 'cron',
      at: new Date().toISOString(),
      limit: 200,
    };
    if (this.mq.mode === 'rabbitmq') {
      try {
        await this.mq.publish(QUEUES.COUPON_EXPIRE_SCAN, job);
        return;
      } catch (e) {
        this.logger.warn(
          `publish expire.scan failed: ${(e as Error).message} → direct API`,
        );
      }
    }
    await this.handle(job);
  }

  async handle(job: CouponExpireScanJob) {
    const limit = job.limit ?? 200;
    const result = await this.api.expireScan(limit);
    this.runs += 1;
    this.lastExpired = result.expired;
    this.lastScanned = result.scanned;
    this.logger.log(
      `Expire scan (${job.trigger}) scanned=${result.scanned} expired=${result.expired}`,
    );
  }
}
