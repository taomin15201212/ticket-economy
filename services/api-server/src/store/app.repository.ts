import {
  BlindBoxRewardRow,
  BlindBoxRow,
  CheckinLocationRow,
  CheckinRecordRow,
  CheckinTaskRow,
  CouponTemplateRow,
  CouponUseRecordRow,
  MerchantAccountRow,
  MerchantRow,
  PointExchangeRow,
  PointGoodsRow,
  PointLogRow,
  PointRuleRow,
  TicketRow,
  UserCouponRow,
  UserRow,
} from './types';

/**
 * Application repository contract (Sprint 7).
 * Prefer method-level API; avoid raw store access in new code.
 */
export interface AppRepository {
  readonly backend: 'memory' | 'mysql-hybrid' | 'mysql-sql';

  // users
  findUserById(id: number): UserRow | undefined;
  findUserByOpenid(openid: string): UserRow | undefined;
  createUser(user: Omit<UserRow, 'id' | 'createdAt'> & { id?: number }): UserRow;
  saveUser(user: UserRow): void;
  listUsers(): UserRow[];

  // tickets
  findTicketById(id: number): TicketRow | undefined;
  findTicketByMd5(md5: string): TicketRow | undefined;
  listTicketsByUser(userId: number): TicketRow[];
  listTickets(): TicketRow[];
  saveTicket(ticket: TicketRow): TicketRow;
  nextTicketId(): number;

  // coupons
  listCouponTemplates(): CouponTemplateRow[];
  findCouponTemplate(id: number): CouponTemplateRow | undefined;
  saveCouponTemplate(t: CouponTemplateRow): void;
  findCouponByCode(code: string): UserCouponRow | undefined;
  findUserCouponById(id: number, userId?: number): UserCouponRow | undefined;
  listUserCoupons(userId: number): UserCouponRow[];
  saveUserCoupon(c: UserCouponRow): void;
  nextUserCouponId(): number;
  nextCouponTemplateId(): number;

  // blindbox
  listBlindBoxes(): BlindBoxRow[];
  findBlindBox(id: number): BlindBoxRow | undefined;
  listRewards(boxId?: number): BlindBoxRewardRow[];
  findReward(id: number): BlindBoxRewardRow | undefined;
  saveReward(r: BlindBoxRewardRow): void;
  saveBlindBox(b: BlindBoxRow): void;
  nextRewardId(): number;

  // points
  listPointRules(): PointRuleRow[];
  listPointLogs(userId?: number): PointLogRow[];
  addPointLog(log: PointLogRow): void;
  listPointGoods(): PointGoodsRow[];
  findPointGoods(id: number): PointGoodsRow | undefined;
  savePointGoods(g: PointGoodsRow): void;
  listPointExchanges(userId: number): PointExchangeRow[];
  savePointExchange(e: PointExchangeRow): void;
  nextPointLogId(): number;
  nextPointExchangeId(): number;
  nextPointGoodsId(): number;

  // merchant
  findMerchant(id: number): MerchantRow | undefined;
  findMerchantAccountByUsername(username: string): MerchantAccountRow | undefined;
  findMerchantAccountById(id: number): MerchantAccountRow | undefined;
  listMerchants(): MerchantRow[];
  listMerchantAccounts(merchantId?: number): MerchantAccountRow[];
  saveMerchant(m: MerchantRow): void;
  listCouponUseRecords(merchantId?: number): CouponUseRecordRow[];
  findUseRecordByRequestId(requestId: string): CouponUseRecordRow | undefined;
  saveCouponUseRecord(r: CouponUseRecordRow): void;
  nextUseRecordId(): number;
  nextMerchantId(): number;

  // checkin
  listCheckinLocations(): CheckinLocationRow[];
  findCheckinLocation(id: number): CheckinLocationRow | undefined;
  listCheckinTasks(): CheckinTaskRow[];
  listCheckinRecords(userId?: number): CheckinRecordRow[];
  saveCheckinRecord(r: CheckinRecordRow): void;
  nextCheckinRecordId(): number;

  // coupons all
  listAllUserCoupons(): UserCouponRow[];

  // system rbac (seed)
  listSysRoles(): { id: number; roleCode: string; roleName: string }[];
  listSysPermissions(): {
    id: number;
    permCode: string;
    permName: string;
    module?: string | null;
  }[];

  // messages
  pushMessage(
    userId: number,
    title: string,
    content: string,
    type?: string,
    bizId?: number | null,
  ): void;
  listMessages(userId: number): import('./types').MessageRow[];
  markMessagesRead(
    userId: number,
    opts: { ids?: number[]; all?: boolean },
  ): number;

  // generic id / utils
  nextId(key: string): number;
  md5(input: string | Buffer): string;
  newCouponCode(): string;
}

export const APP_REPOSITORY = Symbol('APP_REPOSITORY');
