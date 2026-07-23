# 文旅消费券积分平台

面向游客、商户、景区与运营方的「消费票据兑换 + 盲盒发券 + 商户核销 + 积分成长」平台。

本仓库从设计资产包推进到 **可本地运行的工程骨架（Sprint 0/1）**，覆盖：

- 产品需求（PRD）与业务状态机
- 系统架构 / 风控 / 权限 / 部署
- 数据库 DDL + OpenAPI
- **NestJS API（主业务闭环可跑）**
- **Sprint 2：异步审核 · Redis 日限 · MySQL 适配 · 管理 CRUD**
- **Sprint 3：MinIO/本地存储 · AI 网关 · GPS 打卡 · 积分商城**
- **Sprint 4：MySQL 写穿 · 多模态 AI · 契约测试 · 压测烟囱**
- **Sprint 5：Repository · 微信登录 · Taro 消费者脚手架 · k6 / OpenAPI**
- **Sprint 6：全业务 Repository DI · 商户小程序 · CI**
- **Sprint 7：方法级 Repository · 预签名上传 · CI load-smoke**
- **Sprint 8：去 raw · K8s 清单 · 安全加固 · 微信上线清单**
- **Sprint 9：mysql-sql · Prometheus · Helm/GitOps · 密钥管理示例**
- **Sprint 10：async SQL 核心链路 · Grafana/告警 · 多环境 Helm**
- **H5 三端 + Taro 双端小程序脚手架**
- **Docker Compose + K8s + Helm + 可观测资产**
- [实施计划](docs/11-实施计划.md) · [docs/](docs/)

## 产品一句话

用户上传消费票据 → AI 审核 → 盲盒抽消费券 → 商户核销 → 积分发放与兑换，形成本地消费闭环。

## 5 分钟本地演示

```bash
# 1. 启动 API（默认内存模式，无需 Docker）
cd services/api-server
npm install
npm run start:dev

# 2. 另开终端：跑主闭环脚本
cd services/api-server
npm run demo

# 3. （可选）启动前端
cd apps/mini-user && npm i && npm run dev      # http://localhost:5173
cd apps/mini-merchant && npm i && npm run dev # http://localhost:5174
cd apps/admin-web && npm i && npm run dev     # http://localhost:5175
```

### 演示账号

| 角色 | 凭证 |
| --- | --- |
| 消费者 | `POST /api/auth/login` · `{ "code": "demo" }` |
| 商户 | `merchant01` / `123456` |
| 管理后台 | `admin` / `admin123` |

### 主闭环

```text
登录 → 上传票据 →（mock）AI 通过 → 开盲盒发券 → 商户核销 → 积分入账
```

## 目录结构

```text
ticket-economy/
├── README.md
├── docs/                 # PRD、架构、状态机、实施计划…
├── sql/                  # MySQL DDL + seed
├── openapi/openapi.yaml
├── apps/
│   ├── mini-user/        # 消费者 H5（Vue3）
│   ├── mini-merchant/    # 商户核销 H5
│   └── admin-web/        # 管理后台（Vue3 + Element Plus）
├── services/
│   └── api-server/       # NestJS 模块化单体
├── infrastructure/       # docker-compose: MySQL/Redis/MQ/MinIO
├── deploy/
└── scripts/
```

## 中间件（可选）

```bash
cd infrastructure
docker compose up -d
```

| 服务 | 端口 |
| --- | --- |
| MySQL | 3306 |
| Redis | 6379 |
| RabbitMQ | 5672 / 15672 |
| MinIO | 9000 / 9001 |

> Sprint 1 API 默认 `DB_MODE=memory` 便于零依赖演示；MySQL DDL 已就绪，持久化适配见 Sprint 2。

## 角色与端

| 角色 | 端 | 核心能力 |
| --- | --- | --- |
| 消费者 | mini-user（后续小程序） | 上传票据、抽盲盒、用券、积分 |
| 商户 | mini-merchant | 门店登录、验券核销、统计 |
| 运营/审核 | admin-web | 审票台、看板 |
| 系统 | mock AI | OCR/风控模拟（可切 auto_manual / auto_reject） |

## MVP 范围（建议 3 个月）

必须做：上传票据 · AI+人工审核 · 盲盒发券 · 商户核销 · 积分流水 · 后台统计  

暂缓：地铁/滴滴/电影正式对接 · Beacon · AI 导游 · 大屏 2.0  

详见 [docs/11-实施计划.md](docs/11-实施计划.md)。

## 技术栈（已选定落地）

| 层 | 选型 |
| --- | --- |
| 演示前端 | Vue3 + Vite（正式小程序迁 Taro/uni-app） |
| 管理后台 | Vue3 + Element Plus |
| API | NestJS + TypeScript |
| 数据库 | MySQL 8（DDL 已交付） |
| 缓存 / 消息 / 对象存储 | Redis / RabbitMQ / MinIO |
| AI | Mock 网关（Sprint 2 接真实 OCR/多模态） |

## 快速阅读顺序

1. [docs/01-PRD.md](docs/01-PRD.md)
2. [docs/02-业务状态机.md](docs/02-业务状态机.md)
3. [docs/11-实施计划.md](docs/11-实施计划.md)
4. [docs/03-系统架构.md](docs/03-系统架构.md)
5. [sql/00-init.sql](sql/00-init.sql)
6. [openapi/openapi.yaml](openapi/openapi.yaml)
7. [services/api-server/README.md](services/api-server/README.md)

## 打包文档

```bash
bash scripts/package-docs.sh
```

生成 `ticket-economy-docs.zip`。

## 说明

- 设计文档 + SQL + OpenAPI 可直接用于立项。
- Sprint 0/1 已提供可演示的 API 与三端骨架；生产级持久化、异步 AI worker、真实小程序为后续迭代。
