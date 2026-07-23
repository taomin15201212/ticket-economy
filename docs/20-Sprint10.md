# Sprint 10 交付说明

目标：核心链路 async SQL 读回写、Grafana 看板、告警规则、多环境 Helm values。

## 1. 已完成

| 能力 | 说明 |
| --- | --- |
| Async SQL 读写 | `MysqlService` 增加 `find*Sql` / `upsert*Sql` |
| Auth | 登录 / JWT 校验在 `mysql-sql` 下走 SQL 读 |
| Ticket | 上传/提交/审核结果 `upsertTicketSql` |
| Coupon | 锁定/核销 `upsertCouponSql` |
| Grafana | `deploy/observability/grafana-dashboard-ticket-economy.json` |
| Alerts | `deploy/observability/prometheus-rules.yaml` |
| Helm 多环境 | `values-dev.yaml` / `values-staging.yaml` / `values-prod.yaml` |

## 2. 纯 SQL 路径说明

在 `DB_MODE=mysql-sql` 时：

1. 启动强制连接 MySQL（失败退出）
2. Auth 查用户：`findUserByOpenidSql` / `findUserByIdSql`
3. Ticket / Coupon 写后回读 SQL，回写进程缓存（过渡期）

仍保留进程内缓存以兼容同步 Repository API；全量去掉缓存需更大改造。

## 3. 监控

```bash
# 指标
curl -s localhost:3000/metrics | head

# 导入 Grafana JSON
# 应用告警
kubectl apply -f deploy/observability/prometheus-rules.yaml
```

告警：

- 5xx 率 > 5%
- p95 > 1s
- 票据通过率偏低
- scrape target down

## 4. Helm 多环境

```bash
# 开发
helm upgrade --install te-dev deploy/helm/ticket-economy \
  -n ticket-economy-dev --create-namespace \
  -f deploy/helm/ticket-economy/values-dev.yaml

# 预发
helm upgrade --install te-stg deploy/helm/ticket-economy \
  -n ticket-economy-stg --create-namespace \
  -f deploy/helm/ticket-economy/values-staging.yaml

# 生产
helm upgrade --install te-prod deploy/helm/ticket-economy \
  -n ticket-economy --create-namespace \
  -f deploy/helm/ticket-economy/values-prod.yaml
```

## 5. 验证

```bash
cd services/api-server
npm run build && npm test && npm run test:e2e
```

## 6. 后续建议

1. 全部 Service 改为 async，Repository 接口 Promise 化
2. 读写完全绕过 MemoryStore
3. Grafana 告警通知渠道（Slack/企微）
4. 压测基线与容量规划文档
