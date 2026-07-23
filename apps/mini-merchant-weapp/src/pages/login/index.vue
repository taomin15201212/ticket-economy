<template>
  <view class="card">
    <view class="title">商户登录</view>
    <view class="muted">演示账号 merchant01 / 123456</view>
    <input class="input" v-model="username" placeholder="用户名" />
    <input class="input" v-model="password" password placeholder="密码" />
    <view class="btn" @tap="onLogin">登录</view>
    <view class="muted">{{ log }}</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Taro from '@tarojs/taro'
import { merchantLogin, getToken } from '../../utils/api'

const username = ref('merchant01')
const password = ref('123456')
const log = ref('')

async function onLogin() {
  try {
    const data = await merchantLogin(username.value, password.value)
    log.value = `登录成功 ${data.account.merchantName || ''} ${data.account.storeName || ''}`
    Taro.reLaunch({ url: '/pages/home/index' })
  } catch (e) {
    log.value = (e as Error).message
  }
}

Taro.useReady(() => {
  if (getToken()) Taro.reLaunch({ url: '/pages/home/index' })
})
</script>
