<template>
  <view class="card">
    <view class="title">核销消费券</view>
    <input class="input" v-model="code" placeholder="券码" />
    <view class="btn" @tap="scan">扫一扫</view>
    <view class="btn" @tap="verify">确认核销</view>
    <view class="muted">{{ log }}</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Taro from '@tarojs/taro'
import { api } from '../../utils/api'

const code = ref('')
const log = ref('')

async function scan() {
  try {
    const r = await Taro.scanCode({ onlyFromCamera: false })
    code.value = r.result || ''
  } catch (e) {
    log.value = (e as Error).message || '扫码取消'
  }
}

async function verify() {
  try {
    const r = await api<{ record?: { id: number }; coupon?: { id: number } }>(
      '/api/merchant/verify',
      {
        method: 'POST',
        data: {
          couponCode: code.value.trim(),
          verifyType: 'scan',
          requestId: `m-${Date.now()}`,
        },
      },
    )
    log.value = `核销成功 record#${r.record?.id ?? '-'}`
    code.value = ''
    Taro.showToast({ title: '核销成功', icon: 'success' })
  } catch (e) {
    log.value = (e as Error).message
  }
}
</script>
