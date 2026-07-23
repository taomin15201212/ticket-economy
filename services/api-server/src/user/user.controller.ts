import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ok } from '../common/api-response';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { APP_REPOSITORY } from '../store/app.repository';
import type { AppRepository } from '../store/app.repository';
import { CouponService } from '../coupon/coupon.service';
import { MysqlService } from '../mysql/mysql.service';

@Controller('api/user')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user')
export class UserController {
  constructor(
    @Inject(APP_REPOSITORY) private readonly repo: AppRepository,
    private readonly coupons: CouponService,
    private readonly mysql: MysqlService,
  ) {}

  @Get('profile')
  profile(@CurrentUser() auth: { userId: number }) {
    return ok(this.repo.findUserById(auth.userId));
  }

  @Put('profile')
  update(
    @CurrentUser() auth: { userId: number },
    @Body() body: { nickname?: string; avatar?: string; phone?: string },
  ) {
    const user = this.repo.findUserById(auth.userId)!;
    if (body.nickname) user.nickname = body.nickname;
    if (body.avatar) user.avatar = body.avatar;
    if (body.phone !== undefined) user.phone = body.phone;
    this.repo.saveUser(user);
    void this.mysql.saveUser(user);
    return ok(user);
  }

  @Get('points')
  points(@CurrentUser() auth: { userId: number }) {
    const user = this.repo.findUserById(auth.userId)!;
    return ok({
      totalPoints: user.totalPoints,
      level: user.level,
      totalCost: user.totalCost,
    });
  }

  @Get('coupons')
  userCoupons(
    @CurrentUser() auth: { userId: number },
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return ok(
      this.coupons.list(
        auth.userId,
        status === undefined ? undefined : Number(status),
        Number(page) || 1,
        Number(pageSize) || 20,
      ),
    );
  }

  @Get('messages')
  messages(
    @CurrentUser() auth: { userId: number },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
  ) {
    const all = this.repo
      .listMessages(auth.userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const p = Number(page) || 1;
    const ps = Number(pageSize) || 50;
    const start = (p - 1) * ps;
    return ok({
      list: all.slice(start, start + ps),
      total: all.length,
      unread: all.filter((m) => m.read === 0).length,
      page: p,
      pageSize: ps,
    });
  }

  @Post('messages/read')
  readMessages(
    @CurrentUser() auth: { userId: number },
    @Body() body: { ids?: number[]; all?: boolean },
  ) {
    const count = this.repo.markMessagesRead(auth.userId, {
      ids: body.ids,
      all: body.all,
    });
    return ok({ updated: count });
  }
}
