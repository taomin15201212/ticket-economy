import Taro from '@tarojs/taro'

declare const TARO_APP_API: string
const BASE =
  typeof TARO_APP_API !== 'undefined' && TARO_APP_API
    ? TARO_APP_API
    : 'http://127.0.0.1:3000'

const TOKEN_KEY = 'te_merchant_token'

export function getToken() {
  return Taro.getStorageSync(TOKEN_KEY) || ''
}
export function setToken(token: string) {
  Taro.setStorageSync(TOKEN_KEY, token)
}
export function clearToken() {
  Taro.removeStorageSync(TOKEN_KEY)
}

export async function api<T = unknown>(
  path: string,
  options: {
    method?: 'GET' | 'POST'
    data?: Record<string, unknown>
    auth?: boolean
  } = {},
): Promise<T> {
  const { method = 'GET', data, auth = true } = options
  const header: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) header.Authorization = `Bearer ${token}`
  }
  const res = await Taro.request({ url: `${BASE}${path}`, method, data, header })
  const body = res.data as { code: number; message: string; data: T }
  if (body.code !== 0) throw new Error(body.message || '请求失败')
  return body.data
}

export async function merchantLogin(username: string, password: string) {
  const data = await api<{
    accessToken: string
    account: {
      storeName?: string
      merchantName?: string
      merchantId: number
    }
  }>('/api/merchant/login', {
    method: 'POST',
    data: { username, password },
    auth: false,
  })
  setToken(data.accessToken)
  return data
}
