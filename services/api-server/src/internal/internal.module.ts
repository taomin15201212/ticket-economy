import { Module } from '@nestjs/common';
import { CouponModule } from '../coupon/coupon.module';
import { TicketModule } from '../ticket/ticket.module';
import { InternalController } from './internal.controller';
import { WorkerAuthGuard } from './worker-auth.guard';

@Module({
  imports: [TicketModule, CouponModule],
  controllers: [InternalController],
  providers: [WorkerAuthGuard],
})
export class InternalModule {}
