import Taro from '@tarojs/taro'

// injected by config/dev.ts or config/prod.ts
declare const TARO_APP_API: string

const BASE =
  typeof TARO_APP_API !== 'undefined' && TARO_APP_API
    ? TARO_APP_API
    : 'http://127.0.0.1:3000'

const TOKEN_KEY = 'te_access_token'

export function getToken() {
  return Taro.getStorageSync(TOKEN_KEY) || ''
}

export function setToken(token: string) {
  Taro.setStorageSync(TOKEN_KEY, token)
}

export async function api<T = unknown>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    data?: Record<string, unknown>
    auth?: boolean
  } = {},
): Promise<T> {
  const { method = 'GET', data, auth = true } = options
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (auth) {
    const token = getToken()
    if (token) header.Authorization = `Bearer ${token}`
  }

  const res = await Taro.request({
    url: `${BASE}${path}`,
    method,
    data,
    header,
  })

  const body = res.data as { code: number; message: string; data: T }
  if (body.code !== 0) {
    throw new Error(body.message || '请求失败')
  }
  return body.data
}

/** wx.login → backend JWT */
export async function loginWithWechat() {
  // 开发环境可用 demo code；真机切 WECHAT_MODE=real 后走 wx.login
  let code = 'demo'
  try {
    const wxLogin = await Taro.login()
    if (wxLogin.code) code = wxLogin.code
  } catch {
    // H5 / 开发者工具无微信能力时 fallback
  }
  const data = await api<{
    accessToken: string
    user: { id: number; nickname: string; totalPoints: number }
    provider: string
  }>('/api/auth/login', {
    method: 'POST',
    data: { code },
    auth: false,
  })
  setToken(data.accessToken)
  return data
}
