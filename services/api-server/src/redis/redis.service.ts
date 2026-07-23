import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis with in-process fallback when Redis is unreachable.
 * Used for: blindbox day limit, simple rate limits.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private readonly mem = new Map<string, { value: number; expireAt?: number }>();
  mode: 'redis' | 'memory' = 'memory';

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const enabled = (this.config.get('REDIS_ENABLED') ?? 'true') === 'true';
    if (!enabled) {
      this.logger.warn('Redis disabled → memory fallback');
      return;
    }
    const host = this.config.get<string>('REDIS_HOST', '127.0.0.1');
    const port = Number(this.config.get('REDIS_PORT') || 6379);
    const password = this.config.get<string>('REDIS_PASSWORD') || undefined;

    let client: Redis | null = null;
    try {
      client = new Redis({
        host,
        port,
        password,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 1500,
        enableOfflineQueue: false,
        // do not keep retrying a protected/unreachable instance
        retryStrategy: () => null,
        reconnectOnError: () => false,
      });
      client.on('error', () => {
        /* suppress reconnect spam after fallback */
      });
      await client.connect();
      await client.ping();
      this.client = client;
      this.mode = 'redis';
      this.logger.log(`Redis connected ${host}:${port}`);
    } catch (e) {
      this.logger.warn(
        `Redis unavailable (${(e as Error).message}) → memory fallback`,
      );
      if (client) {
        try {
          client.disconnect(false);
        } catch {
          /* ignore */
        }
      }
      this.client = null;
      this.mode = 'memory';
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      this.client.disconnect(false);
      this.client = null;
    }
  }

  private purgeExpired(key: string) {
    const row = this.mem.get(key);
    if (row?.expireAt && row.expireAt <= Date.now()) {
      this.mem.delete(key);
    }
  }

  /** INCR key; set TTL only when key is new. Returns new count. */
  async incrDaily(key: string, ttlSeconds: number): Promise<number> {
    if (this.client) {
      const n = await this.client.incr(key);
      if (n === 1) {
        await this.client.expire(key, ttlSeconds);
      }
      return n;
    }
    this.purgeExpired(key);
    const row = this.mem.get(key);
    if (!row) {
      this.mem.set(key, {
        value: 1,
        expireAt: Date.now() + ttlSeconds * 1000,
      });
      return 1;
    }
    row.value += 1;
    return row.value;
  }

  async getNumber(key: string): Promise<number> {
    if (this.client) {
      const v = await this.client.get(key);
      return v ? Number(v) : 0;
    }
    this.purgeExpired(key);
    return this.mem.get(key)?.value ?? 0;
  }

  /** Fixed-window rate limit. Returns true if allowed. */
  async allow(key: string, limit: number, windowSec: number): Promise<boolean> {
    const n = await this.incrDaily(key, windowSec);
    return n <= limit;
  }

  todayKey(prefix: string, id: string | number) {
    const d = new Date();
    const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `${prefix}:${id}:${day}`;
  }

  secondsUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.max(1, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  }
}
