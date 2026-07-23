import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ok } from '../common/api-response';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CouponService } from '../coupon/coupon.service';
import { APP_REPOSITORY } from '../store/app.repository';
import type { AppRepository } from '../store/app.repository';

@Controller('api/merchant')
export class MerchantController {
  constructor(
    private readonly auth: AuthService,
    private readonly coupons: CouponService,
    @Inject(APP_REPOSITORY) private readonly repo: AppRepository,
  ) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    return ok(await this.auth.merchantLogin(body.username, body.password));
  }

  @Post('register')
  register(
    @Body()
    body: {
      merchantName: string;
      storeName: string;
      address?: string;
    },
  ) {
    const id = this.repo.nextMerchantId();
    this.repo.saveMerchant({
      id,
      merchantName: body.merchantName,
      storeName: body.storeName,
      address: body.address ?? null,
      status: 0,
    });
    return ok({ merchantId: id, status: 0, message: '已提交待审' });
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('merchant')
  verify(
    @CurrentUser() user: { userId: number; merchantId: number },
    @Body()
    body: { couponCode: string; verifyType?: string; requestId?: string },
  ) {
    return ok(
      this.coupons.use({
        couponCode: body.couponCode,
        merchantId: user.merchantId,
        verifyType: body.verifyType || 'scan',
        requestId: body.requestId,
        operatorId: user.userId,
      }),
    );
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('merchant')
  profile(@CurrentUser() user: { merchantId: number }) {
    const merchant = this.repo.findMerchant(user.merchantId);
    const records = this.recordsOf(user.merchantId);
    return ok({
      merchant,
      stats: this.statsOf(records),
      recent: records.slice(0, 5),
    });
  }

  @Get('store')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('merchant')
  storeInfo(@CurrentUser() user: { merchantId: number }) {
    return ok(this.repo.findMerchant(user.merchantId));
  }

  @Get('use-records')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('merchant')
  useRecords(
    @CurrentUser() user: { merchantId: number },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const all = this.recordsOf(user.merchantId);
    const p = Number(page) || 1;
    const ps = Number(pageSize) || 20;
    const start = (p - 1) * ps;
    return ok({
      list: all.slice(start, start + ps),
      total: all.length,
      page: p,
      pageSize: ps,
    });
  }

  @Get('report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('merchant')
  report(
    @CurrentUser() user: { merchantId: number },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    let records = this.recordsOf(user.merchantId);
    if (from) {
      const fromTs = new Date(from).getTime();
      records = records.filter((r) => new Date(r.useTime).getTime() >= fromTs);
    }
    if (to) {
      const toTs = new Date(to).getTime() + 24 * 3600 * 1000 - 1;
      records = records.filter((r) => new Date(r.useTime).getTime() <= toTs);
    }

    const byType: Record<string, number> = {};
    for (const r of records) {
      const key = r.verifyType || 'scan';
      byType[key] = (byType[key] || 0) + 1;
    }

    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = records.filter(
        (r) => new Date(r.useTime).toISOString().slice(0, 10) === key,
      ).length;
      days.push({ date: key, count });
    }

    return ok({
      total: records.length,
      today: this.statsOf(this.recordsOf(user.merchantId)).todayVerify,
      byVerifyType: byType,
      trend7d: days,
      latest: records.slice(0, 10),
    });
  }

  private recordsOf(merchantId: number) {
    return this.repo
      .listCouponUseRecords(merchantId)
      .sort((a, b) => (a.useTime < b.useTime ? 1 : -1))
      .map((r) => {
        const coupon = this.repo
          .listAllUserCoupons()
          .find((c) => c.id === r.couponId);
        const template = coupon
          ? this.repo.findCouponTemplate(coupon.couponTemplateId)
          : null;
        const user = this.repo.findUserById(r.userId);
        return {
          ...r,
          couponCode: coupon?.couponCode || null,
          couponName: template?.couponName || '消费券',
          userNickname: user?.nickname || `用户${r.userId}`,
        };
      });
  }

  private statsOf(records: { useTime: string }[]): {
    totalVerify: number;
    todayVerify: number;
  } {
    const now = new Date();
    return {
      totalVerify: records.length,
      todayVerify: records.filter((r) => {
        const d = new Date(r.useTime);
        return d.toDateString() === now.toDateString();
      }).length,
    };
  }
}
