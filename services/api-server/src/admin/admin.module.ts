import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { RiskModule } from '../risk/risk.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CouponModule } from '../coupon/coupon.module';
import { PointModule } from '../point/point.module';
import { TicketModule } from '../ticket/ticket.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    ActivityModule,
    RiskModule,
    TicketModule,
    CatalogModule,
    PointModule,
    CouponModule,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
