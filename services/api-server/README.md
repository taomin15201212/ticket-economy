# API Server (NestJS)

模块化单体 API，对齐 `openapi/openapi.yaml` 与业务状态机。

## 快速启动（内存模式，无需 Docker）

```bash
cd services/api-server
cp .env.example .env   # 已有 .env 可跳过
npm install
npm run start:dev
```

默认：

- `http://localhost:3000`
- `DB_MODE=memory`（内置 seed：演示用户 / 商户 / 盲盒奖池）
- `REVIEW_MODE=async`（审核入队；worker 内存/RabbitMQ）
- `REVIEW_PIPELINE=combined`（默认进程内 OCR+AI）或 `split`（投递 `ticket.upload` 给 [../workers](../workers)）
- Redis 日限（连不上自动 memory 回退）
- `AI_MOCK_MODE=auto_approve`

健康检查：`GET /health` 返回 `infra.redis / queue / reviewPipeline / mysql / storage / ai / wechat / repository`。

Workers 内部回调（`X-Worker-Secret`）：`/api/internal/tickets/:id/ocr|ai-decision`、`/api/internal/coupons/expire`。

微信登录：`WECHAT_MODE=mock|real`（见 `.env.example`）。

```bash
npm run openapi:coverage   # OpenAPI 路径覆盖
npm run load:smoke         # Node 并发烟囱
# npm run k6:smoke         # 需安装 k6
```

预签名上传：`POST /api/ticket/presign` → MinIO PUT 或本地 multipart 回退。

## 演示账号

| 角色 | 方式 |
| --- | --- |
| 消费者 | `POST /api/auth/login` body `{ "code": "demo" }` |
| 商户 | username=`merchant01` password=`123456` |
| 管理后台 | username=`admin` password=`admin123` → `POST /api/auth/admin/login` |

## 主闭环脚本

另开终端：

```bash
npm run demo
```

## MySQL 模式（可选）

1. 启动基础设施：`cd infrastructure && docker compose up -d`
2. `.env` 设置 `DB_MODE=mysql`（当前 Sprint 1 仍以 memory 实现闭环；MySQL DDL 已就绪，持久化适配放在 Sprint 2）

## 模块

- auth / user / ticket / blindbox / coupon / point / merchant / admin
