import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { MysqlService } from '../mysql/mysql.service';
import { MemoryRepository } from './memory.repository';
import { MemoryStore } from './memory.store';
import {
  PointGoodsRow,
  PointLogRow,
  TicketRow,
  UserCouponRow,
  UserRow,
} from './types';

/**
 * Pure-SQL oriented repository (Sprint 9).
 * DB_MODE=mysql-sql: MySQL required (fail-fast). Mutations always go to MySQL.
 */
@Injectable()
export class SqlMysqlRepository
  extends MemoryRepository
  implements OnModuleInit
{
  private readonly logger = new Logger(SqlMysqlRepository.name);
  override readonly backend = 'mysql-sql' as const;
  private mysqlSvc: MysqlService | null = null;

  constructor(
    store: MemoryStore,
    private readonly config: ConfigService,
    private readonly moduleRef: ModuleRef,
  ) {
    super(store);
  }

  onModuleInit() {
    try {
      this.mysqlSvc = this.moduleRef.get(MysqlService, { strict: false });
    } catch {
      this.mysqlSvc = null;
    }
    this.logger.log(
      `SqlMysqlRepository selected (DB_MODE=${this.config.get('DB_MODE')}, mysql=${this.mysqlSvc?.enabled ?? false})`,
    );
  }

  private mysql(): MysqlService {
    if (!this.mysqlSvc) {
      this.mysqlSvc = this.moduleRef.get(MysqlService, { strict: false });
    }
    if (!this.mysqlSvc?.enabled) {
      throw new Error('DB_MODE=mysql-sql requires MySQL to be enabled');
    }
    return this.mysqlSvc;
  }

  override createUser(
    data: Omit<UserRow, 'id' | 'createdAt'> & { id?: number },
  ): UserRow {
    const user = super.createUser(data);
    void this.mysql().saveUser(user);
    return user;
  }

  override saveUser(user: UserRow) {
    super.saveUser(user);
    void this.mysql().saveUser(user);
  }

  override saveTicket(ticket: TicketRow) {
    const saved = super.saveTicket(ticket);
    void this.mysql().saveTicket(saved);
    return saved;
  }

  override saveUserCoupon(c: UserCouponRow) {
    super.saveUserCoupon(c);
    void this.mysql().saveUserCoupon(c);
  }

  override savePointGoods(g: PointGoodsRow) {
    super.savePointGoods(g);
    void this.mysql().savePointGoods(g);
  }

  override addPointLog(log: PointLogRow) {
    super.addPointLog(log);
    const db = this.mysql();
    void db.savePointLog(log);
    const user = this.findUserById(log.userId);
    if (user) void db.saveUserPoints(user.id, user.totalPoints);
  }

  override saveCheckinRecord(
    r: Parameters<MemoryRepository['saveCheckinRecord']>[0],
  ) {
    super.saveCheckinRecord(r);
    void this.mysql().saveCheckin(r);
  }

  override saveCouponTemplate(
    t: Parameters<MemoryRepository['saveCouponTemplate']>[0],
  ) {
    super.saveCouponTemplate(t);
    void this.mysql().saveCouponTemplate(t);
  }
}
