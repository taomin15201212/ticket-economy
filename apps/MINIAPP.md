# 微信小程序迁移指南（Sprint 4）

当前 `mini-user` / `mini-merchant` 为 **Vue3 H5 演示壳**，用于联调 API。正式上线建议迁到 **Taro 3 + Vue3** 或 **uni-app**。

## 推荐：Taro 3 + Vue3

```bash
# 在 apps/ 下初始化（需本机已装 Node 18+）
npx @tarojs/cli init mini-user-weapp
# 选择 Vue3 + 微信小程序
```

### 目录映射

| H5 演示 | 小程序目标 |
| --- | --- |
| `apps/mini-user` | `apps/mini-user-weapp`（Taro，已脚手架） |
| `apps/mini-merchant` | `apps/mini-merchant-weapp`（Taro，已脚手架） |

### API 调用

复用同一套契约（`openapi/openapi.yaml`）：

```ts
// 示例
const API_BASE = process.env.TARO_APP_API || 'https://api.example.com'

export async function api(path: string, opts: RequestInit & { token?: string } = {}) {
  const res = await Taro.request({
    url: API_BASE + path,
    method: (opts.method as any) || 'GET',
    data: opts.body ? JSON.parse(opts.body as string) : undefined,
    header: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
  })
  if (res.data.code !== 0) throw new Error(res.data.message)
  return res.data.data
}
```

### 页面优先级（MVP）

**消费者**

1. 登录（`wx.login` → `POST /api/auth/login` 换 code）
2. 上传票据（`chooseImage` → `POST /api/ticket/upload` multipart）
3. 审核结果轮询 `GET /api/ticket/detail/:id`
4. 开盲盒 `POST /api/blindbox/open`
5. 券包 / 积分 / 打卡（GPS：`Taro.getLocation`）

**商户**

1. 账号登录 `POST /api/merchant/login`
2. 扫码核销 `scanCode` → `POST /api/merchant/verify`

### 注意事项

- 正式环境关闭 mock 登录，接入微信 `code2session` 服务端换 openid
- 上传走 HTTPS + 合法域名白名单
- 打卡需用户授权定位；后台可配置点位半径
- H5 演示继续保留作后台联调与运营演示

### 与当前 H5 的关系

Sprint 4 **不强制**替换 H5。建议：

1. 契约稳定后开 Taro 工程  
2. 逐页迁移，接口 1:1  
3. 灰度：H5 演示 + 小程序体验版并行  

详见 `docs/14-Sprint4.md`。
