import { Inject, Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ok } from '../common/api-response';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TicketService } from '../ticket/ticket.service';
import { APP_REPOSITORY } from '../store/app.repository';
import type { AppRepository } from '../store/app.repository';
import { TicketStatus } from '../common/ticket-status';
import { CatalogService } from '../catalog/catalog.service';
import { RedisService } from '../redis/redis.service';
import { ReviewQueueService } from '../queue/review-queue.service';
import { MysqlService } from '../mysql/mysql.service';
import { PointService } from '../point/point.service';
import { StorageService } from '../storage/storage.service';
import { AiGatewayService } from '../ai/ai-gateway.service';
import { ActivityService } from '../activity/activity.service';
import { RiskService } from '../risk/risk.service';
import { CouponService } from '../coupon/coupon.service';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly tickets: TicketService,
    @Inject(APP_REPOSITORY) private readonly repo: AppRepository,
    private readonly catalog: CatalogService,
    private readonly redis: RedisService,
    private readonly queue: ReviewQueueService,
    private readonly mysql: MysqlService,
    private readonly points: PointService,
    private readonly storage: StorageService,
    private readonly ai: AiGatewayService,
    private readonly activity: ActivityService,
    private readonly risk: RiskService,
    private readonly coupons: CouponService,
  ) {}

  @Get('ticket/list')
  list(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return ok(
      this.tickets.adminList(
        status === undefined ? undefined : Number(status),
        Number(page) || 1,
        Number(pageSize) || 20,
      ),
    );
  }

  @Post('ticket/review')
  review(
    @CurrentUser() admin: { userId: number },
    @Body()
    body: { ticketId: number; action: 'approve' | 'reject'; reason?: string },
  ) {
    return ok(
      this.tickets.adminReview(
        Number(body.ticketId),
        body.action,
        body.reason,
        admin.userId,
      ),
    );
  }

  @Post('ticket/:id/requeue-ocr')
  async requeueOcr(@Param('id') id: string) {
    return ok(await this.tickets.requeueOcr(Number(id)));
  }

  @Get('dashboard')
  dashboard() {
    const tickets = this.repo.listTickets();
    return ok({
      users: this.repo.listUsers().length,
      merchants: this.repo.listMerchants().length,
      tickets: tickets.length,
      pendingManual: tickets.filter(
        (t) => t.status === TicketStatus.ManualReview,
      ).length,
      approved: tickets.filter((t) => t.status === TicketStatus.Approved)
        .length,
      exchanged: tickets.filter((t) => t.status === TicketStatus.Exchanged)
        .length,
      couponsIssued: this.repo.listAllUserCoupons().length,
      couponsUsed: this.repo.listCouponUseRecords().length,
      infra: {
        redis: this.redis.mode,
        queue: this.queue.mode,
        queueMode: this.queue.mode,
        reviewPipeline: this.queue.pipeline,
        mysql: this.mysql.enabled,
        storage: this.storage.mode,
        ai: this.ai.provider,
      },
      checkins: this.repo.listCheckinRecords().length,
      pointGoods: this.repo.listPointGoods().length,
    });
  }

  /** Manual coupon expire scan (same logic as workers expire-worker). */
  @Post('coupons/expire-scan')
  expireScan(@Body() body: { limit?: number }) {
    return ok(this.coupons.expireScan(body?.limit ?? 200));
  }

  @Get('point/goods')
  pointGoods() {
    return ok(this.repo.listPointGoods());
  }

  @Post('point/goods')
  createPointGoods(
    @Body()
    body: {
      goodsName: string;
      needPoints: number;
      stock?: number;
      description?: string;
      image?: string;
      status?: number;
    },
  ) {
    return ok(this.points.adminUpsertGoods(body));
  }

  @Put('point/goods/:id')
  updatePointGoods(
    @Param('id') id: string,
    @Body()
    body: {
      goodsName?: string;
      needPoints?: number;
      stock?: number;
      description?: string | null;
      image?: string | null;
      status?: number;
    },
  ) {
    const existing = this.repo.listPointGoods().find((g) => g.id === Number(id));
    if (!existing) {
      return ok(null);
    }
    return ok(
      this.points.adminUpsertGoods({
        id: Number(id),
        goodsName: body.goodsName ?? existing.goodsName,
        needPoints: body.needPoints ?? existing.needPoints,
        stock: body.stock,
        description: body.description,
        image: body.image,
        status: body.status,
      }),
    );
  }

  // —— Users ——
  @Get('users')
  users(
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
  ) {
    let all = [...this.repo.listUsers()];
    if (status !== undefined && status !== '') {
      all = all.filter((u) => u.status === Number(status));
    }
    if (keyword) {
      const k = keyword.toLowerCase();
      all = all.filter(
        (u) =>
          u.nickname.toLowerCase().includes(k) ||
          String(u.id).includes(k) ||
          (u.phone || '').includes(k),
      );
    }
    all.sort((x, y) => y.id - x.id);
    const p = Number(page) || 1;
    const ps = Number(pageSize) || 50;
    const start = (p - 1) * ps;
    const list = all.slice(start, start + ps).map((u) => {
      const tickets = this.repo.listTickets().filter((t) => t.userId === u.id).length;
      const coupons = this.repo.listAllUserCoupons().filter((c) => c.userId === u.id).length;
      return {
        id: u.id,
        nickname: u.nickname,
        phone: u.phone,
        level: u.level,
        totalPoints: u.totalPoints,
        totalCost: u.totalCost,
        status: u.status,
        createdAt: u.createdAt,
        tickets,
        coupons,
      };
    });
    return ok({ list, total: all.length, page: p, pageSize: ps });
  }

  @Post('users/:id/blacklist')
  blacklistUser(
    @Param('id') id: string,
    @Body() body: { action: 'block' | 'unblock'; reason?: string },
  ) {
    const user = this.repo.listUsers().find((u) => u.id === Number(id));
    if (!user) return ok(null);
    if (body.action === 'block') {
      user.status = 0;
      this.repo.pushMessage(
        user.id,
        '账号风控提醒',
        body.reason || '您的账号因风控策略已被限制部分能力，如有疑问请联系客服。',
        'system',
        user.id,
      );
    } else {
      user.status = 1;
      this.repo.pushMessage(
        user.id,
        '账号已恢复',
        '您的账号限制已解除，可继续参与票根活动。',
        'system',
        user.id,
      );
    }
    return ok({
      id: user.id,
      status: user.status,
      message: body.action === 'block' ? '已拉黑' : '已解除拉黑',
    });
  }

  // —— Merchants ——
  @Get('merchants')
  merchants(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
  ) {
    let all = [...this.repo.listMerchants()];
    if (status !== undefined && status !== '') {
      all = all.filter((m) => m.status === Number(status));
    }
    all.sort((a, b) => b.id - a.id);
    const p = Number(page) || 1;
    const ps = Number(pageSize) || 50;
    const start = (p - 1) * ps;
    const list = all.slice(start, start + ps).map((m) => {
      const accounts = this.repo.listMerchantAccounts().filter(
        (a) => a.merchantId === m.id,
      );
      const verifyCount = this.repo.listCouponUseRecords().filter(
        (r) => r.merchantId === m.id,
      ).length;
      return {
        ...m,
        accounts: accounts.map((a) => ({
          id: a.id,
          username: a.username,
          role: a.role,
          status: a.status,
        })),
        verifyCount,
      };
    });
    return ok({ list, total: all.length, page: p, pageSize: ps });
  }

  @Post('merchants/:id/review')
  reviewMerchant(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; reason?: string },
  ) {
    const merchant = this.repo.listMerchants().find((m) => m.id === Number(id));
    if (!merchant) {
      return ok(null);
    }
    if (body.action === 'approve') {
      merchant.status = 1;
    } else {
      merchant.status = 2; // rejected / disabled
    }
    return ok({
      ...merchant,
      message:
        body.action === 'approve'
          ? '商户已通过'
          : body.reason || '商户已拒绝/停用',
    });
  }

  // —— Coupon template CRUD ——
  @Get('coupon/templates')
  couponTemplates() {
    return ok(this.catalog.listCouponTemplates());
  }

  @Post('coupon/templates')
  createCoupon(@Body() body: Record<string, unknown>) {
    return ok(
      this.catalog.createCouponTemplate({
        couponName: String(body.couponName || ''),
        couponType: String(body.couponType || 'merchant'),
        amount: body.amount == null ? null : Number(body.amount),
        discountDesc:
          body.discountDesc == null ? null : String(body.discountDesc),
        totalCount:
          body.totalCount == null ? undefined : Number(body.totalCount),
        validDays: body.validDays == null ? 30 : Number(body.validDays),
        status: body.status == null ? 1 : Number(body.status),
      }),
    );
  }

  @Put('coupon/templates/:id')
  updateCoupon(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return ok(
      this.catalog.updateCouponTemplate(Number(id), {
        couponName:
          body.couponName === undefined
            ? undefined
            : String(body.couponName),
        couponType:
          body.couponType === undefined
            ? undefined
            : String(body.couponType),
        amount:
          body.amount === undefined
            ? undefined
            : body.amount == null
              ? null
              : Number(body.amount),
        discountDesc:
          body.discountDesc === undefined
            ? undefined
            : body.discountDesc == null
              ? null
              : String(body.discountDesc),
        totalCount:
          body.totalCount === undefined
            ? undefined
            : Number(body.totalCount),
        remainCount:
          body.remainCount === undefined
            ? undefined
            : Number(body.remainCount),
        validDays:
          body.validDays === undefined
            ? undefined
            : body.validDays == null
              ? null
              : Number(body.validDays),
        status: body.status === undefined ? undefined : Number(body.status),
      }),
    );
  }

  // —— Blind box + rewards ——
  @Get('blindbox/list')
  blindboxList() {
    return ok(this.catalog.listBlindBoxes());
  }

  @Put('blindbox/:id')
  updateBlindbox(
    @Param('id') id: string,
    @Body() body: { boxName?: string; dayLimit?: number | null; status?: number },
  ) {
    return ok(this.catalog.updateBlindBox(Number(id), body));
  }

  @Post('blindbox/:id/rewards')
  createReward(
    @Param('id') id: string,
    @Body()
    body: {
      rewardName: string;
      couponTemplateId?: number | null;
      weight?: number;
      stock?: number;
      isThanks?: number;
      status?: number;
    },
  ) {
    return ok(this.catalog.createReward(Number(id), body));
  }

  @Put('blindbox/rewards/:rewardId')
  updateReward(
    @Param('rewardId') rewardId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return ok(
      this.catalog.updateReward(Number(rewardId), {
        rewardName:
          body.rewardName === undefined
            ? undefined
            : String(body.rewardName),
        couponTemplateId:
          body.couponTemplateId === undefined
            ? undefined
            : body.couponTemplateId == null
              ? null
              : Number(body.couponTemplateId),
        weight: body.weight === undefined ? undefined : Number(body.weight),
        stock: body.stock === undefined ? undefined : Number(body.stock),
        remainStock:
          body.remainStock === undefined
            ? undefined
            : Number(body.remainStock),
        isThanks:
          body.isThanks === undefined ? undefined : Number(body.isThanks),
        status: body.status === undefined ? undefined : Number(body.status),
      }),
    );
  }

  // —— Activity center ——
  @Get('banners')
  banners() {
    return ok(this.activity.listBanners(false));
  }

  @Post('banners')
  createBanner(
    @Body()
    body: {
      title: string;
      subtitle?: string;
      imageUrl?: string;
      linkUrl?: string;
      sortNo?: number;
      status?: number;
    },
  ) {
    return ok(this.activity.createBanner(body));
  }

  @Put('banners/:id')
  updateBanner(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return ok(
      this.activity.updateBanner(Number(id), {
        title: body.title === undefined ? undefined : String(body.title),
        subtitle:
          body.subtitle === undefined
            ? undefined
            : body.subtitle == null
              ? null
              : String(body.subtitle),
        imageUrl:
          body.imageUrl === undefined ? undefined : String(body.imageUrl),
        linkUrl:
          body.linkUrl === undefined
            ? undefined
            : body.linkUrl == null
              ? null
              : String(body.linkUrl),
        sortNo: body.sortNo === undefined ? undefined : Number(body.sortNo),
        status: body.status === undefined ? undefined : Number(body.status),
      }),
    );
  }

  @Get('announcements')
  announcements() {
    return ok(this.activity.listAnnouncements(false));
  }

  @Post('announcements')
  createAnnouncement(
    @Body() body: { title: string; content: string; status?: number },
  ) {
    return ok(this.activity.createAnnouncement(body));
  }

  @Put('announcements/:id')
  updateAnnouncement(
    @Param('id') id: string,
    @Body() body: { title?: string; content?: string; status?: number },
  ) {
    return ok(this.activity.updateAnnouncement(Number(id), body));
  }

  @Get('configs')
  configs() {
    return ok(this.activity.listConfigs());
  }

  @Put('configs/:key')
  upsertConfig(
    @Param('key') key: string,
    @Body() body: { value: string; remark?: string },
  ) {
    return ok(this.activity.upsertConfig(key, body.value, body.remark));
  }

  // —— Risk center ——
  @Get('risk/overview')
  riskOverview() {
    return ok(this.risk.overview());
  }

  @Get('risk/blacklist')
  riskBlacklist(@Query('status') status?: string) {
    return ok(
      this.risk.listBlacklist(
        status === undefined || status === '' ? undefined : Number(status),
      ),
    );
  }

  @Post('risk/blacklist')
  addRiskBlacklist(
    @Body()
    body: {
      targetType: 'user' | 'phone' | 'openid' | 'device' | 'ip';
      targetValue: string;
      reason?: string;
    },
  ) {
    return ok(this.risk.addBlacklist(body));
  }

  @Put('risk/blacklist/:id')
  updateRiskBlacklist(
    @Param('id') id: string,
    @Body() body: { status: number },
  ) {
    return ok(this.risk.setBlacklistStatus(Number(id), Number(body.status)));
  }

  @Get('risk/strategies')
  riskStrategies() {
    return ok(this.risk.listStrategies());
  }

  @Put('risk/strategies/:id')
  updateRiskStrategy(
    @Param('id') id: string,
    @Body()
    body: {
      strategyName?: string;
      threshold?: number | null;
      action?: string;
      enabled?: number;
      remark?: string | null;
    },
  ) {
    return ok(this.risk.updateStrategy(Number(id), body));
  }

  @Get('risk/events')
  riskEvents(@Query('limit') limit = '50') {
    return ok(this.risk.listEvents(Number(limit) || 50));
  }

  @Get('risk/ticket-signals')
  riskTicketSignals(@Query('limit') limit = '30') {
    return ok(this.risk.ticketSignals(Number(limit) || 30));
  }

  // —— System settings ——
  @Get('system/roles')
  systemRoles() {
    return ok(this.repo.listSysRoles());
  }

  @Get('system/permissions')
  systemPermissions() {
    return ok(this.repo.listSysPermissions());
  }

  @Get('system/overview')
  systemOverview() {
    return ok({
      roles: this.repo.listSysRoles().length,
      permissions: this.repo.listSysPermissions().length,
      admins: 1,
      env: {
        dbMode: process.env.DB_MODE || 'memory',
        aiMockMode: process.env.AI_MOCK_MODE || 'auto_approve',
        reviewMode: process.env.REVIEW_MODE || 'async',
        repository: this.repo.backend,
      },
    });
  }
}
