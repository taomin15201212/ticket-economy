import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { APP_REPOSITORY } from '../store/app.repository';
import type { AppRepository } from '../store/app.repository';
import { MysqlService } from '../mysql/mysql.service';
import { BlindBoxRewardRow, CouponTemplateRow } from '../store/types';

@Injectable()
export class CatalogService {
  constructor(
    @Inject(APP_REPOSITORY) private readonly repo: AppRepository,
    private readonly mysql: MysqlService,
  ) {}

  listCouponTemplates() {
    return this.repo.listCouponTemplates();
  }

  createCouponTemplate(body: {
    couponName: string;
    couponType: string;
    amount?: number | null;
    discountDesc?: string | null;
    totalCount?: number;
    validDays?: number | null;
    status?: number;
  }) {
    if (!body.couponName?.trim()) {
      throw new BadRequestException('couponName 必填');
    }
    const total = body.totalCount ?? 1000;
    const row: CouponTemplateRow = {
      id: this.repo.nextCouponTemplateId(),
      couponName: body.couponName.trim(),
      couponType: body.couponType || 'merchant',
      amount: body.amount ?? null,
      discountDesc: body.discountDesc ?? null,
      totalCount: total,
      remainCount: total,
      validDays: body.validDays ?? 30,
      status: body.status ?? 1,
    };
    this.repo.saveCouponTemplate(row);
    void this.mysql.saveCouponTemplate(row);
    return row;
  }

  updateCouponTemplate(
    id: number,
    body: Partial<{
      couponName: string;
      couponType: string;
      amount: number | null;
      discountDesc: string | null;
      totalCount: number;
      remainCount: number;
      validDays: number | null;
      status: number;
    }>,
  ) {
    const row = this.repo.findCouponTemplate(id);
    if (!row) throw new NotFoundException('券模板不存在');
    if (body.couponName !== undefined) row.couponName = body.couponName;
    if (body.couponType !== undefined) row.couponType = body.couponType;
    if (body.amount !== undefined) row.amount = body.amount;
    if (body.discountDesc !== undefined) row.discountDesc = body.discountDesc;
    if (body.totalCount !== undefined) row.totalCount = body.totalCount;
    if (body.remainCount !== undefined) row.remainCount = body.remainCount;
    if (body.validDays !== undefined) row.validDays = body.validDays;
    if (body.status !== undefined) row.status = body.status;
    this.repo.saveCouponTemplate(row);
    void this.mysql.saveCouponTemplate(row);
    return row;
  }

  listBlindBoxes() {
    return this.repo.listBlindBoxes().map((b) => ({
      ...b,
      rewards: this.repo.listRewards(b.id),
    }));
  }

  updateBlindBox(
    id: number,
    body: Partial<{ boxName: string; dayLimit: number | null; status: number }>,
  ) {
    const box = this.repo.findBlindBox(id);
    if (!box) throw new NotFoundException('盲盒不存在');
    if (body.boxName !== undefined) box.boxName = body.boxName;
    if (body.dayLimit !== undefined) box.dayLimit = body.dayLimit;
    if (body.status !== undefined) box.status = body.status;
    this.repo.saveBlindBox(box);
    return box;
  }

  createReward(
    blindBoxId: number,
    body: {
      rewardName: string;
      couponTemplateId?: number | null;
      weight?: number;
      stock?: number;
      isThanks?: number;
      status?: number;
    },
  ) {
    const box = this.repo.findBlindBox(blindBoxId);
    if (!box) throw new NotFoundException('盲盒不存在');
    if (!body.rewardName?.trim()) {
      throw new BadRequestException('rewardName 必填');
    }
    const stock = body.stock ?? 1000;
    const row: BlindBoxRewardRow = {
      id: this.repo.nextRewardId(),
      blindBoxId,
      rewardName: body.rewardName.trim(),
      couponTemplateId: body.couponTemplateId ?? null,
      weight: body.weight ?? 10,
      stock,
      remainStock: stock,
      isThanks: body.isThanks ?? 0,
      status: body.status ?? 1,
    };
    this.repo.saveReward(row);
    return row;
  }

  updateReward(
    id: number,
    body: Partial<{
      rewardName: string;
      couponTemplateId: number | null;
      weight: number;
      stock: number;
      remainStock: number;
      isThanks: number;
      status: number;
    }>,
  ) {
    const row = this.repo.findReward(id);
    if (!row) throw new NotFoundException('奖品不存在');
    Object.assign(row, {
      ...(body.rewardName !== undefined ? { rewardName: body.rewardName } : {}),
      ...(body.couponTemplateId !== undefined
        ? { couponTemplateId: body.couponTemplateId }
        : {}),
      ...(body.weight !== undefined ? { weight: body.weight } : {}),
      ...(body.stock !== undefined ? { stock: body.stock } : {}),
      ...(body.remainStock !== undefined
        ? { remainStock: body.remainStock }
        : {}),
      ...(body.isThanks !== undefined ? { isThanks: body.isThanks } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    });
    this.repo.saveReward(row);
    return row;
  }
}
