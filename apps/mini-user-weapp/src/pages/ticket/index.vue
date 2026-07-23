<template>
  <view class="card">
    <view class="title">上传消费票据</view>
    <view class="muted">选择图片后上传并提交 AI 审核</view>
    <view class="btn" @tap="chooseAndUpload">选择图片并上传</view>
    <view class="btn secondary" @tap="demoUpload">无图演示（imageUrl）</view>
    <view class="muted" style="margin-top: 12px; white-space: pre-wrap">{{ log }}</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Taro from '@tarojs/taro'
import { api, getToken, loginWithWechat } from '../../utils/api'
import { uploadTicketImage } from '../../utils/upload'

const log = ref('')

async function ensureLogin() {
  if (!getToken()) await loginWithWechat()
}

async function waitReview(ticketId: number) {
  for (let i = 0; i < 40; i += 1) {
    const d = await api<{ status: number; amount?: number }>(
      `/api/ticket/detail/${ticketId}`,
    )
    if ([3, 4, 5].includes(d.status)) return d
    await new Promise((r) => setTimeout(r, 150))
  }
  throw new Error('审核超时')
}

async function demoUpload() {
  try {
    await ensureLogin()
    const up = await api<{ ticketId: number }>('/api/ticket/upload', {
      method: 'POST',
      data: {
        ticketType: 'dining',
        imageUrl: `https://placehold.co/400x600?text=wx-${Date.now()}`,
      },
    })
    log.value = `已上传 #${up.ticketId}，提交审核…`
    await api('/api/ticket/submit', {
      method: 'POST',
      data: { ticketId: up.ticketId },
    })
    const reviewed = await waitReview(up.ticketId)
    log.value = `审核完成 status=${reviewed.status} amount=${reviewed.amount ?? '-'}`
    if (reviewed.status === 3) {
      Taro.showToast({ title: '审核通过', icon: 'success' })
    }
  } catch (e) {
    log.value = (e as Error).message
  }
}

async function chooseAndUpload() {
  try {
    await ensureLogin()
    const choose = await Taro.chooseImage({ count: 1 })
    const path = choose.tempFilePaths[0]
    log.value = `已选图，presign 上传中…`
    const up = await uploadTicketImage(path, 'dining')
    log.value = `已上传 #${up.ticketId}，提交审核…`
    await api('/api/ticket/submit', {
      method: 'POST',
      data: { ticketId: up.ticketId },
    })
    const reviewed = await waitReview(up.ticketId)
    log.value = `审核完成 status=${reviewed.status} amount=${reviewed.amount ?? '-'}`
  } catch (e) {
    log.value = (e as Error).message
  }
}
</script>
