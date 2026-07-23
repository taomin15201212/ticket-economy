import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  info() {
    return {
      name: '文旅消费券积分平台 API',
      version: '0.1.0',
      docs: '/health',
      loop: [
        'POST /api/auth/login',
        'POST /api/ticket/upload',
        'POST /api/ticket/submit',
        'POST /api/blindbox/open',
        'POST /api/merchant/login',
        'POST /api/merchant/verify',
      ],
    };
  }
}
