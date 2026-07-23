<template>
  <view class="card">
    <view class="title">积分商城</view>
    <view class="muted">当前积分 {{ points }}</view>
    <view v-for="g in goods" :key="g.id" class="item">
      <view>{{ g.goodsName }} · {{ g.needPoints }} 分 · 库存 {{ g.stock }}</view>
      <view class="btn mini" @tap="exchange(g.id)">兑换</view>
    </view>
    <view class="muted">{{ log }}</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Taro from '@tarojs/taro'
import { api, getToken, loginWithWechat } from '../../utils/api'

const goods = ref<
  { id: number; goodsName: string; needPoints: number; stock: number }[]
>([])
const points = ref(0)
const log = ref('')

async function load() {
  if (!getToken()) await loginWithWechat()
  const p = await api<{ totalPoints: number }>('/api/user/points')
  points.value = p.totalPoints
  const g = await api<{ list: typeof goods.value }>('/api/point/goods')
  goods.value = g.list || []
}

async function exchange(goodsId: number) {
  try {
    const r = await api<{ goods: { goodsName: string }; balance: number }>(
      '/api/point/exchange',
      { method: 'POST', data: { goodsId } },
    )
    log.value = `已兑换 ${r.goods.goodsName}，余额 ${r.balance}`
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
.item {
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
}
.btn.mini {
  margin-top: 6px;
}
</style>
