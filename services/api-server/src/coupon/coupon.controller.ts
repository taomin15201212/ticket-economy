import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ok } from '../common/api-response';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CouponService } from './coupon.service';

@Controller('api/coupon')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CouponController {
  constructor(private readonly coupons: CouponService) {}

  @Get('list')
  @Roles('user')
  list(
    @CurrentUser() user: { userId: number },
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return ok(
      this.coupons.list(
        user.userId,
        status === undefined ? undefined : Number(status),
        Number(page) || 1,
        Number(pageSize) || 20,
      ),
    );
  }

  @Get('detail/:id')
  @Roles('user')
  detail(@CurrentUser() user: { userId: number }, @Param('id') id: string) {
    return ok(this.coupons.detail(user.userId, Number(id)));
  }

  @Post('lock')
  @Roles('user', 'merchant')
  lock(
    @Body() body: { couponCode: string; merchantId?: number },
  ) {
    return ok(this.coupons.lock(body.couponCode, body.merchantId));
  }

  @Post('use')
  @Roles('user', 'merchant')
  use(
    @CurrentUser() user: { userId: number; merchantId?: number },
    @Body()
    body: {
      couponCode: string;
      merchantId: number;
      verifyType?: string;
      requestId?: string;
    },
  ) {
    return ok(
      this.coupons.use({
        couponCode: body.couponCode,
        merchantId: Number(body.merchantId || user.merchantId),
        verifyType: body.verifyType,
        requestId: body.requestId,
        operatorId: user.userId,
      }),
    );
  }
}
