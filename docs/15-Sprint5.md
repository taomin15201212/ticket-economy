# Sprint 5 交付说明

目标：Repository 接口化、微信登录适配、Taro 小程序脚手架、k6 与 OpenAPI 覆盖检查。

## 1. 已完成

| 能力 | 路径 / 说明 |
| --- | --- |
| `AppRepository` 接口 | `src/store/app.repository.ts` |
| `MemoryRepository` | 默认实现，DI token `APP_REPOSITORY` |
| 微信登录适配 | `WechatService`：`mock` / `real` jscode2session |
| Auth 走 Repository | `AuthService` 注入 `APP_REPOSITORY` |
| Taro 脚手架 | `apps/mini-user-weapp`（页面 + api client） |
| k6 烟囱 | `scripts/k6-smoke.js` |
| OpenAPI 覆盖扫描 | `scripts/openapi-coverage.mjs` |
| health | 增加 `wechat` / `repository` |

## 2. 微信登录配置

```env
WECHAT_MODE=mock          # 开发默认
# 生产：
WECHAT_MODE=real
WECHAT_APPID=wx...
WECHAT_SECRET=...
```

- `mock`：`code=demo` → 演示用户；其它 code → `wx_{code}`
- `real`：调用微信 `jscode2session`

探针：`GET /api/auth/wechat/mode`

## 3. Taro 小程序

```bash
cd apps/mini-user-weapp
npm install
npm run dev:weapp
```

详见 `apps/mini-user-weapp/README.md`。

## 4. 验证

```bash
cd services/api-server
npm test
npm run test:e2e
npm run openapi:coverage
npm run demo
# 可选（需安装 k6）
npm run k6:smoke
```

## 5. Sprint 6 建议

1. 其余业务 Service 全面改注入 `APP_REPOSITORY`（去掉直接 `MemoryStore`）
2. `MysqlRepository` 实现（纯 SQL，无 memory）
3. `mini-merchant-weapp` 核销端 Taro
4. 微信上传文件 `Taro.uploadFile` + MinIO 预签名
5. CI：test + openapi:coverage + k6 smoke
