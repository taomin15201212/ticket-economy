# Workers（OCR / AI / 过期扫描）

独立进程消费 RabbitMQ，对齐 `docs/05-Redis与MQ设计.md`：

| Queue | Worker | 说明 |
| --- | --- | --- |
| `ticket.upload` | ocr-worker | 新票 OCR |
| `ticket.ocr.finished` | ai-worker | 风险评分 + 审核决策 |
| `coupon.expire.scan` | expire-worker | 过期券扫描 |

结果通过 **API 内部回调** 写回（`X-Worker-Secret`）：

- `POST /api/internal/tickets/:id/ocr`
- `POST /api/internal/tickets/:id/ai-decision`
- `POST /api/internal/coupons/expire`
- `GET /api/internal/tickets/:id`

## 快速启动

```bash
# 1) 基础设施（RabbitMQ 等）
cd infrastructure && docker compose up -d rabbitmq

# 2) API（split 管线，把审核交给 workers）
cd services/api-server
# .env:
#   QUEUE_MODE=rabbitmq
#   REVIEW_PIPELINE=split
#   WORKER_SECRET=te-worker-dev-secret
npm run start:dev

# 3) Workers
cd services/workers
cp .env.example .env
npm install
npm run start:dev
```

健康检查：`GET http://localhost:3001/health`

```bash
npm run smoke
```

## 环境变量

见 `.env.example`。关键项：

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `PORT` | 3001 | HTTP 健康端口 |
| `RABBITMQ_URL` | amqp://te:te_pass@127.0.0.1:5672 | MQ |
| `API_BASE_URL` | http://127.0.0.1:3000 | 回调 API |
| `WORKER_SECRET` | te-worker-dev-secret | 与 API 一致 |
| `AI_MOCK_MODE` | auto_approve | auto_approve / auto_manual / auto_reject |
| `EXPIRE_SCAN_INTERVAL_MS` | 60000 | 过期扫描周期；0 关闭定时 |

## 与 API 的关系

| `REVIEW_PIPELINE` | 行为 |
| --- | --- |
| `combined`（默认） | API 进程内 `ticket.review` 一次做完 OCR+AI（无需 workers） |
| `split` | API 只投递 `ticket.upload`；需本服务消费 |

MQ 不可用时：workers 仍可按定时器直接调 API 做 **券过期扫描**；票据审核需 RabbitMQ。

## 管线示意

```text
submit → ticket.upload
           ↓ ocr-worker
         OCR + POST .../ocr
           ↓ ticket.ocr.finished
         ai-worker
           ↓ POST .../ai-decision
         Approved / Manual / Rejected
```
