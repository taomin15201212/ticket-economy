<template>
  <view class="card">
    <view class="title">盲盒</view>
    <view class="muted">选择已通过审核的票据开盲盒</view>
    <view v-for="t in tickets" :key="t.id" class="row">
      <text>#{{ t.id }} ¥{{ t.amount }} status={{ t.status }}</text>
      <view v-if="t.status === 3" class="btn mini" @tap="open(t.id)">开盒</view>
    </view>
    <view class="muted" style="margin-top: 12px">{{ log }}</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Taro from '@tarojs/taro'
import { api, getToken, loginWithWechat } from '../../utils/api'

const tickets = ref<{ id: number; amount?: number; status: number }[]>([])
const log = ref('')

async function load() {
  if (!getToken()) await loginWithWechat()
  const data = await api<{ list: typeof tickets.value }>('/api/ticket/list')
  tickets.value = data.list || []
}

async function open(ticketId: number) {
  try {
    const r = await api<{
      reward: { rewardName: string }
      coupon?: { couponCode: string }
    }>('/api/blindbox/open', { method: 'POST', data: { ticketId } })
    log.value = `${r.reward.rewardName} ${r.coupon?.couponCode || ''}`
    Taro.showToast({ title: r.reward.rewardName, icon: 'none' })
    await load()
  } catch (e) {
    log.value = (e as Error).message
  }
}

Taro.useReady(() => {
  void load().catch((e) => {
    log.value = (e as Error).message
  })
})
</script>

<style>
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
  font-size: 13px;
}
.btn.mini {
  padding: 6px 12px;
  font-size: 12px;
  margin: 0;
}
</style>
