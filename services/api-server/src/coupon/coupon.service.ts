import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { APP_REPOSITORY } from '../store/app.repository';
import type { AppRepository } from '../store/app.repository';
import { CouponStatus } from '../common/ticket-status';
import { PointService } from '../point/point.service';
import { MysqlService } from '../mysql/mysql.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class CouponService {
  constructor(
    @Inject(APP_REPOSITORY) private readonly repo: AppRepository,
    private readonly points: PointService,
    private readonly mysql: MysqlService,
    private readonly metrics: MetricsService,
  ) {}

  list(userId: number, status?: number, page = 1, pageSize = 20) {
    let all = this.repo.listUserCoupons(userId);
    if (status !== undefined && !Number.isNaN(status)) {
      all = all.filter((c) => c.status === status);
    }
    all = all.sort((a, b) =>
      (a.receiveTime || '') < (b.receiveTime || '') ? 1 : -1,
    );
    const start = (page - 1) * pageSize;
    const list = all.slice(start, start + pageSize).map((c) => ({
      ...c,
      template: this.repo.findCouponTemplate(c.couponTemplateId),
    }));
    return { list, total: all.length, page, pageSize };
  }

  detail(userId: number, id: number) {
    const coupon = this.repo.findUserCouponById(id, userId);
    if (!coupon) throw new NotFoundException('券不存在');
    return {
      ...coupon,
      template: this.repo.findCouponTemplate(coupon.couponTemplateId),
    };
  }

  lock(couponCode: string, merchantId?: number) {
    const coupon = this.repo.findCouponByCode(couponCode);
    if (!coupon) throw new NotFoundException('券码无效');
    if (coupon.status === CouponStatus.Locked) {
      return { coupon, locked: true, merchantId };
    }
    if (coupon.status !== CouponStatus.Received) {
      throw new BadRequestException('券状态不可锁定');
    }
    if (coupon.expireTime && new Date(coupon.expireTime) < new Date()) {
      coupon.status = CouponStatus.Expired;
      this.repo.saveUserCoupon(coupon);
      throw new BadRequestException('券已过期');
    }
    coupon.status = CouponStatus.Locked;
    coupon.lockTime = new Date().toISOString();
    coupon.version += 1;
    this.repo.saveUserCoupon(coupon);
    if (this.mysql.isPureSql()) {
      void this.mysql.upsertCouponSql(coupon);
    } else {
      void this.mysql.saveUserCoupon(coupon);
    }
    return { coupon, locked: true, merchantId };
  }

  use(params: {
    couponCode: string;
    merchantId: number;
    verifyType?: string;
    requestId?: string;
    operatorId?: number;
  }) {
    const {
      couponCode,
      merchantId,
      verifyType = 'scan',
      requestId,
      operatorId,
    } = params;

    if (requestId) {
      const existed = this.repo.findUseRecordByRequestId(requestId);
      if (existed) {
        return { idempotent: true, record: existed };
      }
    }

    let coupon = this.repo.findCouponByCode(couponCode);
    if (!coupon) throw new NotFoundException('券码无效');

    if (coupon.status === CouponStatus.Used) {
      throw new BadRequestException('券已核销');
    }

    if (coupon.status === CouponStatus.Received) {
      this.lock(couponCode, merchantId);
      coupon = this.repo.findCouponByCode(couponCode)!;
    }

    if (coupon.status !== CouponStatus.Locked) {
      throw new BadRequestException('券状态不可核销');
    }

    const merchant = this.repo.findMerchant(merchantId);
    if (!merchant || merchant.status !== 1) {
      throw new BadRequestException('商户无效');
    }

    coupon.status = CouponStatus.Used;
    coupon.useTime = new Date().toISOString();
    coupon.version += 1;
    this.repo.saveUserCoupon(coupon);
    if (this.mysql.isPureSql()) {
      void this.mysql.upsertCouponSql(coupon);
    } else {
      void this.mysql.saveUserCoupon(coupon);
    }

    const record = {
      id: this.repo.nextUseRecordId(),
      couponId: coupon.id,
      userId: coupon.userId,
      merchantId,
      operatorId: operatorId ?? null,
      verifyType,
      requestId: requestId ?? null,
      useTime: coupon.useTime,
    };
    this.repo.saveCouponUseRecord(record);

    this.points.addPoints(
      coupon.userId,
      'use_coupon',
      coupon.id,
      `核销于商户#${merchantId}`,
    );
    this.metrics.couponsRedeemed.inc();
    this.repo.pushMessage(
      coupon.userId,
      '消费券已核销',
      `券码 ${coupon.couponCode} 已在商户#${merchantId} 核销，积分已到账。`,
      'coupon',
      coupon.id,
    );

    return {
      idempotent: false,
      record,
      coupon,
      merchant: {
        id: merchant.id,
        merchantName: merchant.merchantName,
        storeName: merchant.storeName,
      },
    };
  }

  /**
   * Mark received/locked coupons past expireTime as Expired.
   * Called by services/workers expire scanner (or admin).
   */
  expireScan(limit = 200) {
    const now = Date.now();
    const candidates = this.repo
      .listAllUserCoupons()
      .filter(
        (c) =>
          (c.status === CouponStatus.Received ||
            c.status === CouponStatus.Locked) &&
          c.expireTime &&
          new Date(c.expireTime).getTime() < now,
      )
      .slice(0, Math.max(1, limit));

    let expired = 0;
    for (const coupon of candidates) {
      coupon.status = CouponStatus.Expired;
      coupon.version += 1;
      this.repo.saveUserCoupon(coupon);
      if (this.mysql.isPureSql()) {
        void this.mysql.upsertCouponSql(coupon);
      } else {
        void this.mysql.saveUserCoupon(coupon);
      }
      this.repo.pushMessage(
        coupon.userId,
        '消费券已过期',
        `券码 ${coupon.couponCode} 已过期。`,
        'coupon',
        coupon.id,
      );
      expired += 1;
    }
    return { scanned: candidates.length, expired, limit };
  }
}
