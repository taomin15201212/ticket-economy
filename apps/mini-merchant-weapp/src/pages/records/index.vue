<template>
  <view class="card">
    <view class="title">核销记录</view>
    <view v-for="r in list" :key="r.id" class="item">
      <view>{{ r.couponName || r.couponCode }}</view>
      <view class="muted">{{ r.useTime }} · {{ r.userNickname }}</view>
    </view>
    <view v-if="!list.length" class="muted">暂无记录</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Taro from '@tarojs/taro'
import { api } from '../../utils/api'

const list = ref<
  {
    id: number
    couponCode?: string
    couponName?: string
    useTime: string
    userNickname?: string
  }[]
>([])

Taro.useReady(async () => {
  try {
    const data = await api<{ list: typeof list.value }>('/api/merchant/use-records')
    list.value = data.list || []
  } catch {
    // fallback empty
  }
})
</script>

<style>
.item { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
</style>
