# mini-merchant-weapp（Taro 3 + Vue3）

商户核销微信小程序脚手架。

## 页面

| 页面 | 能力 |
| --- | --- |
| login | 商户账号登录 |
| home | 工作台统计 |
| verify | 扫码 / 手工核销 |
| records | 核销记录 |

## 启动

```bash
# API
cd services/api-server && npm run start:dev

# 小程序
cd apps/mini-merchant-weapp
npm install
npm run dev:weapp
```

演示账号：`merchant01` / `123456`

真机调试请改 `config/dev.ts` 中 `TARO_APP_API` 为局域网 IP。
