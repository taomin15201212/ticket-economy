import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import type { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { QUEUES } from '../common/queues';

export type MessageHandler<T> = (job: T, raw: ConsumeMessage) => Promise<void>;

/**
 * RabbitMQ connection + durable queues for workers.
 * Aligns with docs/05 topic names (implemented as durable queues).
 */
@Injectable()
export class MqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqService.name);
  private conn: ChannelModel | null = null;
  private ch: Channel | null = null;
  mode: 'offline' | 'rabbitmq' = 'offline';
  private readonly maxRetries: number;

  constructor(private readonly config: ConfigService) {
    this.maxRetries = Number(
      this.config.get<string>('WORKER_MAX_RETRIES') || 3,
    );
  }

  async onModuleInit() {
    const url =
      this.config.get<string>('RABBITMQ_URL') ||
      'amqp://te:te_pass@127.0.0.1:5672';
    try {
      const conn = await Promise.race([
        amqp.connect(url),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('connect timeout 3s')), 3000),
        ),
      ]);
      const ch = await conn.createChannel();
      await ch.prefetch(5);
      for (const q of Object.values(QUEUES)) {
        await ch.assertQueue(q, { durable: true });
      }
      this.conn = conn;
      this.ch = ch;
      this.mode = 'rabbitmq';
      this.logger.log(
        `RabbitMQ connected; queues=${Object.values(QUEUES).join(',')}`,
      );
      conn.on('error', (err) => {
        this.logger.error(`RabbitMQ error: ${err.message}`);
      });
      conn.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
        this.mode = 'offline';
        this.ch = null;
        this.conn = null;
      });
    } catch (e) {
      this.logger.warn(
        `RabbitMQ unavailable (${(e as Error).message}) → offline (expire timer may still run)`,
      );
      this.mode = 'offline';
    }
  }

  async onModuleDestroy() {
    try {
      await this.ch?.close();
      await this.conn?.close();
    } catch {
      /* ignore */
    }
  }

  async publish(queue: string, payload: unknown) {
    if (!this.ch || this.mode !== 'rabbitmq') {
      throw new Error(`Cannot publish to ${queue}: MQ offline`);
    }
    this.ch.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
  }

  async consume<T>(
    queue: string,
    handler: MessageHandler<T>,
    opts?: { requeueOnFail?: boolean },
  ) {
    if (!this.ch || this.mode !== 'rabbitmq') {
      this.logger.warn(`Skip consume ${queue}: MQ offline`);
      return;
    }
    const ch = this.ch;
    await ch.consume(queue, (msg) => {
      if (!msg) return;
      void (async () => {
        try {
          const job = JSON.parse(msg.content.toString()) as T;
          await handler(job, msg);
          ch.ack(msg);
        } catch (e) {
          const attempt = this.readAttempt(msg);
          this.logger.error(
            `${queue} job failed (attempt=${attempt}): ${(e as Error).message}`,
          );
          if (attempt < this.maxRetries && opts?.requeueOnFail !== false) {
            // republish with incremented attempt then ack original
            try {
              const body = JSON.parse(msg.content.toString()) as Record<
                string,
                unknown
              >;
              body.attempt = attempt + 1;
              ch.sendToQueue(queue, Buffer.from(JSON.stringify(body)), {
                persistent: true,
              });
              ch.ack(msg);
            } catch {
              ch.nack(msg, false, false);
            }
          } else {
            ch.nack(msg, false, false);
          }
        }
      })();
    });
    this.logger.log(`Consuming queue=${queue}`);
  }

  private readAttempt(msg: ConsumeMessage): number {
    try {
      const body = JSON.parse(msg.content.toString()) as { attempt?: number };
      return Number(body.attempt || 0);
    } catch {
      return 0;
    }
  }
}
