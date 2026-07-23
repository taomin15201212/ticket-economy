# Observability（Sprint 10）

## Prometheus scrape

API 暴露：

```text
GET /metrics
```

Pod annotations（Helm 已带）：

```yaml
prometheus.io/scrape: "true"
prometheus.io/port: "3000"
prometheus.io/path: "/metrics"
```

或启用 Helm `serviceMonitor.enabled=true`。

## Grafana

导入 `grafana-dashboard-ticket-economy.json`：

1. Grafana → Dashboards → Import
2. 选择 Prometheus 数据源
3. 保存

## Alerts

```bash
kubectl apply -f deploy/observability/prometheus-rules.yaml
```

需集群已安装 Prometheus Operator。
