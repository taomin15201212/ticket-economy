# GitOps 说明（Sprint 9）

推荐把 `deploy/helm` 或 `deploy/k8s` 作为唯一部署真源。

## Argo CD 示例 Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ticket-economy
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/ticket-economy.git
    targetRevision: main
    path: deploy/helm/ticket-economy
    helm:
      valueFiles:
        - values.yaml
        # - values-prod.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: ticket-economy
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## 密钥

- 开发：`secret.example.yaml` 手工创建
- 生产：`external-secret.example.yaml` 或 `sealed-secret.example.yaml`

## 监控

Pod 已标注：

```text
prometheus.io/scrape: "true"
prometheus.io/path: "/metrics"
```

或启用 Helm `serviceMonitor.enabled=true`（需 Prometheus Operator）。
