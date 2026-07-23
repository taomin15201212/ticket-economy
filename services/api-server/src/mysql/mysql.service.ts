import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';
import * as bcrypt from 'bcrypt';
import { MemoryStore } from '../store/memory.store';
import {
  CheckinRecordRow,
  PointGoodsRow,
  PointLogRow,
  TicketRow,
  UserCouponRow,
  UserRow,
} from '../store/types';

/**
 * MySQL persistence adapter (Sprint 4).
 * DB_MODE=mysql → connect, hydrate MemoryStore, write-through core entities.
 * DB_MODE=memory → no-op (in-memory remains source of truth for demos/tests).
 */
@Injectable()
export class MysqlService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MysqlService.name);
  private pool: mysql.Pool | null = null;
  enabled = false;

  constructor(
    private readonly config: ConfigService,
    private readonly store: MemoryStore,
  ) {}

  async onModuleInit() {
    const mode = this.config.get<string>('DB_MODE', 'memory');
    // memory: off; mysql: hybrid hydrate; mysql-sql: fail-fast pure-SQL path
    if (mode !== 'mysql' && mode !== 'mysql-sql') {
      this.logger.log('DB_MODE=memory — MySQL persistence off');
      return;
    }
    try {
      this.pool = mysql.createPool({
        host: this.config.get('MYSQL_HOST', '127.0.0.1'),
        port: Number(this.config.get('MYSQL_PORT') || 3306),
        user: this.config.get('MYSQL_USER', 'te'),
        password: this.config.get('MYSQL_PASSWORD', 'te_pass'),
        database: this.config.get('MYSQL_DATABASE', 'ticket_economy'),
        connectionLimit: 8,
        timezone: '+00:00',
      });
      await this.pool.query('SELECT 1');
      this.enabled = true;
      this.logger.log(`MySQL connected (mode=${mode}) — hydrating store`);
      await this.hydrate();
      await this.ensureDemoMerchantAccount();
    } catch (e) {
      this.logger.error(
        `MySQL connect failed: ${(e as Error).message}.`,
      );
      this.enabled = false;
      if (this.pool) {
        await this.pool.end().catch(() => undefined);
        this.pool = null;
      }
      if (mode === 'mysql-sql') {
        // Pure SQL mode must not silently run on empty memory
        throw new Error(
          `DB_MODE=mysql-sql requires a reachable MySQL: ${(e as Error).message}`,
        );
      }
      this.logger.warn('Falling back to memory seed (DB_MODE=mysql hybrid).');
    }
  }

  /** Exposed for SqlMysqlRepository / health. */
  getPool(): mysql.Pool | null {
    return this.pool;
  }

  async query<T extends mysql.RowDataPacket[]>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T> {
    if (!this.pool) throw new Error('MySQL pool not available');
    const [rows] = await this.pool.query<T>(sql, params);
    return rows;
  }

  async onModuleDestroy() {
    await this.pool?.end().catch(() => undefined);
  }

  private async hydrate() {
    if (!this.pool) return;

    const [users] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT id, openid, nickname, avatar, phone, level, total_points, total_cost, status, created_at FROM user WHERE deleted=0',
    );
    if (users.length) {
      this.store.users = users.map((r) => this.mapUser(r));
      this.bumpSeq('user', this.store.users.map((u) => u.id));
    }

    const [templates] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT id, coupon_name, coupon_type, amount, discount_desc, total_count, remain_count, valid_days, status FROM coupon_template WHERE deleted=0',
    );
    if (templates.length) {
      this.store.couponTemplates = templates.map((r) => ({
        id: Number(r.id),
        couponName: String(r.coupon_name),
        couponType: String(r.coupon_type),
        amount: r.amount != null ? Number(r.amount) : null,
        discountDesc: r.discount_desc ? String(r.discount_desc) : null,
        totalCount: Number(r.total_count),
        remainCount: Number(r.remain_count),
        validDays: r.valid_days != null ? Number(r.valid_days) : null,
        status: Number(r.status),
      }));
      this.bumpSeq(
        'coupon',
        this.store.couponTemplates.map((t) => t.id),
      );
    }

    const [boxes] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT id, box_name, day_limit, status FROM blind_box WHERE deleted=0',
    );
    if (boxes.length) {
      this.store.blindBoxes = boxes.map((r) => ({
        id: Number(r.id),
        boxName: String(r.box_name),
        dayLimit: r.day_limit != null ? Number(r.day_limit) : null,
        status: Number(r.status),
      }));
      this.bumpSeq(
        'box',
        this.store.blindBoxes.map((b) => b.id),
      );
    }

    const [rewards] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT id, blind_box_id, reward_name, coupon_template_id, weight, stock, remain_stock, is_thanks, status FROM blind_box_reward',
    );
    if (rewards.length) {
      this.store.blindBoxRewards = rewards.map((r) => ({
        id: Number(r.id),
        blindBoxId: Number(r.blind_box_id),
        rewardName: String(r.reward_name),
        couponTemplateId:
          r.coupon_template_id != null ? Number(r.coupon_template_id) : null,
        weight: Number(r.weight),
        stock: Number(r.stock),
        remainStock: Number(r.remain_stock),
        isThanks: Number(r.is_thanks),
        status: Number(r.status),
      }));
      this.bumpSeq(
        'reward',
        this.store.blindBoxRewards.map((r) => r.id),
      );
    }

    const [merchants] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT id, merchant_name, store_name, address, status FROM merchant WHERE deleted=0',
    );
    if (merchants.length) {
      this.store.merchants = merchants.map((r) => ({
        id: Number(r.id),
        merchantName: String(r.merchant_name),
        storeName: String(r.store_name),
        address: r.address ? String(r.address) : null,
        status: Number(r.status),
      }));
      this.bumpSeq(
        'merchant',
        this.store.merchants.map((m) => m.id),
      );
    }

    const [accounts] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT id, merchant_id, username, password_hash, role, status FROM merchant_account WHERE deleted=0',
    );
    if (accounts.length) {
      this.store.merchantAccounts = accounts.map((r) => ({
        id: Number(r.id),
        merchantId: Number(r.merchant_id),
        username: String(r.username),
        passwordHash: String(r.password_hash),
        role: String(r.role),
        status: Number(r.status),
      }));
      this.bumpSeq(
        'merchantAccount',
        this.store.merchantAccounts.map((a) => a.id),
      );
    }

    try {
      const [tickets] = await this.pool.query<mysql.RowDataPacket[]>(
        `SELECT id, user_id, ticket_type, merchant_id, merchant_name, image_url, image_md5,
                amount, order_no, consume_time, ocr_confidence, risk_score, status,
                reject_reason, reviewer_id, reviewed_at, exchanged_at, created_at, updated_at, version
         FROM ticket WHERE deleted=0 ORDER BY id DESC LIMIT 500`,
      );
      if (tickets.length) {
        this.store.tickets = tickets.map((r) => this.mapTicket(r));
        this.bumpSeq(
          'ticket',
          this.store.tickets.map((t) => t.id),
        );
      }
    } catch (e) {
      this.logger.warn(`hydrate tickets skipped: ${(e as Error).message}`);
    }

    try {
      const [coupons] = await this.pool.query<mysql.RowDataPacket[]>(
        `SELECT id, user_id, coupon_template_id, coupon_code, source, status,
                receive_time, expire_time, lock_time, use_time, version
         FROM user_coupon WHERE deleted=0 ORDER BY id DESC LIMIT 500`,
      );
      if (coupons.length) {
        this.store.userCoupons = coupons.map((r) => this.mapUserCoupon(r));
        this.bumpSeq(
          'userCoupon',
          this.store.userCoupons.map((c) => c.id),
        );
      }
    } catch (e) {
      this.logger.warn(`hydrate coupons skipped: ${(e as Error).message}`);
    }

    try {
      const [goods] = await this.pool.query<mysql.RowDataPacket[]>(
        'SELECT id, goods_name, need_points, stock, image, description, status FROM point_goods WHERE deleted=0',
      );
      if (goods.length) {
        this.store.pointGoods = goods.map((r) => ({
          id: Number(r.id),
          goodsName: String(r.goods_name),
          needPoints: Number(r.need_points),
          stock: Number(r.stock),
          image: r.image ? String(r.image) : null,
          description: r.description ? String(r.description) : null,
          status: Number(r.status),
        }));
        this.bumpSeq(
          'pointGoods',
          this.store.pointGoods.map((g) => g.id),
        );
      }
    } catch (e) {
      this.logger.warn(`hydrate point_goods skipped: ${(e as Error).message}`);
    }

    try {
      const [locs] = await this.pool.query<mysql.RowDataPacket[]>(
        'SELECT id, name, merchant_id, address, longitude, latitude, radius_meter, status FROM checkin_location',
      );
      if (locs.length) {
        this.store.checkinLocations = locs.map((r) => ({
          id: Number(r.id),
          name: String(r.name),
          merchantId: r.merchant_id != null ? Number(r.merchant_id) : null,
          address: r.address ? String(r.address) : null,
          longitude: Number(r.longitude),
          latitude: Number(r.latitude),
          radiusMeter: Number(r.radius_meter),
          status: Number(r.status),
        }));
        this.bumpSeq(
          'checkinLocation',
          this.store.checkinLocations.map((l) => l.id),
        );
      }
    } catch (e) {
      this.logger.warn(
        `hydrate checkin_location skipped: ${(e as Error).message}`,
      );
    }

    this.logger.log(
      `Hydrated users=${this.store.users.length} tickets=${this.store.tickets.length} coupons=${this.store.userCoupons.length} templates=${this.store.couponTemplates.length}`,
    );
  }

  private mapUser(r: mysql.RowDataPacket): UserRow {
    return {
      id: Number(r.id),
      openid: String(r.openid),
      nickname: String(r.nickname || ''),
      avatar: String(r.avatar || ''),
      phone: r.phone ? String(r.phone) : null,
      level: Number(r.level),
      totalPoints: Number(r.total_points),
      totalCost: Number(r.total_cost),
      status: Number(r.status),
      createdAt: new Date(r.created_at).toISOString(),
    };
  }

  private mapTicket(r: mysql.RowDataPacket): TicketRow {
    return {
      id: Number(r.id),
      userId: Number(r.user_id),
      ticketType: String(r.ticket_type),
      merchantId: r.merchant_id != null ? Number(r.merchant_id) : null,
      merchantName: r.merchant_name ? String(r.merchant_name) : null,
      imageUrl: String(r.image_url),
      imageMd5: r.image_md5 ? String(r.image_md5) : null,
      amount: r.amount != null ? Number(r.amount) : null,
      orderNo: r.order_no ? String(r.order_no) : null,
      consumeTime: r.consume_time
        ? new Date(r.consume_time).toISOString()
        : null,
      ocrConfidence: r.ocr_confidence != null ? Number(r.ocr_confidence) : null,
      riskScore: r.risk_score != null ? Number(r.risk_score) : null,
      status: Number(r.status),
      rejectReason: r.reject_reason ? String(r.reject_reason) : null,
      reviewerId: r.reviewer_id != null ? Number(r.reviewer_id) : null,
      reviewedAt: r.reviewed_at
        ? new Date(r.reviewed_at).toISOString()
        : null,
      exchangedAt: r.exchanged_at
        ? new Date(r.exchanged_at).toISOString()
        : null,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
      version: Number(r.version || 0),
    };
  }

  private mapUserCoupon(r: mysql.RowDataPacket): UserCouponRow {
    return {
      id: Number(r.id),
      userId: Number(r.user_id),
      couponTemplateId: Number(r.coupon_template_id),
      couponCode: String(r.coupon_code),
      source: String(r.source),
      status: Number(r.status),
      receiveTime: r.receive_time
        ? new Date(r.receive_time).toISOString()
        : null,
      expireTime: r.expire_time
        ? new Date(r.expire_time).toISOString()
        : null,
      lockTime: r.lock_time ? new Date(r.lock_time).toISOString() : null,
      useTime: r.use_time ? new Date(r.use_time).toISOString() : null,
      version: Number(r.version || 0),
    };
  }

  private bumpSeq(key: string, ids: number[]) {
    this.store.advanceSeq(key, ids);
  }

  private async ensureDemoMerchantAccount() {
    if (!this.pool || this.store.merchantAccounts.length > 0) return;
    if (this.store.merchants.length === 0) return;
    const merchantId = this.store.merchants[0].id;
    const hash = await bcrypt.hash('123456', 8);
    const id = this.store.nextId('merchantAccount');
    this.store.merchantAccounts.push({
      id,
      merchantId,
      username: 'merchant01',
      passwordHash: hash,
      role: 'owner',
      status: 1,
    });
    try {
      await this.pool.query(
        `INSERT INTO merchant_account (id, merchant_id, username, password_hash, role, status)
         VALUES (?,?,?,?,?,1)
         ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash)`,
        [id, merchantId, 'merchant01', hash, 'owner'],
      );
    } catch (e) {
      this.logger.warn(
        `ensure demo merchant account: ${(e as Error).message}`,
      );
    }
  }

  async saveUser(user: UserRow) {
    if (!this.enabled || !this.pool) return;
    await this.pool.query(
      `INSERT INTO user (id, openid, nickname, avatar, phone, level, total_points, total_cost, status)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         nickname=VALUES(nickname), avatar=VALUES(avatar), phone=VALUES(phone),
         level=VALUES(level), total_points=VALUES(total_points), total_cost=VALUES(total_cost),
         status=VALUES(status)`,
      [
        user.id,
        user.openid,
        user.nickname,
        user.avatar,
        user.phone,
        user.level,
        user.totalPoints,
        user.totalCost,
        user.status,
      ],
    );
  }

  async saveTicket(ticket: TicketRow | Record<string, unknown>) {
    if (!this.enabled || !this.pool) return;
    const t = ticket as TicketRow;
    await this.pool.query(
      `INSERT INTO ticket
        (id, user_id, ticket_type, image_url, image_md5, amount, order_no, consume_time,
         ocr_confidence, risk_score, status, reject_reason, merchant_name, exchanged_at, version)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         amount=VALUES(amount), order_no=VALUES(order_no), consume_time=VALUES(consume_time),
         ocr_confidence=VALUES(ocr_confidence), risk_score=VALUES(risk_score),
         status=VALUES(status), reject_reason=VALUES(reject_reason),
         merchant_name=VALUES(merchant_name), exchanged_at=VALUES(exchanged_at),
         version=VALUES(version)`,
      [
        t.id,
        t.userId,
        t.ticketType,
        t.imageUrl,
        t.imageMd5,
        t.amount,
        t.orderNo,
        t.consumeTime ? new Date(t.consumeTime) : null,
        t.ocrConfidence,
        t.riskScore,
        t.status,
        t.rejectReason,
        t.merchantName,
        t.exchangedAt ? new Date(t.exchangedAt) : null,
        t.version ?? 0,
      ],
    );
  }

  async saveUserPoints(userId: number, totalPoints: number) {
    if (!this.enabled || !this.pool) return;
    await this.pool.query('UPDATE user SET total_points=? WHERE id=?', [
      totalPoints,
      userId,
    ]);
  }

  async savePointLog(log: PointLogRow) {
    if (!this.enabled || !this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO point_log
          (id, user_id, change_points, before_points, after_points, change_type, biz_id, remark, created_at)
         VALUES (?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE after_points=VALUES(after_points)`,
        [
          log.id,
          log.userId,
          log.changePoints,
          log.beforePoints,
          log.afterPoints,
          log.changeType,
          log.bizId,
          log.remark,
          new Date(log.createdAt),
        ],
      );
    } catch (e) {
      this.logger.warn(`savePointLog: ${(e as Error).message}`);
    }
  }

  async saveUserCoupon(c: UserCouponRow) {
    if (!this.enabled || !this.pool) return;
    await this.pool.query(
      `INSERT INTO user_coupon
        (id, user_id, coupon_template_id, coupon_code, source, status, receive_time, expire_time, lock_time, use_time, version)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         status=VALUES(status), lock_time=VALUES(lock_time), use_time=VALUES(use_time), version=VALUES(version)`,
      [
        c.id,
        c.userId,
        c.couponTemplateId,
        c.couponCode,
        c.source,
        c.status,
        c.receiveTime ? new Date(c.receiveTime) : null,
        c.expireTime ? new Date(c.expireTime) : null,
        c.lockTime ? new Date(c.lockTime) : null,
        c.useTime ? new Date(c.useTime) : null,
        c.version,
      ],
    );
  }

  async saveCheckin(record: CheckinRecordRow) {
    if (!this.enabled || !this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO checkin_record
          (id, user_id, location_id, merchant_id, longitude, latitude, distance, photo_url, verify_type, verify_status, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE verify_status=VALUES(verify_status)`,
        [
          record.id,
          record.userId,
          record.locationId,
          record.merchantId,
          record.longitude,
          record.latitude,
          record.distance,
          record.photoUrl,
          record.verifyType,
          record.verifyStatus,
          new Date(record.createdAt),
        ],
      );
    } catch (e) {
      this.logger.warn(`saveCheckin: ${(e as Error).message}`);
    }
  }

  async savePointGoods(g: PointGoodsRow) {
    if (!this.enabled || !this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO point_goods
          (id, goods_name, need_points, stock, image, description, status)
         VALUES (?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           goods_name=VALUES(goods_name), need_points=VALUES(need_points),
           stock=VALUES(stock), image=VALUES(image), description=VALUES(description),
           status=VALUES(status)`,
        [
          g.id,
          g.goodsName,
          g.needPoints,
          g.stock,
          g.image,
          g.description,
          g.status,
        ],
      );
    } catch (e) {
      this.logger.warn(`savePointGoods: ${(e as Error).message}`);
    }
  }

  async updateCouponTemplateStock(id: number, remainCount: number) {
    if (!this.enabled || !this.pool) return;
    await this.pool.query(
      'UPDATE coupon_template SET remain_count=? WHERE id=?',
      [remainCount, id],
    );
  }

  async updateRewardStock(id: number, remainStock: number) {
    if (!this.enabled || !this.pool) return;
    await this.pool.query(
      'UPDATE blind_box_reward SET remain_stock=? WHERE id=?',
      [remainStock, id],
    );
  }

  async saveCouponTemplate(t: {
    id: number;
    couponName: string;
    couponType: string;
    amount: number | null;
    discountDesc: string | null;
    totalCount: number;
    remainCount: number;
    validDays: number | null;
    status: number;
  }) {
    if (!this.enabled || !this.pool) return;
    await this.pool.query(
      `INSERT INTO coupon_template
        (id, coupon_name, coupon_type, provider_type, amount, discount_desc, total_count, remain_count, valid_days, status)
       VALUES (?,?,?,'local',?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         coupon_name=VALUES(coupon_name), coupon_type=VALUES(coupon_type),
         amount=VALUES(amount), discount_desc=VALUES(discount_desc),
         total_count=VALUES(total_count), remain_count=VALUES(remain_count),
         valid_days=VALUES(valid_days), status=VALUES(status)`,
      [
        t.id,
        t.couponName,
        t.couponType,
        t.amount,
        t.discountDesc,
        t.totalCount,
        t.remainCount,
        t.validDays,
        t.status,
      ],
    );
  }

  /** Sprint 10: pure-SQL mode flag */
  isPureSql(): boolean {
    return this.config.get('DB_MODE') === 'mysql-sql' && this.enabled;
  }

  async findUserByOpenidSql(openid: string): Promise<UserRow | null> {
    if (!this.pool) return null;
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT id, openid, nickname, avatar, phone, level, total_points, total_cost, status, created_at FROM user WHERE openid=? AND deleted=0 LIMIT 1',
      [openid],
    );
    if (!rows.length) return null;
    return this.mapUser(rows[0]);
  }

  async findUserByIdSql(id: number): Promise<UserRow | null> {
    if (!this.pool) return null;
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      'SELECT id, openid, nickname, avatar, phone, level, total_points, total_cost, status, created_at FROM user WHERE id=? AND deleted=0 LIMIT 1',
      [id],
    );
    if (!rows.length) return null;
    return this.mapUser(rows[0]);
  }

  async findTicketByIdSql(id: number): Promise<TicketRow | null> {
    if (!this.pool) return null;
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT id, user_id, ticket_type, merchant_id, merchant_name, image_url, image_md5,
              amount, order_no, consume_time, ocr_confidence, risk_score, status,
              reject_reason, reviewer_id, reviewed_at, exchanged_at, created_at, updated_at, version
       FROM ticket WHERE id=? AND deleted=0 LIMIT 1`,
      [id],
    );
    if (!rows.length) return null;
    return this.mapTicket(rows[0]);
  }

  async findCouponByCodeSql(code: string): Promise<UserCouponRow | null> {
    if (!this.pool) return null;
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT id, user_id, coupon_template_id, coupon_code, source, status,
              receive_time, expire_time, lock_time, use_time, version
       FROM user_coupon WHERE coupon_code=? AND deleted=0 LIMIT 1`,
      [code],
    );
    if (!rows.length) return null;
    return this.mapUserCoupon(rows[0]);
  }

  /**
   * Write user then re-read from SQL (source of truth).
   * Also mirrors into MemoryStore for hybrid callers.
   */
  async upsertUserSql(user: UserRow): Promise<UserRow> {
    await this.saveUser(user);
    const fresh = await this.findUserByIdSql(user.id);
    if (fresh) {
      const idx = this.store.users.findIndex((u) => u.id === fresh.id);
      if (idx >= 0) this.store.users[idx] = fresh;
      else this.store.users.push(fresh);
      return fresh;
    }
    return user;
  }

  async upsertTicketSql(ticket: TicketRow): Promise<TicketRow> {
    await this.saveTicket(ticket);
    const fresh = await this.findTicketByIdSql(ticket.id);
    if (fresh) {
      const idx = this.store.tickets.findIndex((t) => t.id === fresh.id);
      if (idx >= 0) this.store.tickets[idx] = fresh;
      else this.store.tickets.push(fresh);
      return fresh;
    }
    return ticket;
  }

  async upsertCouponSql(c: UserCouponRow): Promise<UserCouponRow> {
    await this.saveUserCoupon(c);
    const fresh = await this.findCouponByCodeSql(c.couponCode);
    if (fresh) {
      const idx = this.store.userCoupons.findIndex((x) => x.id === fresh.id);
      if (idx >= 0) this.store.userCoupons[idx] = fresh;
      else this.store.userCoupons.push(fresh);
      return fresh;
    }
    return c;
  }
}
