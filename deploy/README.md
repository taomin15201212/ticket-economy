# Deploy

## 本地开发

```bash
# 可选中间件
cd infrastructure && docker compose up -d

# API
cd services/api-server && npm i && npm run start:dev

# 前端
cd apps/mini-user && npm i && npm run dev
```

## Docker 镜像

```bash
cd services/api-server
docker build -t ticket-economy/api-server:latest .
docker run --rm -p 3000:3000 \
  -e DB_MODE=memory \
  -e JWT_SECRET=dev \
  ticket-economy/api-server:latest
```

## Helm

```bash
# 默认
helm upgrade --install ticket-economy deploy/helm/ticket-economy \
  -n ticket-economy --create-namespace

# 多环境
helm upgrade --install te-dev  deploy/helm/ticket-economy -f deploy/helm/ticket-economy/values-dev.yaml -n ticket-economy-dev --create-namespace
helm upgrade --install te-stg  deploy/helm/ticket-economy -f deploy/helm/ticket-economy/values-staging.yaml -n ticket-economy-stg --create-namespace
helm upgrade --install te-prod deploy/helm/ticket-economy -f deploy/helm/ticket-economy/values-prod.yaml -n ticket-economy --create-namespace
```

GitOps 说明：`deploy/gitops/README.md`  
密钥示例：`k8s/external-secret.example.yaml`、`k8s/sealed-secret.example.yaml`  
可观测：`deploy/observability/`（Grafana + PrometheusRule）

## Kubernetes 原始清单

见 `k8s/`：

| 文件 | 说明 |
| --- | --- |
| `namespace.yaml` | 命名空间 |
| `configmap.yaml` | 非敏感配置 |
| `secret.example.yaml` | 密钥模板（复制为 secret.yaml） |
| `api-deployment.yaml` | API Deployment + Service |
| `mysql.yaml` / `redis.yaml` | 开发用中间件 |
| `ingress.yaml` | Ingress 示例 |

详细步骤：`docs/18-Sprint8.md`。

## 环境变量

见 `services/api-server/.env.example`。生产务必设置：

- `JWT_SECRET`
- `CORS_ORIGINS`（明确域名列表）
- `WECHAT_MODE=real` + AppID/Secret
- `DB_MODE=mysql` + 数据库连接
