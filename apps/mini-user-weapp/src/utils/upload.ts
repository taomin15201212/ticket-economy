import Taro from '@tarojs/taro'
import { api, getToken } from './api'

declare const TARO_APP_API: string
const BASE =
  typeof TARO_APP_API !== 'undefined' && TARO_APP_API
    ? TARO_APP_API
    : 'http://127.0.0.1:3000'

/**
 * Upload ticket image:
 * 1) POST /api/ticket/presign
 * 2) If minio → PUT to presigned URL, then register with imageUrl
 * 3) If local → Taro.uploadFile to /api/ticket/upload
 */
export async function uploadTicketImage(
  filePath: string,
  ticketType = 'dining',
): Promise<{ ticketId: number; imageUrl: string; status: number }> {
  const filename = filePath.split('/').pop() || 'ticket.jpg'
  const presign = await api<{
    uploadUrl: string
    publicUrl: string
    method: 'PUT' | 'POST'
    backend: 'minio' | 'local'
    headers?: Record<string, string>
  }>('/api/ticket/presign', {
    method: 'POST',
    data: { filename, contentType: 'image/jpeg' },
  })

  if (presign.backend === 'minio' && presign.method === 'PUT') {
    // Direct PUT to MinIO (requires network permission to MinIO host)
    await new Promise<void>((resolve, reject) => {
      const fs = Taro.getFileSystemManager()
      fs.readFile({
        filePath,
        success: async (fileRes) => {
          try {
            await Taro.request({
              url: presign.uploadUrl,
              method: 'PUT',
              header: presign.headers || { 'Content-Type': 'image/jpeg' },
              data: fileRes.data,
            })
            resolve()
          } catch (e) {
            reject(e)
          }
        },
        fail: reject,
      })
    })

    return api('/api/ticket/upload', {
      method: 'POST',
      data: { ticketType, imageUrl: presign.publicUrl },
    })
  }

  // Local multipart fallback
  const token = getToken()
  const upload = await Taro.uploadFile({
    url: `${BASE}/api/ticket/upload`,
    filePath,
    name: 'image',
    formData: { ticketType },
    header: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const body = JSON.parse(upload.data) as {
    code: number
    message: string
    data: { ticketId: number; imageUrl: string; status: number }
  }
  if (body.code !== 0) throw new Error(body.message || '上传失败')
  return body.data
}
