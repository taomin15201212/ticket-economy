import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { APP_REPOSITORY } from '../store/app.repository';
import type { AppRepository } from '../store/app.repository';
import { CouponStatus, TicketStatus } from '../common/ticket-status';
import { UserCouponRow } from '../store/types';
import { RedisService } from '../redis/redis.service';
import { MysqlService } from '../mysql/mysql.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class BlindboxService {
  constructor(
    @Inject(APP_REPOSITORY) private readonly repo: AppRepository,
    private readonly redis: RedisService,
    private readonly mysql: MysqlService,
    private readonly metrics: MetricsService,
  ) {}

  config() {
    const box = this.repo.listBlindBoxes().find((b) => b.status === 1);
    if (!box) return null;
    const rewards = this.repo
      .listRewards(box.id)
      .filter((r) => r.status === 1)
      .map((r) => ({
        id: r.id,
        rewardName: r.rewardName,
        isThanks: r.isThanks,
      }));
    return { ...box, rewards, redisMode: this.redis.mode };
  }

  async open(userId: number, ticketId: number, blindBoxId?: number) {
    const ticket = this.repo.findTicketById(ticketId);
    if (!ticket || ticket.userId !== userId) {
      throw new NotFoundException('票据不存在');
    }
    if (ticket.status !== TicketStatus.Approved) {
      throw new BadRequestException('仅审核通过的票据可开盲盒');
    }

    const box =
      this.repo
        .listBlindBoxes()
        .find(
          (b) =>
            b.status === 1 &&
            (blindBoxId === undefined || b.id === blindBoxId),
        ) || this.repo.listBlindBoxes().find((b) => b.status === 1);
    if (!box) throw new BadRequestException('暂无可用盲盒');

    if (box.dayLimit != null && box.dayLimit > 0) {
      const key = this.redis.todayKey(`bb:open:${box.id}`, userId);
      const count = await this.redis.incrDaily(
        key,
        this.redis.secondsUntilMidnight(),
      );
      if (count > box.dayLimit) {
        throw new BadRequestException(
          `今日开盲盒次数已达上限（${box.dayLimit}次）`,
        );
      }
    }

    const rewards = this.repo
      .listRewards(box.id)
      .filter((r) => r.status === 1 && r.remainStock > 0);
    if (rewards.length === 0) {
      throw new BadRequestException('盲盒奖品已兑完');
    }

    const totalWeight = rewards.reduce((s, r) => s + r.weight, 0);
    let rnd = Math.floor(Math.random() * totalWeight);
    let hit = rewards[rewards.length - 1];
    for (const r of rewards) {
      if (rnd < r.weight) {
        hit = r;
        break;
      }
      rnd -= r.weight;
    }

    hit.remainStock -= 1;
    this.repo.saveReward(hit);
    void this.mysql.updateRewardStock(hit.id, hit.remainStock);

    ticket.status = TicketStatus.Exchanged;
    ticket.exchangedAt = new Date().toISOString();
    ticket.updatedAt = ticket.exchangedAt;
    this.repo.saveTicket(ticket);
    void this.mysql.saveTicket(ticket);

    let coupon: UserCouponRow | null = null;
    let resultStatus = 0;

    if (!hit.isThanks && hit.couponTemplateId) {
      const tpl = this.repo.findCouponTemplate(hit.couponTemplateId);
      if (!tpl || tpl.remainCount <= 0) {
        resultStatus = 2;
      } else {
        tpl.remainCount -= 1;
        this.repo.saveCouponTemplate(tpl);
        void this.mysql.updateCouponTemplateStock(tpl.id, tpl.remainCount);
        const expire = new Date();
        expire.setDate(expire.getDate() + (tpl.validDays ?? 30));
        coupon = {
          id: this.repo.nextUserCouponId(),
          userId,
          couponTemplateId: tpl.id,
          couponCode: this.repo.newCouponCode(),
          source: 'blindbox',
          status: CouponStatus.Received,
          receiveTime: new Date().toISOString(),
          expireTime: expire.toISOString(),
          lockTime: null,
          useTime: null,
          version: 0,
        };
        this.repo.saveUserCoupon(coupon);
        void this.mysql.saveUserCoupon(coupon);
        resultStatus = 1;
        this.repo.pushMessage(
          userId,
          '盲盒开奖成功',
          `恭喜获得「${hit.rewardName}」，券码 ${coupon.couponCode} 已放入卡包。`,
          'coupon',
          coupon.id,
        );
      }
    }

    this.metrics.blindboxOpened.inc({
      result: hit.isThanks ? 'thanks' : resultStatus === 1 ? 'win' : 'fail',
    });

    return {
      ticketId: ticket.id,
      blindBoxId: box.id,
      reward: {
        id: hit.id,
        rewardName: hit.rewardName,
        isThanks: !!hit.isThanks,
      },
      resultStatus,
      coupon: coupon
        ? {
            id: coupon.id,
            couponCode: coupon.couponCode,
            couponTemplateId: coupon.couponTemplateId,
            expireTime: coupon.expireTime,
            status: coupon.status,
            template: this.repo.findCouponTemplate(coupon.couponTemplateId),
          }
        : null,
    };
  }

  history(userId: number, page = 1, pageSize = 20) {
    const tickets = this.repo
      .listTicketsByUser(userId)
      .filter((t) => t.status === TicketStatus.Exchanged)
      .sort((a, b) => (a.exchangedAt! < b.exchangedAt! ? 1 : -1));
    const start = (page - 1) * pageSize;
    return {
      list: tickets.slice(start, start + pageSize),
      total: tickets.length,
      page,
      pageSize,
    };
  }
}
