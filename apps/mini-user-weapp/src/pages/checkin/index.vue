<template>
  <view class="card">
    <view class="title">景点打卡</view>
    <view v-for="l in locations" :key="l.id" class="item">
      <view>{{ l.name }}</view>
      <view class="muted">半径 {{ l.radiusMeter }}m</view>
      <view class="btn mini" @tap="checkin(l)">到此一游</view>
    </view>
    <view class="muted">{{ log }}</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Taro from '@tarojs/taro'
import { api, getToken, loginWithWechat } from '../../utils/api'

const locations = ref<
  { id: number; name: string; longitude: number; latitude: number; radiusMeter: number }[]
>([])
const log = ref('')

async function load() {
  if (!getToken()) await loginWithWechat()
  locations.value = await api('/api/checkin/locations')
}

async function checkin(l: (typeof locations.value)[0]) {
  try {
    let longitude = l.longitude
    let latitude = l.latitude
    try {
      const pos = await Taro.getLocation({ type: 'gcj02' })
      longitude = pos.longitude
      latitude = pos.latitude
    } catch {
      // 开发者工具无定位时，用点位坐标演示
    }
    const r = await api<{ message: string; record: { distance: number } }>(
      '/api/checkin',
      {
        method: 'POST',
        data: { locationId: l.id, longitude, latitude },
      },
    )
    log.value = `${r.message} 距离 ${r.record.distance ?? '-'}m`
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
  padding: 8px 0;
}
</style>
