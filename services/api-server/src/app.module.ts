import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ActivityModule } from './activity/activity.module';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { BlindboxModule } from './blindbox/blindbox.module';
import { CheckinModule } from './checkin/checkin.module';
import { CouponModule } from './coupon/coupon.module';
import { MerchantModule } from './merchant/merchant.module';
import { MysqlModule } from './mysql/mysql.module';
import { PointModule } from './point/point.module';
import { QueueModule } from './queue/queue.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { StoreModule } from './store/store.module';
import { TicketModule } from './ticket/ticket.module';
import { UserModule } from './user/user.module';
import { MetricsModule } from './metrics/metrics.module';
import { InternalModule } from './internal/internal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StoreModule,
    MetricsModule,
    RedisModule,
    QueueModule,
    MysqlModule,
    AiModule,
    StorageModule,
    AuthModule,
    UserModule,
    TicketModule,
    BlindboxModule,
    CouponModule,
    PointModule,
    MerchantModule,
    AdminModule,
    ActivityModule,
    CheckinModule,
    InternalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

