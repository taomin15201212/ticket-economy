# mini-user-weapp（Taro 3 + Vue3）

消费者微信小程序脚手架，对接 `services/api-server`。

## 前置

- Node 18+
- 微信开发者工具
- 本地 API：`cd services/api-server && npm run start:dev`

## 安装与开发

```bash
cd apps/mini-user-weapp
npm install
npm run dev:weapp
```

用微信开发者工具打开 `apps/mini-user-weapp`（或 `dist/`，视 Taro 版本）。

真机调试时修改 `config/dev.ts` 中 `TARO_APP_API` 为电脑局域网 IP，例如 `http://192.168.1.8:3000`。

## 页面

| 页面 | 能力 |
| --- | --- |
| index | 登录 / 入口 |
| ticket | 上传 + 提交审核 |
| blindbox | 开盲盒 |
| coupons | 券包 |
| checkin | GPS 打卡 |
| points | 积分商城 |

## 登录

- 默认后端 `WECHAT_MODE=mock`：开发者工具可用 `demo` / `wx.login` code 映射 openid
- 生产：后端设 `WECHAT_MODE=real` + `WECHAT_APPID` + `WECHAT_SECRET`

## 说明

本目录为可构建脚手架；若本机未装齐 Taro 依赖，可先对照 `src/utils/api.ts` 与 H5 `mini-user` 联调 API，再 `npm install` 完整构建。
