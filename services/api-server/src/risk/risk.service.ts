import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemoryStore } from '../store/memory.store';
import {
  RiskBlacklistRow,
  RiskEventRow,
  RiskStrategyRow,
} from '../store/types';
import { TicketStatus } from '../common/ticket-status';

@Injectable()
export class RiskService {
  constructor(private readonly store: MemoryStore) {}

  overview() {
    const tickets = this.store.tickets;
    const rejected = tickets.filter((t) => t.status === TicketStatus.Rejected);
    const manual = tickets.filter((t) => t.status === TicketStatus.ManualReview);
    const highRisk = tickets.filter((t) => (t.riskScore ?? 0) >= 60);
    return {
      blacklistActive: this.store.riskBlacklist.filter((b) => b.status === 1)
        .length,
      strategiesEnabled: this.store.riskStrategies.filter((s) => s.enabled === 1)
        .length,
      events24h: this.store.riskEvents.length,
      ticketsRejected: rejected.length,
      ticketsManual: manual.length,
      ticketsHighRisk: highRisk.length,
      blockedUsers: this.store.users.filter((u) => u.status === 0).length,
    };
  }

  listBlacklist(status?: number) {
    let list = [...this.store.riskBlacklist];
    if (status !== undefined && !Number.isNaN(status)) {
      list = list.filter((b) => b.status === status);
    }
    // also include blocked users as virtual entries if not present
    return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  addBlacklist(body: {
    targetType: RiskBlacklistRow['targetType'];
    targetValue: string;
    reason?: string;
  }) {
    if (!body.targetType || !body.targetValue?.trim()) {
      throw new BadRequestException('targetType/targetValue 必填');
    }
    const exists = this.store.riskBlacklist.find(
      (b) =>
        b.targetType === body.targetType &&
        b.targetValue === body.targetValue.trim() &&
        b.status === 1,
    );
    if (exists) return exists;
    const row: RiskBlacklistRow = {
      id: this.store.nextId('riskBlacklist'),
      targetType: body.targetType,
      targetValue: body.targetValue.trim(),
      reason: body.reason ?? null,
      status: 1,
      createdAt: new Date().toISOString(),
    };
    this.store.riskBlacklist.unshift(row);
    if (body.targetType === 'user') {
      const user = this.store.users.find(
        (u) => String(u.id) === row.targetValue || u.openid === row.targetValue,
      );
      if (user) {
        user.status = 0;
        this.store.pushMessage(
          user.id,
          '账号风控提醒',
          row.reason || '您的账号已被风控限制',
          'system',
          user.id,
        );
      }
    }
    this.pushEvent({
      userId: body.targetType === 'user' ? Number(body.targetValue) || null : null,
      eventType: 'blacklist_add',
      level: 'high',
      detail: `${body.targetType}:${body.targetValue} ${body.reason || ''}`.trim(),
      refId: row.id,
    });
    return row;
  }

  setBlacklistStatus(id: number, status: number) {
    const row = this.store.riskBlacklist.find((b) => b.id === id);
    if (!row) throw new NotFoundException('黑名单项不存在');
    row.status = status;
    if (row.targetType === 'user') {
      const user = this.store.users.find((u) => String(u.id) === row.targetValue);
      if (user) user.status = status === 1 ? 0 : 1;
    }
    return row;
  }

  listStrategies() {
    return [...this.store.riskStrategies];
  }

  updateStrategy(
    id: number,
    body: Partial<{
      strategyName: string;
      threshold: number | null;
      action: string;
      enabled: number;
      remark: string | null;
    }>,
  ) {
    const row = this.store.riskStrategies.find((s) => s.id === id);
    if (!row) throw new NotFoundException('策略不存在');
    if (body.strategyName !== undefined) row.strategyName = body.strategyName;
    if (body.threshold !== undefined) row.threshold = body.threshold;
    if (body.action !== undefined) row.action = body.action;
    if (body.enabled !== undefined) row.enabled = body.enabled;
    if (body.remark !== undefined) row.remark = body.remark;
    return row;
  }

  listEvents(limit = 50) {
    return [...this.store.riskEvents]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limit);
  }

  pushEvent(input: {
    userId?: number | null;
    eventType: string;
    level?: RiskEventRow['level'];
    detail: string;
    refId?: number | null;
  }) {
    const row: RiskEventRow = {
      id: this.store.nextId('riskEvent'),
      userId: input.userId ?? null,
      eventType: input.eventType,
      level: input.level || 'medium',
      detail: input.detail,
      refId: input.refId ?? null,
      createdAt: new Date().toISOString(),
    };
    this.store.riskEvents.unshift(row);
    return row;
  }

  isStrategyEnabled(code: string) {
    const s = this.store.riskStrategies.find(
      (x) => x.strategyCode === code && x.enabled === 1,
    );
    return s || null;
  }

  isBlacklisted(targetType: RiskBlacklistRow['targetType'], targetValue: string) {
    return this.store.riskBlacklist.find(
      (b) =>
        b.status === 1 &&
        b.targetType === targetType &&
        b.targetValue === String(targetValue),
    );
  }

  assertUserAllowed(
    userId: number,
    action: 'upload' | 'lottery' | 'checkin' = 'upload',
    meta?: { deviceId?: string; ip?: string },
  ) {
    const user = this.store.users.find((u) => u.id === userId);
    if (!user || user.status !== 1) {
      this.pushEvent({
        userId,
        eventType: 'block_disabled_user',
        level: 'high',
        detail: `用户#${userId} 状态异常，拦截 ${action}`,
      });
      throw new BadRequestException('账号已被限制，无法继续操作');
    }

    const hits = [
      this.isBlacklisted('user', String(userId)),
      user.openid ? this.isBlacklisted('openid', user.openid) : null,
      user.phone ? this.isBlacklisted('phone', user.phone) : null,
      meta?.deviceId ? this.isBlacklisted('device', meta.deviceId) : null,
      meta?.ip ? this.isBlacklisted('ip', meta.ip) : null,
    ].filter(Boolean);

    if (hits.length) {
      const hit = hits[0]!;
      this.pushEvent({
        userId,
        eventType: 'block_blacklist',
        level: 'high',
        detail: `黑名单命中 ${hit.targetType}:${hit.targetValue}，拦截 ${action}`,
        refId: hit.id,
      });
      throw new BadRequestException(
        hit.reason || `风控拦截：${hit.targetType} 在黑名单中`,
      );
    }

    if (action === 'upload') {
      const s = this.isStrategyEnabled('block_upload_if_blacklisted');
      // reserved strategy code; blacklist already enforced above
      void s;
    }
    if (action === 'lottery') {
      const s = this.isStrategyEnabled('daily_blindbox_limit');
      // actual day-limit is enforced by BlindboxService via redis; record visibility only
      void s;
    }
  }

  /** Derive risk signals from tickets for console display */
  ticketSignals(limit = 30) {
    return [...this.store.tickets]
      .filter(
        (t) =>
          t.status === TicketStatus.Rejected ||
          t.status === TicketStatus.ManualReview ||
          (t.riskScore ?? 0) >= 50,
      )
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, limit)
      .map((t) => ({
        ticketId: t.id,
        userId: t.userId,
        merchantName: t.merchantName,
        riskScore: t.riskScore,
        status: t.status,
        rejectReason: t.rejectReason,
        updatedAt: t.updatedAt,
      }));
  }
}
