<template>
  <view class="card">
    <view class="title">{{ profile?.merchantName }} · {{ profile?.storeName }}</view>
    <view class="muted">今日核销 {{ stats?.todayVerify ?? 0 }} · 累计 {{ stats?.totalVerify ?? 0 }}</view>
    <view class="btn" @tap="go('/pages/verify/index')">扫码 / 输码核销</view>
    <view class="btn secondary" @tap="go('/pages/records/index')">核销记录</view>
    <view class="btn secondary" @tap="refresh">刷新</view>
    <view class="btn secondary" @tap="logout">退出</view>
    <view class="muted">{{ log }}</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Taro from '@tarojs/taro'
import { api, clearToken, getToken } from '../../utils/api'

const profile = ref<{ merchantName?: string; storeName?: string } | null>(null)
const stats = ref<{ todayVerify: number; totalVerify: number } | null>(null)
const log = ref('')

async function refresh() {
  try {
    if (!getToken()) {
      Taro.reLaunch({ url: '/pages/login/index' })
      return
    }
    const data = await api<{
      merchant: { merchantName?: string; storeName?: string }
      stats: { todayVerify: number; totalVerify: number }
    }>('/api/merchant/profile')
    profile.value = data.merchant
    stats.value = data.stats
  } catch (e) {
    log.value = (e as Error).message
  }
}

function go(url: string) {
  Taro.navigateTo({ url })
}

function logout() {
  clearToken()
  Taro.reLaunch({ url: '/pages/login/index' })
}

Taro.useReady(() => {
  void refresh()
})
</script>
