import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisService } from './redis/redis.service';
import { ReviewQueueService } from './queue/review-queue.service';
import { MysqlService } from './mysql/mysql.service';
import { StorageService } from './storage/storage.service';
import { AiGatewayService } from './ai/ai-gateway.service';
import { WechatService } from './auth/wechat.service';
import { REPOSITORY_MODE } from './store/repository.mode';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: RedisService, useValue: { mode: 'memory' } },
        {
          provide: ReviewQueueService,
          useValue: { mode: 'memory', pipeline: 'combined' },
        },
        { provide: MysqlService, useValue: { enabled: false } },
        { provide: StorageService, useValue: { mode: 'local' } },
        { provide: AiGatewayService, useValue: { provider: 'mock' } },
        { provide: WechatService, useValue: { mode: 'mock' } },
        { provide: REPOSITORY_MODE, useValue: 'memory' },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should report up', () => {
      const res = appController.health();
      expect(res.code).toBe(0);
      expect(res.data).toEqual(
        expect.objectContaining({
          status: 'up',
          infra: expect.objectContaining({
            redis: 'memory',
            storage: 'local',
            ai: 'mock',
            wechat: 'mock',
            repository: 'memory',
          }),
        }),
      );
    });
  });
});
