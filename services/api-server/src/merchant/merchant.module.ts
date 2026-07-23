import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CouponModule } from '../coupon/coupon.module';
import { MerchantController } from './merchant.controller';

@Module({
  imports: [AuthModule, CouponModule],
  controllers: [MerchantController],
})
export class MerchantModule {}
