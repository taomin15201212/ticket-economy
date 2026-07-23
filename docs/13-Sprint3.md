# Sprint 3 交付说明

在 Sprint 2 基础上补齐：对象存储、可插拔 AI 网关、GPS 打卡、积分商城。

## 1. 已完成

| 能力 | 说明 | 降级 |
| --- | --- | --- |
| 对象存储 | `StorageService`：MinIO 优先 | 失败 → 本地 `./uploads` |
| AI 网关 | `AiGatewayService`：`mock` / `http` | HTTP 失败 → mock/启发式 |
| GPS 打卡 | 点位半径校验（Haversine）+ 积分 | 未知点位 → 待人工抽检 |
| 积分商城 | 商品列表、兑换扣积分、兑换记录 | 库存/积分校验 |
| 管理端 | 积分商品 CRUD API | — |

## 2. 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `MINIO_ENABLED` | true | 关闭则强制本地盘 |
| `MINIO_*` | 见 `.env.example` | 与 compose 账号对齐 |
| `AI_PROVIDER` | mock | `http` 时调 `AI_OCR_URL` / `AI_RISK_URL` |
| `AI_MOCK_MODE` | auto_approve | 仍可用于演示 reject/manual |

## 3. API 增量

| Method | Path | 说明 |
| --- | --- | --- |
| POST | `/api/ticket/upload` | 支持文件 buffer → storage；返回 `storageBackend` |
| GET | `/api/checkin/locations` | 打卡点列表 |
| GET | `/api/checkin/task` | 打卡任务 |
| GET | `/api/checkin/history` | 打卡历史 |
| POST | `/api/checkin` | GPS 打卡 body: lng/lat/locationId |
| GET | `/api/point/goods` | 积分商品 |
| POST | `/api/point/exchange` | 兑换 `{ goodsId }` |
| GET | `/api/point/exchanges` | 我的兑换 |
| GET/POST/PUT | `/api/admin/point/goods` | 管理商品 |
| GET | `/health` | 增加 `storage` / `ai` |

## 4. Seed 点位（南昌）

- 秋水广场、滕王阁、千百味红谷滩店（含半径）

## 5. 验证

```bash
cd services/api-server
npm run start:dev
npm run demo
```

预期链路：上传审核 → 盲盒 → 核销 → 打卡积分 → 兑换商品。

## 6. Sprint 4 建议

1. Repository 全面 MySQL 化
2. 真实 OCR/多模态对接联调
3. 小程序 Taro 迁移
4. 契约测试 + 压测脚本
