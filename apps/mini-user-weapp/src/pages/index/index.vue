<template>
  <view class="page">
    <view class="hero">
      <view class="title">文旅消费券</view>
      <view class="muted">上传票据 · 盲盒 · 核销 · 积分</view>
    </view>

    <view class="card" v-if="user">
      <view>你好，{{ user.nickname }}</view>
      <view class="muted">积分 {{ user.totalPoints }} · 登录方式 {{ provider }}</view>
    </view>
    <view class="card" v-else>
      <view class="btn" @tap="onLogin">微信登录</view>
    </view>

    <view class="card">
      <view class="btn" @tap="go('/pages/ticket/index')">上传票据</view>
      <view class="btn secondary" @tap="go('/pages/blindbox/index')">开盲盒</view>
      <view class="btn secondary" @tap="go('/pages/coupons/index')">我的券包</view>
      <view class="btn secondary" @tap="go('/pages/checkin/index')">打卡</view>
      <view class="btn secondary" @tap="go('/pages/points/index')">积分商城</view>
    </view>

    <view class="card muted">{{ log }}</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Taro from '@tarojs/taro'
import { loginWithWechat, api, getToken } from '../../utils/api'

const user = ref<{ nickname: string; totalPoints: number } | null>(null)
const provider = ref('')
const log = ref('准备就绪')

async function onLogin() {
  try {
    const data = await loginWithWechat()
    user.value = data.user
    provider.value = data.provider
    log.value = `登录成功 provider=${data.provider}`
  } catch (e) {
    log.value = (e as Error).message
  }
}

async function refresh() {
  if (!getToken()) return
  try {
    const p = await api<{ totalPoints: number }>('/api/user/points')
    const profile = await api<{ nickname: string; totalPoints: number }>(
      '/api/user/profile',
    )
    user.value = {
      nickname: profile.nickname,
      totalPoints: p.totalPoints,
    }
  } catch {
    /* ignore */
  }
}

function go(url: string) {
  Taro.navigateTo({ url })
}

Taro.useReady(() => {
  void refresh()
})
</script>

<style>
.page {
  min-height: 100vh;
}
.hero {
  background: linear-gradient(135deg, #0ea5e9, #0369a1);
  color: #fff;
  padding: 28px 16px;
}
.hero .muted {
  color: rgba(255, 255, 255, 0.85);
}
</style>
