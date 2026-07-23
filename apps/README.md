# Apps

三端前端（按 `nanchang-ticket-economy.html` 高保真原型落地的 Vue3 演示界面）。

| 应用 | 目录 | 端口 | 说明 |
| --- | --- | ---: | --- |
| 消费者 H5 | `mini-user` | 5173 | 首页 / 上传 / 盲盒 / 打卡 / 积分 / 卡券详情 / 我的 |
| 商户 H5 | `mini-merchant` | 5174 | 登录 / 工作台 / 扫码·手工核销 / 核销记录·CSV / 7日对账 |
| 管理后台 | `admin-web` | 5175 | 审票台 · 券模板 · 盲盒权重 · 积分商品 · 商户审核 · 数据总览 |
| 消费者小程序 | `mini-user-weapp` | — | Taro 3 + Vue3（Sprint 5） |
| 商户小程序 | `mini-merchant-weapp` | — | Taro 核销端（Sprint 6） |

## 视觉体系

- 纸感暖底 `#f7f2e7` / 表面 `#fffdf7`
- 朱红强调 `#b32b1e` · 鎏金 `#b8892d`
- 衬线标题 + 系统黑体正文 + mono 元信息

## 启动

```bash
cd services/api-server && npm run start:dev
# 可选：npm run demo

cd apps/mini-user && npm run dev      # :5173
cd apps/mini-merchant && npm run dev  # :5174
cd apps/admin-web && npm run dev      # :5175
```

Vite 将 `/api` 代理到 `http://localhost:3000`。

## 消费者主流程

```text
登录(demo)
  → 上传票据 → 异步审核轮询
  → 开盲盒（2~3s 动效）→ 券包
  → 景区打卡（模拟 GPS 围栏）→ +积分
  → 积分商城兑换 / 排行榜 / 流水
```

## 账号

| 端 | 账号 |
| --- | --- |
| 消费者 | `code=demo` |
| 商户 | `merchant01 / 123456` |
| 管理 | `admin / admin123` |

## 管理端配置接口

- 券模板：`/api/admin/coupon/templates`
- 盲盒：`/api/admin/blindbox/*`
- 积分商品：`/api/admin/point/goods`


## 商户主流程

```text
登录 merchant01
  → 扫码/手工核销券码
  → 核销记录列表
  → 今日对账 + 近 7 日趋势
  → 导出 CSV
```


## 卡券与商户

- 消费者卡包点击进入详情：券码、规则、有效期、复制券码
- 管理后台「商户管理」：列表筛选、通过/停用入驻商户


## 消息与风控

- 消费者消息中心：审核 / 发券 / 核销 / 系统通知，支持全部已读
- 管理后台用户管理：搜索、拉黑、解封；拉黑后 JWT 立即失效


## 活动中心

- 管理端可配置 Banner、公告、运营配置项（活动季名 / Day / 首页标题）
- 消费者首页读取 `GET /api/activity/home`，Banner 可跳转上传 / 打卡 / 积分 / 盲盒


## 风控中心

- 策略阈值（自动通过 / 人工 / 重复票 / 盲盒日限）
- 多维黑名单（user/phone/openid/device/ip）
- 风险事件流 + 票据风险信号


## 风控落地

- 上传 / 开盲盒前校验用户状态与黑名单
- 重复票、盲盒日限命中写入风险事件
- 系统设置页展示角色、权限点与运行环境


## UI 细节

三端已接入 `lucide-vue-next` 图标：

- 消费者：底栏 / 玩法卡片 / 按钮 / 消息与快捷入口
- 商户：工作台 Tab / 扫码核销 / 导出
- 管理后台：侧栏导航与常用操作按钮


## 消费者登录与上传

- 未登录进入独立登录页（模拟微信 code，默认 `demo`）
- 上传票根需选择图片附件（`multipart/form-data` 字段 `image`）
- 本地无 MinIO 时自动落到 `services/api-server/uploads`
- 仍保留「生成演示附件并跑通闭环」入口便于联调


## 管理后台 · Workers OCR 智能核验

启用 split 管线后，智能核验接入 `services/workers`：

```text
submit → ticket.upload → ocr-worker → AI worker → 回写 API → 管理台展示
```

关键环境（api-server `.env`）：

- `QUEUE_MODE=rabbitmq`
- `REVIEW_PIPELINE=split`
- `WORKER_SECRET=te-worker-dev-secret`
- `RABBITMQ_URL=amqp://te:te_pass@127.0.0.1:5672`

workers：

```bash
cd services/workers && npm run start:dev   # :3001
```

管理台能力：

- 展示 OCR 商户 / 金额 / 置信度 / 风险分 / 原图
- 人工通过/拒绝
- 一键「重跑 Workers OCR」
