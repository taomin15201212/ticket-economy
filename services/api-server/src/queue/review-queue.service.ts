import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import type { Channel, ChannelModel } from 'amqplib';

export type TicketReviewJob = {
  ticketId: number;
  userId: number;
  imageUrl?: string;
  ticketType?: string;
};

type Handler = (job: TicketReviewJob) => Promise<void>;

/** Legacy combined review queue (API consumes). */
const QUEUE_REVIEW = 'ticket.review';
/** Split pipeline: API → ocr-worker (docs/05). */
const QUEUE_UPLOAD = 'ticket.upload';
/** Asserted for workers topology. */
const QUEUE_OCR_FINISHED = 'ticket.ocr.finished';
const QUEUE_EXPIRE = 'coupon.expire.scan';

/**
 * Ticket review job queue.
 * - QUEUE_MODE=memory (default): in-process async queue
 * - QUEUE_MODE=rabbitmq: publish/consume via RabbitMQ when available
 * - REVIEW_PIPELINE=combined|split
 *   - combined: publish+consume ticket.review in API
 *   - split: publish ticket.upload only (services/workers handles OCR→AI)
 */
@Injectable()
export class ReviewQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReviewQueueService.name);
  private handler: Handler | null = null;
  private conn: ChannelModel | null = null;
  private ch: Channel | null = null;
  private memoryQ: TicketReviewJob[] = [];
  private pumping = false;
  mode: 'memory' | 'rabbitmq' = 'memory';
  pipeline: 'combined' | 'split' = 'combined';

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const p = this.config.get<string>('REVIEW_PIPELINE', 'combined');
    this.pipeline = p === 'split' ? 'split' : 'combined';

    const want = this.config.get<string>('QUEUE_MODE', 'memory');
    if (want !== 'rabbitmq') {
      this.logger.log(
        `Review queue mode=memory pipeline=${this.pipeline}` +
          (this.pipeline === 'split'
            ? ' (split needs rabbitmq; will fall back to combined memory handler)'
            : ''),
      );
      // split without MQ cannot reach external workers
      if (this.pipeline === 'split') {
        this.logger.warn(
          'REVIEW_PIPELINE=split but QUEUE_MODE=memory → force combined in-process',
        );
        this.pipeline = 'combined';
      }
      return;
    }
    const url =
      this.config.get<string>('RABBITMQ_URL') ||
      'amqp://te:te_pass@127.0.0.1:5672';
    try {
      const conn = await amqp.connect(url);
      const ch = await conn.createChannel();
      await ch.assertQueue(QUEUE_REVIEW, { durable: true });
      await ch.assertQueue(QUEUE_UPLOAD, { durable: true });
      await ch.assertQueue(QUEUE_OCR_FINISHED, { durable: true });
      await ch.assertQueue(QUEUE_EXPIRE, { durable: true });
      this.conn = conn;
      this.ch = ch;
      this.mode = 'rabbitmq';
      this.logger.log(
        `RabbitMQ connected pipeline=${this.pipeline} queues=${QUEUE_REVIEW},${QUEUE_UPLOAD}`,
      );

      if (this.pipeline === 'combined') {
        await ch.consume(QUEUE_REVIEW, (msg) => {
          if (!msg) return;
          void (async () => {
            try {
              const job = JSON.parse(msg.content.toString()) as TicketReviewJob;
              if (this.handler) await this.handler(job);
              ch.ack(msg);
            } catch (e) {
              this.logger.error(`job failed: ${(e as Error).message}`);
              ch.nack(msg, false, false);
            }
          })();
        });
      }
    } catch (e) {
      this.logger.warn(
        `RabbitMQ unavailable (${(e as Error).message}) → memory queue`,
      );
      this.mode = 'memory';
      if (this.pipeline === 'split') {
        this.logger.warn(
          'REVIEW_PIPELINE=split but RabbitMQ down → force combined memory',
        );
        this.pipeline = 'combined';
      }
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

  setHandler(handler: Handler) {
    this.handler = handler;
  }

  async enqueue(job: TicketReviewJob) {
    if (this.mode === 'rabbitmq' && this.ch) {
      if (this.pipeline === 'split') {
        this.ch.sendToQueue(
          QUEUE_UPLOAD,
          Buffer.from(
            JSON.stringify({
              ticketId: job.ticketId,
              userId: job.userId,
              imageUrl: job.imageUrl,
              ticketType: job.ticketType,
              attempt: 0,
            }),
          ),
          { persistent: true },
        );
        this.logger.log(`published ticket.upload #${job.ticketId}`);
        return;
      }
      this.ch.sendToQueue(QUEUE_REVIEW, Buffer.from(JSON.stringify(job)), {
        persistent: true,
      });
      return;
    }
    this.memoryQ.push(job);
    void this.pump();
  }

  private async pump() {
    if (this.pumping) return;
    this.pumping = true;
    while (this.memoryQ.length) {
      const job = this.memoryQ.shift()!;
      try {
        if (this.handler) await this.handler(job);
      } catch (e) {
        this.logger.error(`memory job failed: ${(e as Error).message}`);
      }
      // small yield so API can return before review finishes in async mode
      await new Promise((r) => setTimeout(r, 30));
    }
    this.pumping = false;
  }
}
