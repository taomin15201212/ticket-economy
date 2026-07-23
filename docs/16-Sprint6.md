# Sprint 6 交付说明

目标：业务层统一走 Repository、MySQL hybrid 绑定、商户小程序脚手架、CI。

## 1. 已完成

| 能力 | 说明 |
| --- | --- |
| 业务 DI | ticket/point/coupon/checkin/blindbox/catalog/admin/user/merchant/jwt → `APP_REPOSITORY` |
| `repo.raw` | 过渡 getter，保证行为不变同时完成注入统一 |
| `MysqlRepository` | `DB_MODE=mysql` 时绑定 hybrid 实现 |
| `REPOSITORY_MODE` | health 暴露 `memory` / `mysql-hybrid` |
| 商户小程序 | `apps/mini-merchant-weapp` |
| CI | `.github/workflows/ci.yml`：build + unit + e2e + openapi coverage |

## 2. Repository 选型

```ts
// store.module.ts
APP_REPOSITORY → DB_MODE=mysql ? MysqlRepository : MemoryRepository
```

两者共享 `MemoryStore` 实例；MySQL 模式下 `MysqlService` 负责 hydrate + 写穿。

## 3. 商户小程序

```bash
cd apps/mini-merchant-weapp
npm install && npm run dev:weapp
```

账号：`merchant01` / `123456`

## 4. CI

Push / PR 到 main 自动：

1. `npm ci` / `build` / `test` / `test:e2e`
2. `openapi:coverage`（覆盖率 < 70% 失败）

## 5. 验证

```bash
cd services/api-server
npm run build && npm test && npm run test:e2e
npm run demo
```

## 6. Sprint 7 建议

1. 去掉 `repo.raw`，方法级 Repository API 全覆盖
2. 真·SQL MysqlRepository（无 memory 主路径）
3. 微信 `uploadFile` + 预签名 URL
4. CI 增加 load-smoke / 可选 k6
