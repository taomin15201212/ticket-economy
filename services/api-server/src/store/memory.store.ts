import { Injectable, OnModuleInit } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
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
  MessageRow,
  SystemConfigRow,
  AnnouncementRow,
  BannerRow,
  PointRuleRow,
  TicketRow,
  UserCouponRow,
  UserRow,
  RiskBlacklistRow,
  RiskStrategyRow,
  RiskEventRow,
  SysRoleRow,
  SysPermissionRow,
} from './types';

function now() {
  return new Date().toISOString();
}

@Injectable()
export class MemoryStore implements OnModuleInit {
  users: UserRow[] = [];
  tickets: TicketRow[] = [];
  couponTemplates: CouponTemplateRow[] = [];
  userCoupons: UserCouponRow[] = [];
  blindBoxes: BlindBoxRow[] = [];
  blindBoxRewards: BlindBoxRewardRow[] = [];
  pointLogs: PointLogRow[] = [];
  pointRules: PointRuleRow[] = [];
  merchants: MerchantRow[] = [];
  merchantAccounts: MerchantAccountRow[] = [];
  couponUseRecords: CouponUseRecordRow[] = [];
  checkinLocations: CheckinLocationRow[] = [];
  checkinRecords: CheckinRecordRow[] = [];
  checkinTasks: CheckinTaskRow[] = [];
  pointGoods: PointGoodsRow[] = [];
  pointExchanges: PointExchangeRow[] = [];
  messages: MessageRow[] = [];
  banners: BannerRow[] = [];
  announcements: AnnouncementRow[] = [];
  systemConfigs: SystemConfigRow[] = [];
  riskBlacklist: RiskBlacklistRow[] = [];
  riskStrategies: RiskStrategyRow[] = [];
  riskEvents: RiskEventRow[] = [];
  sysRoles: SysRoleRow[] = [];
  sysPermissions: SysPermissionRow[] = [];

  /** Public so Mysql hydrate can advance id sequences. */
  seq: Record<string, number> = {
    user: 1,
    ticket: 1,
    coupon: 1,
    userCoupon: 1,
    pointLog: 1,
    merchant: 1,
    merchantAccount: 1,
    useRecord: 1,
    reward: 1,
    box: 1,
    checkinLocation: 1,
    checkinRecord: 1,
    checkinTask: 1,
    pointGoods: 1,
    pointExchange: 1,
    message: 1,
    banner: 1,
    announcement: 1,
    riskBlacklist: 1,
    riskStrategy: 1,
    riskEvent: 1,
    role: 1,
    permission: 1,
  };

  advanceSeq(key: string, ids: number[]) {
    if (!ids.length) return;
    const max = Math.max(...ids);
    this.seq[key] = Math.max(this.seq[key] ?? 1, max + 1);
  }

  async onModuleInit() {
    await this.seed();
  }

  nextId(key: string) {
    const id = this.seq[key] ?? 1;
    this.seq[key] = id + 1;
    return id;
  }

  private async seed() {
    this.pointRules = [
      { actionType: 'upload_ticket', points: 10, dailyLimit: 5, status: 1 },
      { actionType: 'checkin', points: 5, dailyLimit: 3, status: 1 },
      { actionType: 'share', points: 3, dailyLimit: 3, status: 1 },
      { actionType: 'use_coupon', points: 20, dailyLimit: 10, status: 1 },
    ];

    this.couponTemplates = [
      {
        id: 1,
        couponName: '本地商户满减券',
        couponType: 'merchant',
        amount: 20,
        discountDesc: '满100减20',
        totalCount: 10000,
        remainCount: 10000,
        validDays: 30,
        status: 1,
      },
      {
        id: 2,
        couponName: '景区8.1折券',
        couponType: 'scenic',
        amount: null,
        discountDesc: '门票8.1折',
        totalCount: 1000,
        remainCount: 1000,
        validDays: 15,
        status: 1,
      },
      {
        id: 3,
        couponName: '南昌地铁乘车券',
        couponType: 'metro',
        amount: 5,
        discountDesc: '地铁抵扣券',
        totalCount: 5000,
        remainCount: 5000,
        validDays: 7,
        status: 1,
      },
      {
        id: 4,
        couponName: '滴滴5折券',
        couponType: 'didi',
        amount: null,
        discountDesc: '最高减15元',
        totalCount: 3000,
        remainCount: 3000,
        validDays: 7,
        status: 1,
      },
      {
        id: 5,
        couponName: '热门电影票兑换券',
        couponType: 'movie',
        amount: null,
        discountDesc: '指定场次可用',
        totalCount: 800,
        remainCount: 800,
        validDays: 14,
        status: 1,
      },
    ];
    this.seq.coupon = 6;

    this.blindBoxes = [
      { id: 1, boxName: '文旅消费盲盒', dayLimit: 3, status: 1 },
    ];
    this.seq.box = 2;

    this.blindBoxRewards = [
      {
        id: 1,
        blindBoxId: 1,
        rewardName: '景区8.1折券',
        couponTemplateId: 2,
        weight: 5,
        stock: 1000,
        remainStock: 1000,
        isThanks: 0,
        status: 1,
      },
      {
        id: 2,
        blindBoxId: 1,
        rewardName: '地铁乘车券',
        couponTemplateId: 3,
        weight: 20,
        stock: 5000,
        remainStock: 5000,
        isThanks: 0,
        status: 1,
      },
      {
        id: 3,
        blindBoxId: 1,
        rewardName: '滴滴5折券',
        couponTemplateId: 4,
        weight: 25,
        stock: 3000,
        remainStock: 3000,
        isThanks: 0,
        status: 1,
      },
      {
        id: 4,
        blindBoxId: 1,
        rewardName: '电影票券',
        couponTemplateId: 5,
        weight: 10,
        stock: 800,
        remainStock: 800,
        isThanks: 0,
        status: 1,
      },
      {
        id: 5,
        blindBoxId: 1,
        rewardName: '商户满减券',
        couponTemplateId: 1,
        weight: 30,
        stock: 10000,
        remainStock: 10000,
        isThanks: 0,
        status: 1,
      },
      {
        id: 6,
        blindBoxId: 1,
        rewardName: '谢谢参与',
        couponTemplateId: null,
        weight: 10,
        stock: 999999,
        remainStock: 999999,
        isThanks: 1,
        status: 1,
      },
    ];
    this.seq.reward = 7;

    const merchantId = this.nextId('merchant');
    this.merchants.push({
      id: merchantId,
      merchantName: '千百味',
      storeName: '红谷滩店',
      address: '南昌市红谷滩区',
      status: 1,
    });

    const hash = await bcrypt.hash('123456', 8);
    this.merchantAccounts.push({
      id: this.nextId('merchantAccount'),
      merchantId,
      username: 'merchant01',
      passwordHash: hash,
      role: 'owner',
      status: 1,
    });

    // demo consumer
    this.users.push({
      id: this.nextId('user'),
      openid: 'demo_openid_user1',
      nickname: '演示游客',
      avatar: '',
      phone: null,
      level: 1,
      totalPoints: 0,
      totalCost: 0,
      status: 1,
      createdAt: now(),
    });

    // Nanchang sample check-in points (approx WGS84)
    this.checkinLocations = [
      {
        id: this.nextId('checkinLocation'),
        name: '秋水广场',
        merchantId: null,
        address: '南昌红谷滩秋水广场',
        longitude: 115.857,
        latitude: 28.687,
        radiusMeter: 300,
        status: 1,
      },
      {
        id: this.nextId('checkinLocation'),
        name: '滕王阁',
        merchantId: null,
        address: '南昌东湖区滕王阁',
        longitude: 115.876,
        latitude: 28.683,
        radiusMeter: 250,
        status: 1,
      },
      {
        id: this.nextId('checkinLocation'),
        name: '千百味红谷滩店',
        merchantId,
        address: '南昌市红谷滩区',
        longitude: 115.86,
        latitude: 28.69,
        radiusMeter: 200,
        status: 1,
      },
    ];

    this.checkinTasks = [
      {
        id: this.nextId('checkinTask'),
        taskName: '单次打卡',
        taskType: 'single',
        targetCount: 1,
        rewardPoints: 5,
        status: 1,
      },
      {
        id: this.nextId('checkinTask'),
        taskName: '三地集章',
        taskType: 'collect',
        targetCount: 3,
        rewardPoints: 30,
        status: 1,
      },
    ];

    this.pointGoods = [
      {
        id: this.nextId('pointGoods'),
        goodsName: '文创冰箱贴',
        needPoints: 20,
        stock: 200,
        image: null,
        description: '南昌文旅限定冰箱贴',
        status: 1,
      },
      {
        id: this.nextId('pointGoods'),
        goodsName: '咖啡兑换券',
        needPoints: 80,
        stock: 100,
        image: null,
        description: '合作门店中杯兑换',
        status: 1,
      },
      {
        id: this.nextId('pointGoods'),
        goodsName: '景区联票立减券',
        needPoints: 120,
        stock: 50,
        image: null,
        description: '指定景区立减 30 元',
        status: 1,
      },
    ];

    this.banners = [
      {
        id: this.nextId('banner'),
        title: '南昌秋冬文旅消费季',
        subtitle: '上传票根 · 开盲盒 · 到店核销',
        imageUrl: '',
        linkUrl: '/upload',
        sortNo: 1,
        status: 1,
        startTime: null,
        endTime: null,
        createdAt: now(),
      },
      {
        id: this.nextId('banner'),
        title: 'A 级景区集章',
        subtitle: '地理围栏打卡 · 阶梯奖励',
        imageUrl: '',
        linkUrl: '/checkin',
        sortNo: 2,
        status: 1,
        startTime: null,
        endTime: null,
        createdAt: now(),
      },
      {
        id: this.nextId('banner'),
        title: '一票通攒积分商城',
        subtitle: '冰箱贴 / 咖啡券限量兑',
        imageUrl: '',
        linkUrl: '/points',
        sortNo: 3,
        status: 1,
        startTime: null,
        endTime: null,
        createdAt: now(),
      },
    ];
    this.announcements = [
      {
        id: this.nextId('announcement'),
        title: '今日 9:00 定向抢券已放号',
        content: '免费奶茶券、烤肠券限量投放，先到先得。',
        status: 1,
        createdAt: now(),
      },
      {
        id: this.nextId('announcement'),
        title: '商户核销温馨提示',
        content: '请核对券码有效期与门店适用范围，重复核销将被拒绝。',
        status: 1,
        createdAt: now(),
      },
    ];
    this.systemConfigs = [
      {
        configKey: 'activity.season_name',
        configValue: '南昌 2025 秋冬文旅消费季',
        remark: '活动季名称',
        updatedAt: now(),
      },
      {
        configKey: 'activity.day_index',
        configValue: '38',
        remark: '活动第几天',
        updatedAt: now(),
      },
      {
        configKey: 'activity.total_days',
        configValue: '100',
        remark: '活动总天数',
        updatedAt: now(),
      },
      {
        configKey: 'home.hero_title',
        configValue: '上传票根\n开出城市权益',
        remark: '首页主标题',
        updatedAt: now(),
      },
    ];

    this.riskStrategies = [
      {
        id: this.nextId('riskStrategy'),
        strategyCode: 'ai_auto_pass',
        strategyName: 'AI 自动通过阈值',
        threshold: 85,
        action: 'auto_pass',
        enabled: 1,
        remark: '风险分低于阈值且置信度高则自动过',
      },
      {
        id: this.nextId('riskStrategy'),
        strategyCode: 'ai_manual_review',
        strategyName: '人工复核阈值',
        threshold: 60,
        action: 'manual',
        enabled: 1,
        remark: '中风险进入人工台',
      },
      {
        id: this.nextId('riskStrategy'),
        strategyCode: 'dup_ticket_block',
        strategyName: '重复票据拦截',
        threshold: null,
        action: 'reject',
        enabled: 1,
        remark: 'image_md5 / 单号查重',
      },
      {
        id: this.nextId('riskStrategy'),
        strategyCode: 'daily_blindbox_limit',
        strategyName: '盲盒日限',
        threshold: 3,
        action: 'block_lottery',
        enabled: 1,
        remark: '每用户每日开盒次数',
      },
    ];
    this.riskBlacklist = [];
    this.riskEvents = [];

    this.sysRoles = [
      { id: this.nextId('role'), roleCode: 'SUPER_ADMIN', roleName: '超级管理员', status: 1 },
      { id: this.nextId('role'), roleCode: 'OPERATOR', roleName: '运营人员', status: 1 },
      { id: this.nextId('role'), roleCode: 'AUDITOR', roleName: '审核人员', status: 1 },
      { id: this.nextId('role'), roleCode: 'MERCHANT', roleName: '商户', status: 1 },
      { id: this.nextId('role'), roleCode: 'USER', roleName: '消费者', status: 1 },
    ];
    this.sysPermissions = [
      { id: this.nextId('permission'), permCode: 'ticket:review', permName: '票据审核查看', module: 'ticket' },
      { id: this.nextId('permission'), permCode: 'ticket:approve', permName: '票据通过', module: 'ticket' },
      { id: this.nextId('permission'), permCode: 'coupon:create', permName: '创建消费券', module: 'coupon' },
      { id: this.nextId('permission'), permCode: 'blindbox:config', permName: '配置盲盒', module: 'blindbox' },
      { id: this.nextId('permission'), permCode: 'risk:blacklist:manage', permName: '管理黑名单', module: 'risk' },
      { id: this.nextId('permission'), permCode: 'activity:config', permName: '活动配置', module: 'activity' },
      { id: this.nextId('permission'), permCode: 'statistics:view', permName: '查看统计', module: 'statistics' },
    ];



  }

  pushMessage(
    userId: number,
    title: string,
    content: string,
    category = 'system',
    refId: number | null = null,
  ) {
    const row: MessageRow = {
      id: this.nextId('message'),
      userId,
      title,
      content,
      category,
      refId,
      read: 0,
      createdAt: new Date().toISOString(),
    };
    this.messages.unshift(row);
    return row;
  }

  md5(input: string | Buffer) {
    return createHash('md5').update(input).digest('hex');
  }

  newCouponCode() {
    return `CPN${Date.now()}${randomUUID().slice(0, 8).toUpperCase()}`;
  }
}
