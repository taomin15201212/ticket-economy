import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WechatService } from './wechat.service';

describe('WechatService', () => {
  it('mock mode maps demo code to seed openid', async () => {
    const cfg = {
      get: (k: string, d?: string) =>
        k === 'WECHAT_MODE' ? 'mock' : d,
    } as unknown as ConfigService;
    const svc = new WechatService(cfg);
    const s = await svc.code2session('demo');
    expect(s.openid).toBe('demo_openid_user1');
    expect(s.provider).toBe('mock');
  });

  it('mock mode prefixes other codes', async () => {
    const cfg = {
      get: (k: string, d?: string) =>
        k === 'WECHAT_MODE' ? 'mock' : d,
    } as unknown as ConfigService;
    const svc = new WechatService(cfg);
    const s = await svc.code2session('abc123');
    expect(s.openid).toBe('wx_abc123');
  });

  it('real mode without credentials throws', async () => {
    const cfg = {
      get: (k: string, d?: string) => {
        if (k === 'WECHAT_MODE') return 'real';
        return d;
      },
    } as unknown as ConfigService;
    const svc = new WechatService(cfg);
    await expect(svc.code2session('x')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
