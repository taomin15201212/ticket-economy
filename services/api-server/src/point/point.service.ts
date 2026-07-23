import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { APP_REPOSITORY } from '../store/app.repository';
import type { AppRepository } from '../store/app.repository';
import { MysqlService } from '../mysql/mysql.service';

@Injectable()
export class PointService {
  constructor(
    @Inject(APP_REPOSITORY) private readonly repo: AppRepository,
    private readonly mysql: MysqlService,
  ) {}

  addPoints(
    userId: number,
    changeType: string,
    bizId: number | null,
    remark?: string,
    overridePoints?: number,
  ) {
    const rule = this.repo
      .listPointRules()
      .find((r) => r.actionType === changeType && r.status === 1);
    const points =
      overridePoints !== undefined ? overridePoints : (rule?.points ?? 0);
    if (points === 0) return null;

    const user = this.repo.findUserById(userId);
    if (!user) throw new BadRequestException('用户不存在');

    if (points > 0 && rule?.dailyLimit != null) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const count = this.repo
        .listPointLogs(userId)
        .filter(
          (l) =>
            l.changeType === changeType && new Date(l.createdAt) >= start,
        ).length;
      if (count >= rule.dailyLimit) {
        return null;
      }
    }

    if (points < 0 && user.totalPoints + points < 0) {
      throw new BadRequestException('积分不足');
    }

    const before = user.totalPoints;
    const after = before + points;
    user.totalPoints = after;
    this.repo.saveUser(user);

    const log = {
      id: this.repo.nextPointLogId(),
      userId,
      changePoints: points,
      beforePoints: before,
      afterPoints: after,
      changeType,
      bizId,
      remark: remark ?? null,
      createdAt: new Date().toISOString(),
    };
    this.repo.addPointLog(log);
    void this.mysql.saveUserPoints(userId, user.totalPoints);
    void this.mysql.savePointLog(log);
    return log;
  }

  list(userId: number, page = 1, pageSize = 20) {
    const all = this.repo
      .listPointLogs(userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const start = (page - 1) * pageSize;
    return {
      list: all.slice(start, start + pageSize),
      total: all.length,
      page,
      pageSize,
    };
  }

  rank(limit = 50) {
    return [...this.repo.listUsers()]
      .filter((u) => u.status === 1)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit)
      .map((u, i) => ({
        rank: i + 1,
        userId: u.id,
        nickname: u.nickname,
        totalPoints: u.totalPoints,
        level: u.level,
      }));
  }

  listGoods() {
    return this.repo.listPointGoods().filter((g) => g.status === 1);
  }

  listExchanges(userId: number, page = 1, pageSize = 20) {
    const all = this.repo
      .listPointExchanges(userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const start = (page - 1) * pageSize;
    const list = all.slice(start, start + pageSize).map((e) => ({
      ...e,
      goods: this.repo.findPointGoods(e.goodsId) || null,
    }));
    return { list, total: all.length, page, pageSize };
  }

  exchange(userId: number, goodsId: number) {
    const goods = this.repo.findPointGoods(goodsId);
    if (!goods || goods.status !== 1) {
      throw new NotFoundException('商品不存在或已下架');
    }
    if (goods.stock <= 0) throw new BadRequestException('库存不足');

    const user = this.repo.findUserById(userId);
    if (!user) throw new BadRequestException('用户不存在');
    if (user.totalPoints < goods.needPoints) {
      throw new BadRequestException(
        `积分不足（需要 ${goods.needPoints}，当前 ${user.totalPoints}）`,
      );
    }

    goods.stock -= 1;
    this.repo.savePointGoods(goods);
    void this.mysql.savePointGoods(goods);
    this.addPoints(
      userId,
      'exchange',
      goods.id,
      `兑换：${goods.goodsName}`,
      -goods.needPoints,
    );

    const row = {
      id: this.repo.nextPointExchangeId(),
      userId,
      goodsId: goods.id,
      needPoints: goods.needPoints,
      status: 1,
      createdAt: new Date().toISOString(),
    };
    this.repo.savePointExchange(row);
    return {
      exchange: row,
      goods,
      balance: user.totalPoints,
    };
  }

  adminUpsertGoods(body: {
    id?: number;
    goodsName: string;
    needPoints: number;
    stock?: number;
    description?: string | null;
    image?: string | null;
    status?: number;
  }) {
    if (body.id) {
      const g = this.repo.findPointGoods(body.id);
      if (!g) throw new NotFoundException('商品不存在');
      g.goodsName = body.goodsName ?? g.goodsName;
      g.needPoints = body.needPoints ?? g.needPoints;
      if (body.stock !== undefined) g.stock = body.stock;
      if (body.description !== undefined) g.description = body.description;
      if (body.image !== undefined) g.image = body.image;
      if (body.status !== undefined) g.status = body.status;
      this.repo.savePointGoods(g);
      void this.mysql.savePointGoods(g);
      return g;
    }
    const row = {
      id: this.repo.nextPointGoodsId(),
      goodsName: body.goodsName,
      needPoints: Number(body.needPoints),
      stock: body.stock ?? 0,
      image: body.image ?? null,
      description: body.description ?? null,
      status: body.status ?? 1,
    };
    this.repo.savePointGoods(row);
    void this.mysql.savePointGoods(row);
    return row;
  }
}
