import { Injectable } from '@nestjs/common';
import { AppRepository } from './app.repository';
import { MemoryStore } from './memory.store';
import {
  BlindBoxRewardRow,
  BlindBoxRow,
  CheckinRecordRow,
  CouponTemplateRow,
  CouponUseRecordRow,
  MerchantRow,
  PointExchangeRow,
  PointGoodsRow,
  PointLogRow,
  TicketRow,
  UserCouponRow,
  UserRow,
} from './types';

/**
 * Memory-backed repository (default demos/tests).
 */
@Injectable()
export class MemoryRepository implements AppRepository {
  readonly backend: AppRepository['backend'] = 'memory';

  constructor(protected readonly store: MemoryStore) {}

  nextId(key: string) {
    return this.store.nextId(key);
  }

  md5(input: string | Buffer) {
    return this.store.md5(input);
  }

  newCouponCode() {
    return this.store.newCouponCode();
  }

  findUserById(id: number) {
    return this.store.users.find((u) => u.id === id);
  }

  findUserByOpenid(openid: string) {
    return this.store.users.find((u) => u.openid === openid);
  }

  createUser(
    data: Omit<UserRow, 'id' | 'createdAt'> & { id?: number },
  ): UserRow {
    const user: UserRow = {
      id: data.id ?? this.nextId('user'),
      openid: data.openid,
      nickname: data.nickname,
      avatar: data.avatar,
      phone: data.phone,
      level: data.level,
      totalPoints: data.totalPoints,
      totalCost: data.totalCost,
      status: data.status,
      createdAt: new Date().toISOString(),
    };
    this.store.users.push(user);
    return user;
  }

  saveUser(user: UserRow) {
    const idx = this.store.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) this.store.users[idx] = user;
    else this.store.users.push(user);
  }

  listUsers() {
    return this.store.users;
  }

  findTicketById(id: number) {
    return this.store.tickets.find((t) => t.id === id);
  }

  findTicketByMd5(md5: string) {
    return this.store.tickets.find((t) => t.imageMd5 === md5);
  }

  listTicketsByUser(userId: number) {
    return this.store.tickets.filter((t) => t.userId === userId);
  }

  listTickets() {
    return this.store.tickets;
  }

  saveTicket(ticket: TicketRow) {
    const idx = this.store.tickets.findIndex((t) => t.id === ticket.id);
    if (idx >= 0) this.store.tickets[idx] = ticket;
    else this.store.tickets.push(ticket);
    return ticket;
  }

  nextTicketId() {
    return this.nextId('ticket');
  }

  listCouponTemplates() {
    return this.store.couponTemplates;
  }

  findCouponTemplate(id: number) {
    return this.store.couponTemplates.find((t) => t.id === id);
  }

  saveCouponTemplate(t: CouponTemplateRow) {
    const idx = this.store.couponTemplates.findIndex((x) => x.id === t.id);
    if (idx >= 0) this.store.couponTemplates[idx] = t;
    else this.store.couponTemplates.push(t);
  }

  findCouponByCode(code: string) {
    return this.store.userCoupons.find((c) => c.couponCode === code);
  }

  findUserCouponById(id: number, userId?: number) {
    return this.store.userCoupons.find(
      (c) => c.id === id && (userId === undefined || c.userId === userId),
    );
  }

  listUserCoupons(userId: number) {
    return this.store.userCoupons.filter((c) => c.userId === userId);
  }

  saveUserCoupon(c: UserCouponRow) {
    const idx = this.store.userCoupons.findIndex((x) => x.id === c.id);
    if (idx >= 0) this.store.userCoupons[idx] = c;
    else this.store.userCoupons.push(c);
  }

  nextUserCouponId() {
    return this.nextId('userCoupon');
  }

  nextCouponTemplateId() {
    return this.nextId('coupon');
  }

  listBlindBoxes() {
    return this.store.blindBoxes;
  }

  findBlindBox(id: number) {
    return this.store.blindBoxes.find((b) => b.id === id);
  }

  listRewards(boxId?: number) {
    if (boxId === undefined) return this.store.blindBoxRewards;
    return this.store.blindBoxRewards.filter((r) => r.blindBoxId === boxId);
  }

  findReward(id: number) {
    return this.store.blindBoxRewards.find((r) => r.id === id);
  }

  saveReward(r: BlindBoxRewardRow) {
    const idx = this.store.blindBoxRewards.findIndex((x) => x.id === r.id);
    if (idx >= 0) this.store.blindBoxRewards[idx] = r;
    else this.store.blindBoxRewards.push(r);
  }

  saveBlindBox(b: BlindBoxRow) {
    const idx = this.store.blindBoxes.findIndex((x) => x.id === b.id);
    if (idx >= 0) this.store.blindBoxes[idx] = b;
    else this.store.blindBoxes.push(b);
  }

  nextRewardId() {
    return this.nextId('reward');
  }

  listPointRules() {
    return this.store.pointRules;
  }

  listPointLogs(userId?: number) {
    if (userId === undefined) return this.store.pointLogs;
    return this.store.pointLogs.filter((l) => l.userId === userId);
  }

  addPointLog(log: PointLogRow) {
    this.store.pointLogs.push(log);
  }

  listPointGoods() {
    return this.store.pointGoods;
  }

  findPointGoods(id: number) {
    return this.store.pointGoods.find((g) => g.id === id);
  }

  savePointGoods(g: PointGoodsRow) {
    const idx = this.store.pointGoods.findIndex((x) => x.id === g.id);
    if (idx >= 0) this.store.pointGoods[idx] = g;
    else this.store.pointGoods.push(g);
  }

  listPointExchanges(userId: number) {
    return this.store.pointExchanges.filter((e) => e.userId === userId);
  }

  savePointExchange(e: PointExchangeRow) {
    this.store.pointExchanges.push(e);
  }

  nextPointLogId() {
    return this.nextId('pointLog');
  }

  nextPointExchangeId() {
    return this.nextId('pointExchange');
  }

  nextPointGoodsId() {
    return this.nextId('pointGoods');
  }

  findMerchant(id: number) {
    return this.store.merchants.find((m) => m.id === id);
  }

  findMerchantAccountByUsername(username: string) {
    return this.store.merchantAccounts.find(
      (a) => a.username === username && a.status === 1,
    );
  }

  findMerchantAccountById(id: number) {
    return this.store.merchantAccounts.find((a) => a.id === id);
  }

  listMerchants() {
    return this.store.merchants;
  }

  listMerchantAccounts(merchantId?: number) {
    if (merchantId === undefined) return this.store.merchantAccounts;
    return this.store.merchantAccounts.filter(
      (a) => a.merchantId === merchantId,
    );
  }

  saveMerchant(m: MerchantRow) {
    const idx = this.store.merchants.findIndex((x) => x.id === m.id);
    if (idx >= 0) this.store.merchants[idx] = m;
    else this.store.merchants.push(m);
  }

  listCouponUseRecords(merchantId?: number) {
    if (merchantId === undefined) return this.store.couponUseRecords;
    return this.store.couponUseRecords.filter(
      (r) => r.merchantId === merchantId,
    );
  }

  listAllUserCoupons() {
    return this.store.userCoupons;
  }

  findUseRecordByRequestId(requestId: string) {
    return this.store.couponUseRecords.find((r) => r.requestId === requestId);
  }

  saveCouponUseRecord(r: CouponUseRecordRow) {
    this.store.couponUseRecords.push(r);
  }

  nextUseRecordId() {
    return this.nextId('useRecord');
  }

  nextMerchantId() {
    return this.nextId('merchant');
  }

  listCheckinLocations() {
    return this.store.checkinLocations;
  }

  findCheckinLocation(id: number) {
    return this.store.checkinLocations.find((l) => l.id === id);
  }

  listCheckinTasks() {
    return this.store.checkinTasks;
  }

  listCheckinRecords(userId?: number) {
    if (userId === undefined) return this.store.checkinRecords;
    return this.store.checkinRecords.filter((r) => r.userId === userId);
  }

  saveCheckinRecord(r: CheckinRecordRow) {
    this.store.checkinRecords.push(r);
  }

  nextCheckinRecordId() {
    return this.nextId('checkinRecord');
  }

  pushMessage(
    userId: number,
    title: string,
    content: string,
    type = 'system',
    bizId: number | null = null,
  ) {
    this.store.pushMessage(userId, title, content, type, bizId);
  }

  listSysRoles() {
    return this.store.sysRoles.map((r) => ({
      id: r.id,
      roleCode: r.roleCode,
      roleName: r.roleName,
    }));
  }

  listSysPermissions() {
    return this.store.sysPermissions.map((p) => ({
      id: p.id,
      permCode: p.permCode,
      permName: p.permName,
      module: p.module ?? null,
    }));
  }

  listMessages(userId: number) {
    return this.store.messages.filter((m) => m.userId === userId);
  }

  markMessagesRead(
    userId: number,
    opts: { ids?: number[]; all?: boolean },
  ): number {
    let count = 0;
    for (const m of this.store.messages) {
      if (m.userId !== userId || m.read === 1) continue;
      if (opts.all || (opts.ids || []).includes(m.id)) {
        m.read = 1;
        count += 1;
      }
    }
    return count;
  }
}
