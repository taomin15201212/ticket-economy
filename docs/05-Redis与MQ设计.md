# Redis 与 MQ 设计

## 1. Redis Key 设计

| Key | 类型 | TTL | 用途 |
| --- | --- | --- | --- |
| `token:user:{userId}` | string/hash | 30d | 用户登录态 |
| `token:merchant:{accountId}` | string/hash | 7d | 商户登录态 |
| `ticket:hash:{md5}` | string | 7d | 防重复上传 |
| `blindbox:stock:{rewardId}` | string | 活动期 | 奖品库存 |
| `blindbox:count:{userId}:{yyyyMMdd}` | string | 2d | 用户日抽次数 |
| `coupon:lock:{couponCode}` | string | 30s | 核销幂等锁 |
| `rank:points` | zset | 持久/日更 | 积分排行 |
| `rank:merchant:redeem` | zset | 日/周 | 商户核销排行 |
| `rate:upload:{userId}` | string | 1m | 上传限流 |

### 抽奖库存扣减伪代码

```text
stock = DECR blindbox:stock:{rewardId}
if stock < 0:
  INCR back
  fallback 谢谢参与 / 次级奖池
else:
  发券 + 写 open_log
```

### 核销锁

```text
SET coupon:lock:{code} {requestId} NX EX 30
校验状态 → 写库 → 删锁 / 等过期
```

## 2. RabbitMQ Topic

| Topic | 生产者 | 消费者 | 说明 |
| --- | --- | --- | --- |
| `ticket.upload` | ticket-service | ocr-worker | 新票入队 |
| `ticket.ocr.finished` | ocr-worker | ai-worker | OCR 完成 |
| `ticket.approved` | ai/risk | blindbox-worker | 审核通过 |
| `ticket.rejected` | ai/risk | message-worker | 审核拒绝通知 |
| `coupon.issued` | coupon-service | message/point | 发券成功 |
| `coupon.used` | coupon-service | statistics/point | 核销成功 |
| `checkin.passed` | checkin-service | point-service | 打卡通过 |
| `coupon.expire.scan` | scheduler | coupon-worker | 过期扫描 |

### 投递建议

1. 关键业务（发券、核销、积分）用事务消息或本地消息表。
2. OCR/AI 允许异步重试，设置最大重试与死信队列。
3. 统计类消费允许最终一致。

## 3. 对象存储目录

```text
ticket/raw/yyyy/MM/dd/
ticket/review/
checkin/
merchant/
banner/
avatar/
```
