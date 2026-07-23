# Services

一期模块化单体 + 异步 workers：

```text
services/api-server   # NestJS API（Sprint 0–10）
services/workers      # OCR / AI 审核 / 券过期扫描（Sprint 2+）
```

## api-server

见 [api-server/README.md](./api-server/README.md)。

默认 `REVIEW_PIPELINE=combined`：提交票据后在 API 进程内（或 `ticket.review` 队列）完成 OCR+AI。

## workers

见 [workers/README.md](./workers/README.md)。

对齐 `docs/05-Redis与MQ设计.md`：

| Queue | 消费者 | 职责 |
| --- | --- | --- |
| `ticket.upload` | ocr-worker | OCR 字段提取 → 回调 API |
| `ticket.ocr.finished` | ai-worker | 风险评分 → 通过/人工/拒绝 |
| `coupon.expire.scan` | expire-worker | 扫描并标记过期券 |

### 拆分审核管线（可选）

```bash
# infrastructure
docker compose up -d rabbitmq

# api-server .env
QUEUE_MODE=rabbitmq
REVIEW_PIPELINE=split
WORKER_SECRET=te-worker-dev-secret

# workers
cd services/workers && cp .env.example .env && npm i && npm run start:dev
```
