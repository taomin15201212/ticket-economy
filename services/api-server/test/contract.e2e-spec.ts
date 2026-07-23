import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/http-exception.filter';

function expectOk(res: { status: number; body: { code: number } }) {
  expect([200, 201]).toContain(res.status);
  expect(res.body.code).toBe(0);
}

/**
 * OpenAPI-aligned contract smoke (memory mode).
 */
describe('API contract (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.DB_MODE = 'memory';
    process.env.REDIS_ENABLED = 'false';
    process.env.MINIO_ENABLED = 'false';
    process.env.QUEUE_MODE = 'memory';
    process.env.REVIEW_MODE = 'sync';
    process.env.AI_MOCK_MODE = 'auto_approve';
    process.env.AI_PROVIDER = 'mock';
    process.env.JWT_SECRET = 'test-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health has infra envelope', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expectOk(res);
    expect(res.body.data.status).toBe('up');
    expect(res.body.data.infra).toMatchObject({
      redis: expect.any(String),
      queue: expect.any(String),
      storage: expect.any(String),
      ai: expect.any(String),
    });
    expect(res.body.traceId).toBeDefined();
  });

  it('main consumer loop contracts', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ code: `e2e_${Date.now()}` });
    expectOk(loginRes);
    const token = loginRes.body.data.accessToken as string;
    const auth = { Authorization: `Bearer ${token}` };

    const up = await request(app.getHttpServer())
      .post('/api/ticket/upload')
      .set(auth)
      .send({
        ticketType: 'dining',
        imageUrl: `https://placehold.co/400x600?text=e2e-${Date.now()}`,
      });
    expectOk(up);
    const ticketId = up.body.data.ticketId as number;

    const sub = await request(app.getHttpServer())
      .post('/api/ticket/submit')
      .set(auth)
      .send({ ticketId });
    expectOk(sub);
    expect(sub.body.data.status).toBe(3);

    let couponCode: string | null = null;
    let openTicketId = ticketId;
    for (let i = 0; i < 6 && !couponCode; i += 1) {
      if (i > 0) {
        const up2 = await request(app.getHttpServer())
          .post('/api/ticket/upload')
          .set(auth)
          .send({
            ticketType: 'dining',
            imageUrl: `https://placehold.co/400x600?text=e2e-${Date.now()}-${i}`,
          });
        expectOk(up2);
        openTicketId = up2.body.data.ticketId as number;
        const sub2 = await request(app.getHttpServer())
          .post('/api/ticket/submit')
          .set(auth)
          .send({ ticketId: openTicketId });
        expectOk(sub2);
      }
      const opened = await request(app.getHttpServer())
        .post('/api/blindbox/open')
        .set(auth)
        .send({ ticketId: openTicketId });
      expectOk(opened);
      couponCode = opened.body.data.coupon?.couponCode ?? null;
    }

    const locs = await request(app.getHttpServer())
      .get('/api/checkin/locations')
      .set(auth);
    expectOk(locs);
    expect(locs.body.data.length).toBeGreaterThan(0);
    const spot = locs.body.data[0];

    const checkin = await request(app.getHttpServer())
      .post('/api/checkin')
      .set(auth)
      .send({
        locationId: spot.id,
        longitude: spot.longitude,
        latitude: spot.latitude,
      });
    expectOk(checkin);
    expect(checkin.body.data.record.verifyStatus).toBe(1);

    const goods = await request(app.getHttpServer())
      .get('/api/point/goods')
      .set(auth);
    expectOk(goods);
    expect(Array.isArray(goods.body.data.list)).toBe(true);

    if (couponCode) {
      const mLogin = await request(app.getHttpServer())
        .post('/api/merchant/login')
        .send({ username: 'merchant01', password: '123456' });
      // filter maps 4xx to HTTP 200 with business code; also accept raw 200/201
      expect([200, 201, 400, 401]).toContain(mLogin.status);
      expect(mLogin.body.code).toBe(0);
      const mToken = mLogin.body.data.accessToken as string;
      const verify = await request(app.getHttpServer())
        .post('/api/merchant/verify')
        .set({ Authorization: `Bearer ${mToken}` })
        .send({
          couponCode,
          verifyType: 'scan',
          requestId: `e2e-${Date.now()}-${Math.random()}`,
        });
      expect([200, 201]).toContain(verify.status);
      expect(verify.body.code).toBe(0);
    }
  });
});
