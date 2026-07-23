import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiClientService } from './ai/ai-client.service';
import { ApiClientService } from './api/api-client.service';
import { HealthController } from './health.controller';
import { MqService } from './mq/mq.service';
import { AiWorker } from './workers/ai.worker';
import { ExpireWorker } from './workers/expire.worker';
import { OcrWorker } from './workers/ocr.worker';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController],
  providers: [
    MqService,
    AiClientService,
    ApiClientService,
    OcrWorker,
    AiWorker,
    ExpireWorker,
  ],
})
export class AppModule {}
