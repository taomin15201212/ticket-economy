import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MysqlService } from '../mysql/mysql.service';
import { APP_REPOSITORY } from '../store/app.repository';
import type { AppRepository } from '../store/app.repository';
import { WechatService } from './wechat.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(APP_REPOSITORY) private readonly repo: AppRepository,
    private readonly jwt: JwtService,
    private readonly mysql: MysqlService,
    private readonly wechat: WechatService,
  ) {}

  /**
   * Mini-program login (Sprint 10: async SQL when DB_MODE=mysql-sql).
   */
  async loginWithWechatCode(code: string, deviceId?: string) {
    const session = await this.wechat.code2session(code);

    let user = this.mysql.isPureSql()
      ? await this.mysql.findUserByOpenidSql(session.openid)
      : this.repo.findUserByOpenid(session.openid) || null;

    if (!user) {
      const created = this.repo.createUser({
        openid: session.openid,
        nickname: `游客${session.openid.slice(-4)}`,
        avatar: '',
        phone: null,
        level: 1,
        totalPoints: 0,
        totalCost: 0,
        status: 1,
      });
      if (this.mysql.isPureSql()) {
        user = await this.mysql.upsertUserSql(created);
      } else {
        void this.mysql.saveUser(created);
        user = created;
      }
    }

    const accessToken = this.jwt.sign({
      sub: user.id,
      role: 'user',
      deviceId,
      openid: session.openid,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      provider: session.provider,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        level: user.level,
        totalPoints: user.totalPoints,
      },
      sqlMode: this.mysql.isPureSql(),
    };
  }

  async merchantLogin(username: string, password: string) {
    const account = this.repo.findMerchantAccountByUsername(username);
    if (!account) {
      throw new UnauthorizedException('账号或密码错误');
    }
    const ok = await bcrypt.compare(password, account.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('账号或密码错误');
    }
    const merchant = this.repo.findMerchant(account.merchantId);
    const accessToken = this.jwt.sign({
      sub: account.id,
      role: 'merchant',
      merchantId: account.merchantId,
    });
    return {
      accessToken,
      tokenType: 'Bearer',
      account: {
        id: account.id,
        username: account.username,
        role: account.role,
        merchantId: account.merchantId,
        merchantName: merchant?.merchantName,
        storeName: merchant?.storeName,
      },
    };
  }

  adminLogin(username: string, password: string) {
    if (username !== 'admin' || password !== 'admin123') {
      throw new UnauthorizedException('管理员账号或密码错误');
    }
    const accessToken = this.jwt.sign({
      sub: 1,
      role: 'admin',
      username: 'admin',
    });
    return {
      accessToken,
      tokenType: 'Bearer',
      admin: { id: 1, username: 'admin', displayName: '超级管理员' },
    };
  }
}
