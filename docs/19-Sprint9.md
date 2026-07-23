# Sprint 9 交付说明

目标：纯 SQL 仓储路径、Prometheus 指标、Helm / GitOps、密钥管理示例。

## 1. 已完成

| 能力 | 说明 |
| --- | --- |
| `DB_MODE=mysql-sql` | 强制 MySQL 可达，连接失败直接退出 |
| `SqlMysqlRepository` | 生产向仓储：写操作强制落库 |
| Prometheus | `GET /metrics` + 业务 Counter/Histogram |
| Helm Chart | `deploy/helm/ticket-economy` |
| 密钥示例 | ExternalSecrets / SealedSecrets |
| GitOps | `deploy/gitops/README.md`（Argo CD） |

## 2. DB_MODE 对照

| 模式 | 仓储 | MySQL |
| --- | --- | --- |
| `memory` | MemoryRepository | 关闭 |
| `mysql` | MysqlRepository（hybrid） | 可降级 memory |
| `mysql-sql` | SqlMysqlRepository | **必须可用** |

```env
DB_MODE=mysql-sql
MYSQL_HOST=...
MYSQL_USER=...
MYSQL_PASSWORD=...
MYSQL_DATABASE=ticket_economy
```

## 3. 指标

```bash
curl -s http://localhost:3000/metrics | head
```

主要指标：

- `te_http_requests_total` / `te_http_request_duration_seconds`
- `te_tickets_submitted_total` / `te_tickets_approved_total`
- `te_blindbox_opened_total`
- `te_coupons_redeemed_total`
- `te_checkins_total`
- 默认 Node 进程指标（`te_` 前缀）

## 4. Helm

```bash
helm upgrade --install ticket-economy deploy/helm/ticket-economy \
  -n ticket-economy --create-namespace \
  --set image.tag=latest
```

## 5. 验证

```bash
cd services/api-server
npm run build && npm test && npm run test:e2e
npm run start:dev
curl -s localhost:3000/metrics | head
curl -s localhost:3000/health
```

## 6. Sprint 10 建议

1. 服务层全面 async + 直接 SQL（去掉进程内缓存）
2. Grafana Dashboard JSON
3. 告警规则（审核失败率、队列堆积）
4. 多环境 values-prod / values-staging
