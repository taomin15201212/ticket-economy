# Sprint 2 交付说明

在 Sprint 0/1 主闭环可演示的基础上，补齐「可切换基础设施 + 异步审核 + 运营配置」。

## 1. 已完成

| 能力 | 说明 | 降级策略 |
| --- | --- | --- |
| Redis 日限 / 限流 | 盲盒每日次数、票据提交频控 | Redis 不可用 → 进程内 Map |
| 审核队列 | `REVIEW_MODE=async` 提交后入队 | `QUEUE_MODE=rabbitmq` 优先；不可用 → 内存队列 |
| MySQL 持久化适配 | `DB_MODE=mysql` 启动 hydrate + 写穿关键表 | 连接失败 → 保持 memory seed |
| 管理端 CRUD | 券模板、盲盒奖池权重/库存 | 内存即时生效；MySQL 开启时写穿模板 |

## 2. 环境变量

见 `services/api-server/.env.example`：

- `DB_MODE=memory|mysql`
- `REDIS_ENABLED` / `REDIS_HOST` / `REDIS_PORT`
- `QUEUE_MODE=memory|rabbitmq` + `RABBITMQ_URL`
- `REVIEW_MODE=async|sync`
- `AI_MOCK_MODE=auto_approve|auto_manual|auto_reject`

## 3. 新增 / 变更 API

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/health` | 增加 `infra.redis/queue/mysql` |
| POST | `/api/ticket/submit` | 默认异步入队，返回 `queued` |
| GET | `/api/admin/coupon/templates` | 券模板列表 |
| POST | `/api/admin/coupon/templates` | 创建券模板 |
| PUT | `/api/admin/coupon/templates/:id` | 更新/启停 |
| GET | `/api/admin/blindbox/list` | 盲盒+奖品 |
| PUT | `/api/admin/blindbox/:id` | 更新盲盒 |
| POST | `/api/admin/blindbox/:id/rewards` | 添加奖品 |
| PUT | `/api/admin/blindbox/rewards/:rewardId` | 更新权重/库存 |
| GET | `/api/admin/dashboard` | 增加 `infra` 字段 |

## 4. 本地验证

```bash
cd services/api-server
npm run start:dev
npm run demo
```

带真实中间件：

```bash
cd infrastructure && docker compose up -d
# .env:
# DB_MODE=mysql
# QUEUE_MODE=rabbitmq
# REDIS_ENABLED=true
```

## 5. Sprint 3 建议

1. 全面 Repository 化，去掉 memory 主路径（或保留为测试 double）
2. MinIO 票据图上传
3. 真实 OCR / 多模态网关
4. 打卡 GPS + 积分商城兑换
5. OpenAPI 契约测试
