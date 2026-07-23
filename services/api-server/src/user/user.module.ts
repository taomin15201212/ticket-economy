import { Module } from '@nestjs/common';
import { CouponModule } from '../coupon/coupon.module';
import { UserController } from './user.controller';

@Module({
  imports: [CouponModule],
  controllers: [UserController],
})
export class UserModule {}
