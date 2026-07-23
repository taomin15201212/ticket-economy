<template>
  <view class="card">
    <view class="title">我的消费券</view>
    <view v-for="c in list" :key="c.id" class="item">
      <view>{{ c.template?.couponName || '消费券' }}</view>
      <view class="muted">{{ c.couponCode }} · status={{ c.status }}</view>
    </view>
    <view v-if="!list.length" class="muted">暂无券</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Taro from '@tarojs/taro'
import { api, getToken, loginWithWechat } from '../../utils/api'

const list = ref<
  {
    id: number
    couponCode: string
    status: number
    template?: { couponName: string }
  }[]
>([])

Taro.useReady(async () => {
  if (!getToken()) await loginWithWechat()
  const data = await api<{ list: typeof list.value }>('/api/coupon/list')
  list.value = data.list || []
})
</script>

<style>
.item {
  padding: 10px 0;
  border-bottom: 1px dashed #e5e7eb;
}
</style>
