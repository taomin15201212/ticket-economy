# Sprint 4 交付说明

目标：持久化加深、AI 网关多模态结构化、契约测试与压测烟囱、小程序迁移路径。

## 1. 已完成

| 能力 | 说明 |
| --- | --- |
| MySQL 写穿加深 | hydrate tickets/coupons/goods/checkin_location；user/ticket/coupon/point/checkin 写穿 |
| seq 对齐 | 从 DB 加载后 `advanceSeq`，避免 id 冲突 |
| AI multimodal | `multimodalReview()`；`AI_PROVIDER=multimodal` + `AI_MULTIMODAL_URL` |
| AI 探针 API | `POST /api/ai/ocr|review|risk-score`（admin） |
| 契约 e2e | `test/contract.e2e-spec.ts` 主链路 |
| 负载烟囱 | `scripts/load-smoke.mjs` |
| 小程序路径 | `apps/MINIAPP.md`（Taro 迁移指南） |
| 单元测试 | `geo.spec.ts` 距离计算 |

## 2. 环境变量新增

```env
AI_PROVIDER=mock|http|multimodal
AI_MULTIMODAL_URL=
AI_MULTIMODAL_MODEL=mock-multimodal-v1
```

## 3. 验证命令

```bash
cd services/api-server

# 单元 + 契约
npm test
npm run test:e2e

# 演示闭环（需 start:dev）
npm run demo

# 并发烟囱
node scripts/load-smoke.mjs http://localhost:3000 20 3
```

## 4. MySQL 模式

```bash
cd infrastructure && docker compose up -d
# services/api-server/.env
DB_MODE=mysql
```

启动后日志应出现 `MySQL connected — hydrating store`。

## 5. Sprint 5 建议

1. 去掉 memory 主路径，Repository 接口 + MySQL 实现  
2. 微信 code2session 真登录  
3. Taro 工程脚手架落地  
4. k6/artillery 正式压测清单（上传/开盒/核销）  
5. OpenAPI 与实现自动 diff（schemathesis）
