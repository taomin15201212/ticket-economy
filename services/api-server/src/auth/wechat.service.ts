import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type WechatSession = {
  openid: string;
  unionid?: string | null;
  sessionKey?: string | null;
  provider: 'mock' | 'wechat';
};

/**
 * WeChat mini-program login adapter.
 * WECHAT_MODE=mock (default) | real
 * real uses jscode2session with WECHAT_APPID + WECHAT_SECRET.
 */
@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);

  constructor(private readonly config: ConfigService) {}

  get mode() {
    return this.config.get<string>('WECHAT_MODE', 'mock');
  }

  async code2session(code: string): Promise<WechatSession> {
    if (!code?.trim()) {
      throw new UnauthorizedException('缺少微信 code');
    }

    if (this.mode !== 'real') {
      // demo code reserved for stable seed user
      if (code === 'demo') {
        return {
          openid: 'demo_openid_user1',
          unionid: null,
          sessionKey: null,
          provider: 'mock',
        };
      }
      return {
        openid: `wx_${code}`,
        unionid: null,
        sessionKey: null,
        provider: 'mock',
      };
    }

    const appid = this.config.get<string>('WECHAT_APPID');
    const secret = this.config.get<string>('WECHAT_SECRET');
    if (!appid || !secret) {
      this.logger.error('WECHAT_MODE=real but APPID/SECRET missing');
      throw new UnauthorizedException('微信登录未配置');
    }

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
    url.searchParams.set('appid', appid);
    url.searchParams.set('secret', secret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    try {
      const res = await fetch(url.toString());
      const data = (await res.json()) as {
        openid?: string;
        unionid?: string;
        session_key?: string;
        errcode?: number;
        errmsg?: string;
      };
      if (data.errcode || !data.openid) {
        this.logger.warn(
          `jscode2session fail: ${data.errcode} ${data.errmsg}`,
        );
        throw new UnauthorizedException(
          data.errmsg || '微信登录失败，请重试',
        );
      }
      return {
        openid: data.openid,
        unionid: data.unionid ?? null,
        sessionKey: data.session_key ?? null,
        provider: 'wechat',
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      this.logger.error(`jscode2session network: ${(e as Error).message}`);
      throw new UnauthorizedException('微信登录服务不可用');
    }
  }
}
