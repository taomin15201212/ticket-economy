# Sprint 7 交付说明

目标：方法级 Repository 深化、MySQL hybrid 绑定、预签名上传、CI load-smoke。

## 1. 已完成

| 能力 | 说明 |
| --- | --- |
| AppRepository 扩展 | user/ticket/coupon/blindbox/point/merchant/checkin/message 方法齐全 |
| 核心 Service 去 raw | point / ticket / coupon / blindbox / checkin / jwt 仅用方法 API |
| MysqlRepository | `DB_MODE=mysql` → `mysql-hybrid` 后端标识 |
| 预签名上传 | `POST /api/ticket/presign`（MinIO PUT / 本地 POST 回退） |
| 小程序 upload 助手 | `apps/mini-user-weapp/src/utils/upload.ts` |
| CI load-smoke | 起 API 后跑并发烟囱 |

## 2. Presign 流程

```text
客户端 → POST /api/ticket/presign
       ← { uploadUrl, publicUrl, backend, method }

MinIO:  PUT uploadUrl(file) → POST /api/ticket/upload { imageUrl: publicUrl }
Local:  Taro.uploadFile → POST /api/ticket/upload (multipart)
```

## 3. CI

```yaml
# .github/workflows/ci.yml
- build / unit / e2e / openapi:coverage
- start:prod background
- load:smoke concurrency=8 rounds=2
```

## 4. 验证

```bash
cd services/api-server
npm run build && npm test && npm run test:e2e
npm run start:dev
# 另开终端
npm run demo
npm run load:smoke
```

## 5. Sprint 8 建议

1. admin/catalog/merchant 控制器去掉 `repo.raw`
2. 纯 SQL MysqlRepository（无 memory 缓存）
3. 微信合法域名 / 上传安全策略
4. K8s Deployment 清单
