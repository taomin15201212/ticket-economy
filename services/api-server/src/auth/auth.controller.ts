import { Body, Controller, Get, Post } from '@nestjs/common';
import { ok } from '../common/api-response';
import { AuthService } from './auth.service';
import { WechatService } from './wechat.service';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly wechat: WechatService,
  ) {}

  @Post('login')
  async login(@Body() body: { code?: string; deviceId?: string }) {
    const data = await this.auth.loginWithWechatCode(
      body.code ?? 'demo',
      body.deviceId,
    );
    return ok(data);
  }

  @Post('logout')
  logout() {
    return ok(true);
  }

  @Post('refresh')
  refresh() {
    return ok({ message: 'use existing token in MVP' });
  }

  @Post('admin/login')
  adminLogin(@Body() body: { username: string; password: string }) {
    return ok(this.auth.adminLogin(body.username, body.password));
  }

  /** Debug: which WeChat mode is active */
  @Get('wechat/mode')
  wechatMode() {
    return ok({ mode: this.wechat.mode });
  }
}
