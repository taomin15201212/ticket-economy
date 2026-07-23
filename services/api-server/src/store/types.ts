export interface UserRow {
  id: number;
  openid: string;
  nickname: string;
  avatar: string;
  phone: string | null;
  level: number;
  totalPoints: number;
  totalCost: number;
  status: number;
  createdAt: string;
}

export interface TicketRow {
  id: number;
  userId: number;
  ticketType: string;
  merchantId: number | null;
  merchantName: string | null;
  imageUrl: string;
  imageMd5: string | null;
  amount: number | null;
  orderNo: string | null;
  consumeTime: string | null;
  ocrConfidence: number | null;
  riskScore: number | null;
  status: number;
  rejectReason: string | null;
  reviewerId: number | null;
  reviewedAt: string | null;
  exchangedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CouponTemplateRow {
  id: number;
  couponName: string;
  couponType: string;
  amount: number | null;
  discountDesc: string | null;
  totalCount: number;
  remainCount: number;
  validDays: number | null;
  status: number;
}

export interface UserCouponRow {
  id: number;
  userId: number;
  couponTemplateId: number;
  couponCode: string;
  source: string;
  status: number;
  receiveTime: string | null;
  expireTime: string | null;
  lockTime: string | null;
  useTime: string | null;
  version: number;
}

export interface BlindBoxRow {
  id: number;
  boxName: string;
  dayLimit: number | null;
  status: number;
}

export interface BlindBoxRewardRow {
  id: number;
  blindBoxId: number;
  rewardName: string;
  couponTemplateId: number | null;
  weight: number;
  stock: number;
  remainStock: number;
  isThanks: number;
  status: number;
}

export interface PointLogRow {
  id: number;
  userId: number;
  changePoints: number;
  beforePoints: number;
  afterPoints: number;
  changeType: string;
  bizId: number | null;
  remark: string | null;
  createdAt: string;
}

export interface MerchantRow {
  id: number;
  merchantName: string;
  storeName: string;
  address: string | null;
  status: number;
}

export interface MerchantAccountRow {
  id: number;
  merchantId: number;
  username: string;
  passwordHash: string;
  role: string;
  status: number;
}

export interface PointRuleRow {
  actionType: string;
  points: number;
  dailyLimit: number | null;
  status: number;
}

export interface CouponUseRecordRow {
  id: number;
  couponId: number;
  userId: number;
  merchantId: number;
  operatorId: number | null;
  verifyType: string;
  requestId: string | null;
  useTime: string;
}

export interface CheckinLocationRow {
  id: number;
  name: string;
  merchantId: number | null;
  address: string | null;
  longitude: number;
  latitude: number;
  radiusMeter: number;
  status: number;
}

export interface CheckinRecordRow {
  id: number;
  userId: number;
  locationId: number | null;
  merchantId: number | null;
  longitude: number | null;
  latitude: number | null;
  distance: number | null;
  photoUrl: string | null;
  verifyType: string;
  verifyStatus: number;
  createdAt: string;
}

export interface CheckinTaskRow {
  id: number;
  taskName: string;
  taskType: string;
  targetCount: number;
  rewardPoints: number;
  status: number;
}

export interface PointGoodsRow {
  id: number;
  goodsName: string;
  needPoints: number;
  stock: number;
  image: string | null;
  description: string | null;
  status: number;
}

export interface PointExchangeRow {
  id: number;
  userId: number;
  goodsId: number;
  needPoints: number;
  status: number;
  createdAt: string;
}


export interface MessageRow {
  id: number;
  userId: number;
  title: string;
  content: string;
  category: string; // ticket | coupon | point | system
  refId: number | null;
  read: number; // 0 unread 1 read
  createdAt: string;
}


export interface BannerRow {
  id: number;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  sortNo: number;
  status: number;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
}

export interface AnnouncementRow {
  id: number;
  title: string;
  content: string;
  status: number;
  createdAt: string;
}

export interface SystemConfigRow {
  configKey: string;
  configValue: string;
  remark: string | null;
  updatedAt: string;
}


export interface RiskBlacklistRow {
  id: number;
  targetType: 'user' | 'phone' | 'openid' | 'device' | 'ip';
  targetValue: string;
  reason: string | null;
  status: number; // 1 active 0 disabled
  createdAt: string;
}

export interface RiskStrategyRow {
  id: number;
  strategyCode: string;
  strategyName: string;
  threshold: number | null;
  action: string; // auto_pass | manual | reject | block_upload | block_lottery
  enabled: number;
  remark: string | null;
}

export interface RiskEventRow {
  id: number;
  userId: number | null;
  eventType: string;
  level: 'low' | 'medium' | 'high';
  detail: string;
  refId: number | null;
  createdAt: string;
}


export interface SysRoleRow {
  id: number;
  roleCode: string;
  roleName: string;
  status: number;
}

export interface SysPermissionRow {
  id: number;
  permCode: string;
  permName: string;
  module: string;
}
