import { Controller, Get, Inject } from '@nestjs/common';
import { ok } from './common/api-response';
import { AppService } from './app.service';
import { RedisService } from './redis/redis.service';
import { ReviewQueueService } from './queue/review-queue.service';
import { MysqlService } from './mysql/mysql.service';
import { StorageService } from './storage/storage.service';
import { AiGatewayService } from './ai/ai-gateway.service';
import { WechatService } from './auth/wechat.service';
import {
  REPOSITORY_MODE,
  type RepositoryMode,
} from './store/repository.mode';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly redis: RedisService,
    private readonly queue: ReviewQueueService,
    private readonly mysql: MysqlService,
    private readonly storage: StorageService,
    private readonly ai: AiGatewayService,
    private readonly wechat: WechatService,
    @Inject(REPOSITORY_MODE) private readonly repoMode: RepositoryMode,
  ) {}

  @Get()
  root() {
    return ok(this.appService.info());
  }

  @Get('health')
  health() {
    return ok({
      status: 'up',
      service: 'ticket-economy-api',
      infra: {
        redis: this.redis.mode,
        queue: this.queue.mode,
        reviewPipeline: this.queue.pipeline,
        mysql: this.mysql.enabled,
        storage: this.storage.mode,
        ai: this.ai.provider,
        wechat: this.wechat.mode,
        repository: this.repoMode,
      },
    });
  }
}
