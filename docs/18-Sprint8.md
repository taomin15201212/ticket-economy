# Sprint 8 交付说明

目标：去掉剩余 `repo.raw`、K8s 清单、安全加固与微信域名指引。

## 1. 已完成

| 能力 | 说明 |
| --- | --- |
| 去 raw | admin / catalog / merchant / user 全面方法级 Repository |
| Repository 扩展 | messages、sysRoles、merchantAccounts、listAllUserCoupons 等 |
| K8s | `deploy/k8s/*` Namespace / ConfigMap / Secret 示例 / API / MySQL / Redis / Ingress |
| Dockerfile | `services/api-server/Dockerfile` 多阶段构建 |
| 安全 | CORS 白名单、`TRUST_PROXY`、基础安全头 |
| 文档 | 微信域名与上线清单（本文 §3） |

## 2. K8s 快速应用

```bash
# 1. 复制并填写密钥
cp deploy/k8s/secret.example.yaml deploy/k8s/secret.yaml
# 编辑 secret.yaml

# 2. 构建镜像（示例）
cd services/api-server
docker build -t ticket-economy/api-server:latest .

# 3. 部署
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/configmap.yaml
kubectl apply -f deploy/k8s/secret.yaml
kubectl apply -f deploy/k8s/mysql.yaml
kubectl apply -f deploy/k8s/redis.yaml
kubectl apply -f deploy/k8s/api-deployment.yaml
kubectl apply -f deploy/k8s/ingress.yaml
```

生产请将 MySQL/Redis/MinIO 换为托管服务，勿长期使用示例单节点。

## 3. 微信小程序上线清单

| 项 | 说明 |
| --- | --- |
| request 合法域名 | `https://api.your-domain.com`（须 HTTPS，无端口） |
| uploadFile 域名 | 同 API 或对象存储 HTTPS 域名 |
| downloadFile | 封面/图片 CDN 域名 |
| 业务域名 | 若 H5 web-view 需要 |
| `WECHAT_MODE=real` | 配置 `WECHAT_APPID` + `WECHAT_SECRET` |
| 服务器 IP 白名单 | 按微信后台要求（如有） |
| 用户隐私 | 定位打卡需在小程序后台声明用途 |

本地开发：微信开发者工具关闭域名校验；`config/dev.ts` 指向局域网 IP。

## 4. 安全环境变量

```env
CORS_ORIGINS=https://admin.example.com
TRUST_PROXY=true
JWT_SECRET=<long-random>
WECHAT_MODE=real
WECHAT_APPID=...
WECHAT_SECRET=...
```

## 5. 验证

```bash
cd services/api-server
npm run build && npm test && npm run test:e2e
# 确认无 repo.raw 引用（业务层）
rg "repo\\.raw" src --glob '!**/*repository*'
```

## 6. Sprint 9 建议

1. 纯 SQL Repository（去掉 memory 缓存主路径）
2. Helm chart / GitOps
3. 观测：Prometheus metrics 端点
4. 密钥管理：ExternalSecrets / SealedSecrets
