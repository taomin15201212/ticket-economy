import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { AiClientService } from '../ai/ai-client.service';
import { ApiClientService } from '../api/api-client.service';
import { QUEUES, type TicketOcrFinishedJob } from '../common/queues';
import { MqService } from '../mq/mq.service';

/**
 * ai-worker: ticket.ocr.finished → risk score → API apply decision
 */
@Injectable()
export class AiWorker implements OnApplicationBootstrap {
  private readonly logger = new Logger(AiWorker.name);
  private processed = 0;

  constructor(
    private readonly mq: MqService,
    private readonly ai: AiClientService,
    private readonly api: ApiClientService,
  ) {}

  get stats() {
    return { processed: this.processed };
  }

  async onApplicationBootstrap() {
    await this.mq.consume<TicketOcrFinishedJob>(
      QUEUES.TICKET_OCR_FINISHED,
      async (job) => {
        await this.handle(job);
      },
    );
  }

  async handle(job: TicketOcrFinishedJob) {
    const started = Date.now();
    this.logger.log(
      `AI start ticket#${job.ticketId} attempt=${job.attempt || 0}`,
    );

    const risk = await this.ai.riskScore({
      ticketId: job.ticketId,
      imageUrl: job.imageUrl,
      ocr: job.ocr,
    });

    const summary = `${job.ocr.merchantName} ¥${job.ocr.amount} → ${risk.decision}(${risk.riskScore})`;
    await this.api.applyAiDecision(job.ticketId, risk, summary);
    this.processed += 1;
    this.logger.log(
      `AI done ticket#${job.ticketId} decision=${risk.decision} score=${risk.riskScore} ${Date.now() - started}ms`,
    );
  }
}
