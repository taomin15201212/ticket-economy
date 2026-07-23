import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { AiClientService } from '../ai/ai-client.service';
import { ApiClientService } from '../api/api-client.service';
import {
  QUEUES,
  type TicketOcrFinishedJob,
  type TicketUploadJob,
} from '../common/queues';
import { MqService } from '../mq/mq.service';

/**
 * ocr-worker: ticket.upload → OCR → API apply → ticket.ocr.finished
 * Uses OnApplicationBootstrap so MqService.onModuleInit finishes first.
 */
@Injectable()
export class OcrWorker implements OnApplicationBootstrap {
  private readonly logger = new Logger(OcrWorker.name);
  private processed = 0;
  private failed = 0;

  constructor(
    private readonly mq: MqService,
    private readonly ai: AiClientService,
    private readonly api: ApiClientService,
  ) {}

  get stats() {
    return { processed: this.processed, failed: this.failed };
  }

  async onApplicationBootstrap() {
    await this.mq.consume<TicketUploadJob>(
      QUEUES.TICKET_UPLOAD,
      async (job) => {
        await this.handle(job);
      },
    );
  }

  async handle(job: TicketUploadJob) {
    const started = Date.now();
    this.logger.log(
      `OCR start ticket#${job.ticketId} user#${job.userId} attempt=${job.attempt || 0}`,
    );

    let imageUrl = job.imageUrl;
    let ticketType = job.ticketType;
    if (!imageUrl) {
      const t = await this.api.getTicket(job.ticketId);
      if (!t) throw new Error(`ticket#${job.ticketId} not found via API`);
      imageUrl = String(t.imageUrl || '');
      ticketType = ticketType || String(t.ticketType || 'dining');
    }

    const ocr = await this.ai.ocr({
      ticketId: job.ticketId,
      imageUrl,
      ticketType,
    });

    await this.api.applyOcr(job.ticketId, ocr);

    const next: TicketOcrFinishedJob = {
      ticketId: job.ticketId,
      userId: job.userId,
      imageUrl,
      ticketType,
      ocr,
      attempt: 0,
    };
    await this.mq.publish(QUEUES.TICKET_OCR_FINISHED, next);
    this.processed += 1;
    this.logger.log(
      `OCR done ticket#${job.ticketId} merchant=${ocr.merchantName} conf=${ocr.confidence} ${Date.now() - started}ms`,
    );
  }
}
