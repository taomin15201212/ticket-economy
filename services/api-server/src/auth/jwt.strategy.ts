import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { APP_REPOSITORY } from '../store/app.repository';
import type { AppRepository } from '../store/app.repository';
import { MysqlService } from '../mysql/mysql.service';

export type JwtPayload = {
  sub: number;
  role: 'user' | 'merchant' | 'admin';
  merchantId?: number;
  username?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @Inject(APP_REPOSITORY) private readonly repo: AppRepository,
    private readonly mysql: MysqlService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'dev-secret'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.role === 'user') {
      const user = this.mysql.isPureSql()
        ? await this.mysql.findUserByIdSql(payload.sub)
        : this.repo.findUserById(payload.sub);
      if (!user || user.status !== 1) {
        throw new UnauthorizedException('用户无效');
      }
      return { userId: user.id, role: 'user' as const, user };
    }
    if (payload.role === 'merchant') {
      const account = this.repo.findMerchantAccountById(payload.sub);
      if (!account || account.status !== 1) {
        throw new UnauthorizedException('商户账号无效');
      }
      return {
        userId: account.id,
        role: 'merchant' as const,
        merchantId: account.merchantId,
        account,
      };
    }
    if (payload.role === 'admin') {
      return {
        userId: payload.sub,
        role: 'admin' as const,
        username: payload.username ?? 'admin',
      };
    }
    throw new UnauthorizedException('未知角色');
  }
}
