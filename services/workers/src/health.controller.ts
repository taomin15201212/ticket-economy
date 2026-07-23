import { Controller, Get } from '@nestjs/common';
import { AiClientService } from './ai/ai-client.service';
import { ApiClientService } from './api/api-client.service';
import { MqService } from './mq/mq.service';
import { AiWorker } from './workers/ai.worker';
import { ExpireWorker } from './workers/expire.worker';
import { OcrWorker } from './workers/ocr.worker';

@Controller()
export class HealthController {
  constructor(
    private readonly mq: MqService,
    private readonly api: ApiClientService,
    private readonly ai: AiClientService,
    private readonly ocr: OcrWorker,
    private readonly aiWorker: AiWorker,
    private readonly expire: ExpireWorker,
  ) {}

  @Get('health')
  async health() {
    const apiOk = await this.api.health();
    return {
      code: 0,
      data: {
        status: 'up',
        service: 'ticket-economy-workers',
        infra: {
          rabbitmq: this.mq.mode,
          api: apiOk ? 'up' : 'down',
          ai: this.ai.provider,
        },
        stats: {
          ocr: this.ocr.stats,
          ai: this.aiWorker.stats,
          expire: this.expire.stats,
        },
      },
    };
  }

  @Get()
  root() {
    return {
      code: 0,
      data: {
        name: 'ticket-economy-workers',
        workers: ['ocr', 'ai', 'expire'],
        queues: ['ticket.upload', 'ticket.ocr.finished', 'coupon.expire.scan'],
      },
    };
  }
}
