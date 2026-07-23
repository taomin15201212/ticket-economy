import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.DB_MODE = 'memory';
    process.env.REDIS_ENABLED = 'false';
    process.env.MINIO_ENABLED = 'false';
    process.env.QUEUE_MODE = 'memory';
    process.env.REVIEW_MODE = 'sync';
    process.env.JWT_SECRET = 'test-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / returns service info envelope', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.name).toContain('文旅');
  });
});
