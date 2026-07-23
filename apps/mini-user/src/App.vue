<script setup>
import { computed, ref, watch } from 'vue';
import {
  Home,
  Ticket,
  MapPin,
  UserRound,
  Gift,
  Upload,
  Coins,
  Bell,
  ChevronLeft,
  ChevronRight,
  Copy,
  LogIn,
  RefreshCw,
  Sparkles,
  ShoppingBag,
  Trophy,
  ScrollText,
  QrCode,
  CheckCircle2,
  ArrowRight,
  Camera,
  Wallet,
  ImagePlus,
  X,
  Smartphone,
  LogOut,
  FileImage,
} from 'lucide-vue-next';

const API = import.meta.env.VITE_API_BASE || '';
const token = ref(localStorage.getItem('te_user_token') || '');
const user = ref(null);
const points = ref(null);
const tickets = ref([]);
const coupons = ref([]);
const lastReward = ref(null);
const log = ref('准备就绪。可一键演示：登录 → 上传 → 审核 → 开盲盒 → 打卡 → 兑换。');
const loading = ref(false);
const tab = ref('home');
const opening = ref(false);
const revealed = ref(false);
const uploadNote = ref('支持餐饮小票 / 高铁票 / 景区门票');
const loginCode = ref('demo');
const loginError = ref('');
const ticketType = ref('dining');
const selectedFile = ref(null);
const previewUrl = ref('');
const fileInputRef = ref(null);

const ticketTypes = [
  { value: 'dining', label: '餐饮小票' },
  { value: 'scenic', label: '景区门票' },
  { value: 'metro', label: '地铁/交通' },
  { value: 'movie', label: '电影票' },
  { value: 'didi', label: '出行订单' },
];

// check-in
const locations = ref([]);
const tasks = ref([]);
const checkinHistory = ref([]);
const selectedLocationId = ref(null);
const lastCheckin = ref(null);

// points mall
const goods = ref([]);
const pointLogs = ref([]);
const exchanges = ref([]);
const rankList = ref([]);
const pointsSub = ref('mall'); // mall | rank | ledger
const selectedCoupon = ref(null);
const couponDetail = ref(null);
const messages = ref([]);
const unreadCount = ref(0);
const homeFeed = ref({ banners: [], announcements: [], config: {} });
const bannerIndex = ref(0);

const authed = computed(() => !!token.value);
const seasonName = computed(() => homeFeed.value.config?.['activity.season_name'] || '南昌 2025 秋冬文旅消费季');
const dayIndex = computed(() => homeFeed.value.config?.['activity.day_index'] || '38');
const totalDays = computed(() => homeFeed.value.config?.['activity.total_days'] || '100');
const heroTitle = computed(() => (homeFeed.value.config?.['home.hero_title'] || '上传票根\n开出城市权益').replaceAll('\\n', '\n'));
const currentBanner = computed(() => homeFeed.value.banners?.[bannerIndex.value] || homeFeed.value.banners?.[0] || null);

const statusMap = {
  0: '待识别',
  1: 'OCR中',
  2: 'AI审核中',
  3: '已通过',
  4: '已拒绝',
  5: '人工审核',
  6: '已兑换',
};

const plays = [
  { k: '01', t: '定向抢券', d: '每日 9:00 放号', tab: 'upload' },
  { k: '02', t: '票根盲盒', d: '100% 中奖', tab: 'blindbox' },
  { k: '03', t: '景区打卡', d: '地理围栏', tab: 'checkin' },
  { k: '04', t: '积分商城', d: '一票通攒', tab: 'points' },
];

const selectedLocation = computed(
  () => locations.value.find((l) => l.id === selectedLocationId.value) || locations.value[0] || null,
);

const visitedCount = computed(() => {
  const ids = new Set(
    checkinHistory.value
      .filter((r) => r.verifyStatus === 1 && r.locationId)
      .map((r) => r.locationId),
  );
  return ids.size;
});

function append(msg) {
  log.value = `${new Date().toLocaleTimeString()}  ${msg}\n` + log.value;
}

async function api(path, { method = 'GET', body, auth = true, formData = null } = {}) {
  const headers = {
    ...(auth && token.value ? { Authorization: `Bearer ${token.value}` } : {}),
  };
  // Let browser set multipart boundary when formData is used
  if (!formData) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: formData ? formData : body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || '请求失败');
  return json.data;
}

function requireAuth(nextTab = 'home') {
  if (token.value) return true;
  loginError.value = '请先登录后再继续';
  tab.value = 'login';
  return false;
}

function clearSelectedFile() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  selectedFile.value = null;
  previewUrl.value = '';
  if (fileInputRef.value) fileInputRef.value.value = '';
}

function onPickFile(e) {
  const file = e.target?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    append('请选择图片附件（jpg/png）');
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    append('图片不能超过 8MB');
    return;
  }
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  selectedFile.value = file;
  previewUrl.value = URL.createObjectURL(file);
  uploadNote.value = `${file.name} · ${(file.size / 1024).toFixed(1)} KB`;
}

function triggerFilePick() {
  fileInputRef.value?.click();
}

/** Create a demo ticket image File for one-click flow */
async function makeDemoTicketFile() {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 960;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fffdf7';
  ctx.fillRect(0, 0, 720, 960);
  ctx.fillStyle = '#b32b1e';
  ctx.fillRect(0, 0, 720, 120);
  ctx.fillStyle = '#fff8ec';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('洪城票根 · 演示小票', 40, 75);
  ctx.fillStyle = '#1a1613';
  ctx.font = '28px sans-serif';
  ctx.fillText('商户：千百味红谷滩店', 48, 220);
  ctx.fillText(`金额：¥${(Math.random() * 80 + 20).toFixed(2)}`, 48, 280);
  ctx.fillText(`单号：DEMO${Date.now().toString().slice(-8)}`, 48, 340);
  ctx.fillText(`时间：${new Date().toLocaleString()}`, 48, 400);
  ctx.fillStyle = '#6b5f52';
  ctx.font = '22px sans-serif';
  ctx.fillText('此图由演示流程自动生成，用于联调上传附件', 48, 500);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  return new File([blob], `demo-ticket-${Date.now()}.jpg`, { type: 'image/jpeg' });
}

async function login(codeOverride) {
  loading.value = true;
  loginError.value = '';
  try {
    const code = (codeOverride ?? loginCode.value ?? 'demo').trim() || 'demo';
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: { code, deviceId: `h5-${Date.now()}` },
      auth: false,
    });
    token.value = data.accessToken;
    user.value = data.user;
    localStorage.setItem('te_user_token', token.value);
    localStorage.setItem('te_user_profile', JSON.stringify(data.user || {}));
    append(`登录成功：${data.user.nickname}`);
    await refresh();
    if (tab.value === 'login') tab.value = 'home';
  } catch (e) {
    loginError.value = e.message || '登录失败';
    append(`登录失败：${e.message}`);
  } finally {
    loading.value = false;
  }
}

function logout() {
  token.value = '';
  user.value = null;
  points.value = null;
  tickets.value = [];
  coupons.value = [];
  messages.value = [];
  unreadCount.value = 0;
  clearSelectedFile();
  localStorage.removeItem('te_user_token');
  localStorage.removeItem('te_user_profile');
  tab.value = 'login';
  append('已退出登录');
}

async function refresh() {
  if (!token.value) return;
  points.value = await api('/api/user/points');
  user.value = await api('/api/user/profile');
  tickets.value = (await api('/api/ticket/list')).list || [];
  coupons.value = (await api('/api/coupon/list')).list || [];
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function playOpenAnimation() {
  opening.value = true;
  revealed.value = false;
  await sleep(1800);
  revealed.value = true;
  await sleep(700);
  opening.value = false;
}

async function waitReview(ticketId, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ticket = await api(`/api/ticket/detail/${ticketId}`);
    if ([3, 4, 5].includes(ticket.status)) return ticket;
    await sleep(180);
  }
  throw new Error(`审核超时 ticket#${ticketId}`);
}

async function openBlindboxForTicket(ticketId) {
  tab.value = 'blindbox';
  const anim = playOpenAnimation();
  const opened = await api('/api/blindbox/open', {
    method: 'POST',
    body: { ticketId },
  });
  await anim;
  lastReward.value = opened;
  append(
    `盲盒：${opened.reward?.rewardName || '奖励'}` +
      (opened.coupon ? ` · 券码 ${opened.coupon.couponCode}` : ''),
  );
  await refresh();
  tab.value = 'coupons';
  return opened;
}

async function uploadTicketFile(file, type = ticketType.value) {
  if (!file) throw new Error('请先选择票根图片附件');
  const fd = new FormData();
  fd.append('image', file);
  fd.append('ticketType', type || 'dining');
  return api('/api/ticket/upload', { method: 'POST', formData: fd });
}

async function processTicketAfterUpload(up) {
  append(`票据已上传 #${up.ticketId}${up.storageBackend ? ` · storage=${up.storageBackend}` : ''}`);
  uploadNote.value = `票据 #${up.ticketId} 已进入审核队列`;

  const submitted = await api('/api/ticket/submit', {
    method: 'POST',
    body: { ticketId: up.ticketId },
  });
  append(
    submitted.queued
      ? `已入队审核 queue=${submitted.queueMode || 'memory'}`
      : `同步审核 status=${submitted.status}`,
  );

  const reviewed = await waitReview(up.ticketId);
  append(
    `审核完成 status=${reviewed.status} amount=${reviewed.amount ?? '-'} merchant=${reviewed.merchantName || '-'}`,
  );
  uploadNote.value = `票据 #${up.ticketId} · ${statusMap[reviewed.status] || reviewed.status}`;

  if (reviewed.status === 5) {
    append('进入人工审核，可到管理后台处理');
    await refresh();
    tab.value = 'mine';
    return null;
  }
  if (reviewed.status !== 3) {
    append(reviewed.rejectReason || '审核未通过');
    await refresh();
    tab.value = 'mine';
    return null;
  }
  return reviewed;
}

/** Upload selected attachment then review + open blindbox */
async function submitSelectedUpload({ openBox = true } = {}) {
  if (!requireAuth('upload')) return;
  if (!selectedFile.value) {
    append('请先添加票根图片附件');
    triggerFilePick();
    return;
  }
  loading.value = true;
  try {
    tab.value = 'upload';
    const up = await uploadTicketFile(selectedFile.value, ticketType.value);
    const reviewed = await processTicketAfterUpload(up);
    if (!reviewed) return;
    if (openBox) await openBlindboxForTicket(up.ticketId);
    clearSelectedFile();
  } catch (e) {
    append(`上传失败：${e.message}`);
  } finally {
    loading.value = false;
  }
}

/** One-click demo: auto-generate an image attachment and run full loop */
async function uploadAndOpen() {
  if (!requireAuth('home')) {
    // try login with demo code directly for smoother demo
    await login('demo');
    if (!token.value) return;
  }
  loading.value = true;
  try {
    tab.value = 'upload';
    const file = await makeDemoTicketFile();
    selectedFile.value = file;
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = URL.createObjectURL(file);
    uploadNote.value = `${file.name}（演示自动生成）`;
    const up = await uploadTicketFile(file, 'dining');
    const reviewed = await processTicketAfterUpload(up);
    if (!reviewed) return;
    await openBlindboxForTicket(up.ticketId);
    clearSelectedFile();
  } catch (e) {
    append(`流程失败：${e.message}`);
  } finally {
    loading.value = false;
  }
}

async function openAgain() {
  if (!tickets.value.length) {
    await uploadAndOpen();
    return;
  }
  let eligible = tickets.value.find((t) => t.status === 3);
  if (!eligible) {
    try {
      await refresh();
      eligible = tickets.value.find((t) => t.status === 3);
    } catch {
      /* ignore */
    }
  }
  if (!eligible) {
    append('暂无已通过且可开盒的票据，先上传一张');
    await uploadAndOpen();
    return;
  }
  loading.value = true;
  try {
    await openBlindboxForTicket(eligible.id);
  } catch (e) {
    append(`开盒失败：${e.message}`);
  } finally {
    loading.value = false;
  }
}

async function loadCheckin() {
  if (!requireAuth('checkin')) return;
  locations.value = (await api('/api/checkin/locations')) || [];
  tasks.value = (await api('/api/checkin/task')) || [];
  checkinHistory.value = (await api('/api/checkin/history')).list || [];
  if (!selectedLocationId.value && locations.value[0]) {
    selectedLocationId.value = locations.value[0].id;
  }
}

async function doCheckin(loc) {
  loading.value = true;
  try {
    if (!requireAuth('checkin')) return;
    const target = loc || selectedLocation.value;
    if (!target) throw new Error('暂无打卡点');
    // mock GPS near the selected fence so demo always succeeds
    const jitter = () => (Math.random() - 0.5) * 0.0008;
    const res = await api('/api/checkin', {
      method: 'POST',
      body: {
        locationId: target.id,
        longitude: target.longitude + jitter(),
        latitude: target.latitude + jitter(),
      },
    });
    lastCheckin.value = res;
    append(
      `${res.message} · ${res.location?.name || '未知点位'} · 距离 ${res.record?.distance ?? '-'}m` +
        (res.points ? ` · +${res.points.changePoints} 积分` : ''),
    );
    await refresh();
    await loadCheckin();
  } catch (e) {
    append(`打卡失败：${e.message}`);
  } finally {
    loading.value = false;
  }
}

async function loadPointsArea() {
  if (!requireAuth('points')) return;
  goods.value = (await api('/api/point/goods')).list || [];
  pointLogs.value = (await api('/api/point/list')).list || [];
  exchanges.value = (await api('/api/point/exchanges')).list || [];
  rankList.value = (await api('/api/point/rank?limit=20')) || [];
  points.value = await api('/api/user/points');
}

async function loadHomeFeed() {
  try {
    homeFeed.value = (await api('/api/activity/home', { auth: false })) || {
      banners: [],
      announcements: [],
      config: {},
    };
    if (bannerIndex.value >= (homeFeed.value.banners || []).length) bannerIndex.value = 0;
  } catch (e) {
    append(`首页投放加载失败：${e.message}`);
  }
}

function openBanner(b) {
  const link = b?.linkUrl || '';
  if (link.includes('checkin')) goTab('checkin');
  else if (link.includes('point')) goTab('points');
  else if (link.includes('upload') || link.includes('ticket')) goTab('upload');
  else if (link.includes('blind')) goTab('blindbox');
  else goTab('upload');
}

function nextBanner(dir = 1) {
  const n = homeFeed.value.banners?.length || 0;
  if (!n) return;
  bannerIndex.value = (bannerIndex.value + dir + n) % n;
}

async function loadMessages() {
  if (!requireAuth('messages')) return;
  const data = await api('/api/user/messages');
  messages.value = data.list || [];
  unreadCount.value = data.unread || 0;
}

async function markAllRead() {
  await api('/api/user/messages/read', { method: 'POST', body: { all: true } });
  await loadMessages();
  append('消息已全部标为已读');
}

async function openCouponDetail(c) {
  loading.value = true;
  try {
    if (!requireAuth('coupons')) return;
    selectedCoupon.value = c;
    couponDetail.value = await api(`/api/coupon/detail/${c.id}`);
    tab.value = 'coupon-detail';
  } catch (e) {
    append(`券详情失败：${e.message}`);
  } finally {
    loading.value = false;
  }
}

async function copyCouponCode() {
  const code = couponDetail.value?.couponCode;
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    append(`已复制券码 ${code}`);
  } catch {
    append(`券码：${code}`);
  }
}

async function exchangeGoods(item) {
  loading.value = true;
  try {
    const res = await api('/api/point/exchange', {
      method: 'POST',
      body: { goodsId: item.id },
    });
    append(`兑换成功：${res.goods?.goodsName || item.goodsName} · 余额 ${res.balance}`);
    await loadPointsArea();
    await refresh();
  } catch (e) {
    append(`兑换失败：${e.message}`);
  } finally {
    loading.value = false;
  }
}

async function goTab(next) {
  const protectedTabs = ['upload', 'blindbox', 'checkin', 'points', 'coupons', 'coupon-detail', 'messages', 'mine'];
  if (protectedTabs.includes(next) && !token.value) {
    loginError.value = '请先登录';
    tab.value = 'login';
    return;
  }
  tab.value = next;
  try {
    if (next === 'home') await loadHomeFeed();
    if (next === 'checkin') await loadCheckin();
    if (next === 'points') await loadPointsArea();
    if (next === 'messages') await loadMessages();
    if (next === 'mine' || next === 'coupons') await refresh();
  } catch (e) {
    append(e.message);
  }
}

// bootstrap: restore session or show login
if (token.value) {
  refresh().catch(() => {
    token.value = '';
    localStorage.removeItem('te_user_token');
    tab.value = 'login';
  });
  loadHomeFeed();
} else {
  tab.value = 'login';
  loadHomeFeed();
}

watch(tab, (v) => {
  if (v === 'checkin' && !locations.value.length) void loadCheckin();
  if (v === 'points' && !goods.value.length) void loadPointsArea();
});
</script>

<template>
  <!-- LOGIN -->
  <div v-if="tab === 'login' || !authed" class="shell login-shell">
    <div class="login-hero">
      <div class="brand-mark lg" aria-hidden="true">洪</div>
      <div class="eyebrow">NANCHANG TICKET · CONSUMER</div>
      <h1>洪城票根</h1>
      <p>上传票根 · 盲盒发券 · 到店核销 · 积分成长</p>
    </div>

    <div class="login-card card">
      <h2>欢迎登录</h2>
      <p class="muted" style="margin: 6px 0 14px">演示环境模拟微信 code 登录，输入 demo 即可</p>

      <label class="field-label">登录 Code</label>
      <div class="input-wrap">
        <Smartphone :size="16" />
        <input v-model="loginCode" placeholder="demo" @keyup.enter="login()" />
      </div>

      <p v-if="loginError" class="login-error">{{ loginError }}</p>

      <button class="btn btn-solid" style="width:100%; margin-top: 14px" :disabled="loading" @click="login()">
        <LogIn :size="16" />
        {{ loading ? '登录中…' : '微信登录（模拟）' }}
      </button>
      <button class="btn btn-ghost" style="width:100%; margin-top: 10px" :disabled="loading" @click="login('demo')">
        <Sparkles :size="16" />
        使用演示账号 demo
      </button>

      <div class="login-tips">
        <div class="list-row"><span class="idx">01</span><span>登录后可上传票根附件</span><span class="pt">必要</span></div>
        <div class="list-row"><span class="idx">02</span><span>审核通过即可开盲盒</span><span class="pt">权益</span></div>
        <div class="list-row"><span class="idx">03</span><span>商户端可核销卡包券码</span><span class="pt">闭环</span></div>
      </div>
    </div>
  </div>

  <div v-else class="shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">洪</div>
        <div>
          <h1>洪城票根</h1>
          <p>一张票根 · 一座城</p>
        </div>
      </div>
      <span class="pill"><span class="dot"></span>DAY {{ dayIndex }} / {{ totalDays }}</span>
    </header>

    <main class="page">
      <!-- HOME -->
      <section v-if="tab === 'home'">
        <div class="hero">
          <div class="eyebrow">{{ seasonName }}</div>
          <h2 style="white-space: pre-line">{{ heroTitle }}</h2>
          <p>智能核验 · 盲盒发券 · 景区打卡 · 积分兑换，把一次到访变成多次消费。</p>
          <div class="hero-actions">
            <button class="btn btn-primary" :disabled="loading" @click="uploadAndOpen">
              <Sparkles :size="16" :stroke-width="2.2" />
              {{ loading ? '进行中…' : '一键演示闭环' }}
            </button>
            <button class="btn btn-secondary" :disabled="loading" @click="goTab('mine')">
              <UserRound :size="16" :stroke-width="2.2" />
              {{ user?.nickname || '我的' }}
            </button>
          </div>
        </div>

        <div class="grid-2">
          <div class="tile">
            <div class="k">My Points</div>
            <div class="n">{{ points?.totalPoints ?? 0 }}</div>
            <div class="l">当前积分</div>
          </div>
          <div class="tile">
            <div class="k">Level</div>
            <div class="n">{{ points?.level ?? user?.level ?? 1 }}</div>
            <div class="l">{{ user?.nickname || '游客' }}</div>
          </div>
        </div>

        <div class="section-head">
          <h3>六大玩法</h3>
          <span>分层承接人群</span>
        </div>
        <div class="grid-2">
          <button
            v-for="p in plays"
            :key="p.k"
            class="tile play-tile"
            style="text-align: left; width: 100%"
            @click="goTab(p.tab)"
          >
            <div class="play-icon">
              <Upload v-if="p.k === '01'" :size="18" />
              <Gift v-else-if="p.k === '02'" :size="18" />
              <MapPin v-else-if="p.k === '03'" :size="18" />
              <ShoppingBag v-else :size="18" />
            </div>
            <div class="k">PLAY {{ p.k }}</div>
            <div style="margin-top: 8px; font-family: var(--font-display); font-size: 18px">{{ p.t }}</div>
            <div class="l">{{ p.d }}</div>
          </button>
        </div>

        <div class="section-head">
          <h3>今日投放</h3>
          <span @click="loadHomeFeed" style="cursor:pointer">运营配置</span>
        </div>

        <div class="banner-card" v-if="currentBanner" @click="openBanner(currentBanner)">
          <div class="banner-k">BANNER · {{ bannerIndex + 1 }}/{{ homeFeed.banners.length || 1 }}</div>
          <div class="banner-t">{{ currentBanner.title }}</div>
          <div class="banner-s">{{ currentBanner.subtitle || '点击参与' }}</div>
          <div class="banner-actions" @click.stop>
            <button class="btn btn-ghost" style="padding:6px 10px;color:#fff8ec;border-color:rgba(255,248,236,.3)" @click="nextBanner(-1)">
              <ChevronLeft :size="16" />
            </button>
            <button class="btn btn-primary" style="padding:6px 12px" @click="openBanner(currentBanner)">
              立即前往 <ArrowRight :size="15" />
            </button>
            <button class="btn btn-ghost" style="padding:6px 10px;color:#fff8ec;border-color:rgba(255,248,236,.3)" @click="nextBanner(1)">
              <ChevronRight :size="16" />
            </button>
          </div>
        </div>
        <div v-else class="card empty">暂无 Banner，可在管理后台活动中心配置</div>

        <div class="section-head" style="margin-top:18px">
          <h3>公告</h3>
          <span>{{ homeFeed.announcements?.length || 0 }} 条</span>
        </div>
        <div class="card">
          <div v-if="!(homeFeed.announcements || []).length" class="empty">暂无公告</div>
          <div v-for="a in homeFeed.announcements || []" :key="a.id" class="list-row">
            <span class="idx">公告</span>
            <span>
              <div style="font-weight:600">{{ a.title }}</div>
              <div class="muted">{{ a.content }}</div>
            </span>
            <span class="pt">NEW</span>
          </div>
        </div>
      </section>

      <!-- UPLOAD -->
      <section v-else-if="tab === 'upload'">
        <h2 class="panel-title">上传票根</h2>
        <p class="muted" style="margin: 0 0 14px">选择图片附件上传 · AI 三重校验 · 通过即可开盲盒</p>

        <div class="card" style="margin-bottom: 12px">
          <h4>票种</h4>
          <div class="type-row">
            <button
              v-for="t in ticketTypes"
              :key="t.value"
              class="type-chip"
              :class="{ on: ticketType === t.value }"
              @click="ticketType = t.value"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          capture="environment"
          class="hidden-file"
          @change="onPickFile"
        />

        <div class="upload-box" @click="triggerFilePick">
          <template v-if="!previewUrl">
            <div class="icon"><ImagePlus :size="24" :stroke-width="1.8" /></div>
            <div style="font-family: var(--font-display); font-size: 18px">添加票根附件</div>
            <p class="muted" style="margin: 6px 0 0">点击选择相册图片 / 拍照，最大 8MB</p>
          </template>
          <template v-else>
            <img :src="previewUrl" alt="票根预览" class="ticket-preview" @click.stop />
            <div class="preview-meta">
              <FileImage :size="14" />
              <span>{{ selectedFile?.name || '已选择附件' }}</span>
            </div>
          </template>
        </div>

        <div class="row" style="margin-top: 12px">
          <button class="btn btn-ghost" :disabled="loading" @click="triggerFilePick">
            <Camera :size="16" />
            {{ previewUrl ? '重新选择' : '选择附件' }}
          </button>
          <button class="btn btn-ghost" :disabled="loading || !previewUrl" @click="clearSelectedFile">
            <X :size="16" />
            清除
          </button>
        </div>

        <button
          class="btn btn-solid"
          style="width: 100%; margin-top: 12px"
          :disabled="loading || !selectedFile"
          @click="submitSelectedUpload({ openBox: true })"
        >
          <Upload :size="16" />
          {{ loading ? '上传审核中…' : '上传附件并提交审核' }}
        </button>
        <button
          class="btn btn-ghost"
          style="width: 100%; margin-top: 8px"
          :disabled="loading"
          @click="uploadAndOpen"
        >
          <Sparkles :size="16" />
          无图时：生成演示附件并跑通闭环
        </button>
        <p class="muted" style="margin-top: 8px">{{ uploadNote }}</p>

        <div class="card" style="margin-top: 12px">
          <h4>识别会提取</h4>
          <div class="list-row"><span class="idx">01</span><span>商户名称 / 票种</span><span class="pt">OCR</span></div>
          <div class="list-row"><span class="idx">02</span><span>消费金额 / 时间</span><span class="pt">字段</span></div>
          <div class="list-row"><span class="idx">03</span><span>风险分 / 去重 hash</span><span class="pt">风控</span></div>
        </div>
      </section>

      <!-- BLINDBOX -->
      <section v-else-if="tab === 'blindbox'">
        <h2 class="panel-title">票根盲盒</h2>
        <p class="muted" style="margin: 0 0 14px">上传有效票根 · 100% 中奖 · 2–3 秒开盒动效</p>

        <div class="blindbox-stage" :class="{ opening }">
          <div class="particles" aria-hidden="true">
            <span style="--dx:-30px;--dy:-50px"></span>
            <span style="--dx:24px;--dy:-42px"></span>
            <span style="--dx:8px;--dy:-70px"></span>
            <span style="--dx:-18px;--dy:-20px"></span>
            <span style="--dx:36px;--dy:-28px"></span>
            <span style="--dx:-40px;--dy:-36px"></span>
          </div>

          <div v-if="!revealed" class="box" :class="{ shake: opening && !revealed }">洪</div>

          <div v-if="revealed && lastReward" class="reward-card">
            <div class="tag">CONGRATS · 恭喜获得</div>
            <div class="name">{{ lastReward.reward?.rewardName || '城市消费券' }}</div>
            <p class="muted" style="margin: 10px 0 0" v-if="lastReward.coupon">
              券码 {{ lastReward.coupon.couponCode }}
            </p>
          </div>
          <div v-else-if="revealed" class="reward-card">
            <div class="tag">READY</div>
            <div class="name">准备开出权益</div>
          </div>
        </div>

        <div class="row" style="margin-top: 14px">
          <button class="btn btn-gold" :disabled="loading" @click="openAgain">
            <Gift :size="16" />
            {{ loading ? '开盒中…' : '开盲盒' }}
          </button>
          <button class="btn btn-ghost" @click="goTab('coupons')">
            <Wallet :size="16" />
            查看卡包
          </button>
        </div>

        <div class="card" v-if="lastReward">
          <h4>最近开奖</h4>
          <div class="coupon" style="margin-top: 8px">
            <div class="amt gold"><div class="big">奖</div></div>
            <div>
              <div class="n">{{ lastReward.reward?.rewardName || '奖励' }}</div>
              <div class="m" v-if="lastReward.coupon">
                {{ lastReward.coupon.couponCode }} · 至 {{ lastReward.coupon.expireTime || '有效期内' }}
              </div>
            </div>
            <div class="go">卡包</div>
          </div>
        </div>
      </section>

      <!-- CHECKIN -->
      <section v-else-if="tab === 'checkin'">
        <h2 class="panel-title">A 级景区集章</h2>
        <p class="muted" style="margin: 0 0 14px">地理围栏打卡 · 无需上传照片 · 天然规避 P 图</p>

        <div class="checkin-map">
          <span class="lbl">
            {{ selectedLocation?.name || '选择点位' }} · 围栏 {{ selectedLocation?.radiusMeter || 0 }}m
          </span>
          <div class="fence"></div>
          <div class="me"></div>
        </div>

        <div class="steps">
          <div class="step" :class="{ done: visitedCount >= 1 }"><div class="n">1</div><div class="l">冰箱贴</div></div>
          <div class="step" :class="{ done: visitedCount >= 2 }"><div class="n">2</div><div class="l">味道券</div></div>
          <div class="step" :class="{ done: visitedCount >= 3 }"><div class="n">3</div><div class="l">集章礼</div></div>
          <div class="step" :class="{ done: visitedCount >= 3 }"><div class="n">★</div><div class="l">三地达成</div></div>
        </div>

        <div class="card">
          <h4>附近点位</h4>
          <div
            v-for="loc in locations"
            :key="loc.id"
            class="list-row"
            style="cursor: pointer"
            @click="selectedLocationId = loc.id"
          >
            <span class="idx">{{ String(loc.id).padStart(2, '0') }}</span>
            <span>
              {{ loc.name }}
              <span class="muted"> · {{ loc.address || '南昌' }}</span>
            </span>
            <span class="pt">{{ loc.radiusMeter }}m</span>
          </div>
          <div v-if="!locations.length" class="empty">加载打卡点…</div>
          <button class="btn btn-solid" style="width: 100%; margin-top: 12px" :disabled="loading" @click="doCheckin()">
            <MapPin :size="16" />
            {{ loading ? '打卡中…' : `在此打卡 · ${selectedLocation?.name || ''}` }}
          </button>
        </div>

        <div class="card" v-if="lastCheckin">
          <h4>最近打卡</h4>
          <div class="muted" style="margin-top: 4px">
            {{ lastCheckin.message }} · 距离 {{ lastCheckin.record?.distance ?? '-' }}m
            <template v-if="lastCheckin.points"> · +{{ lastCheckin.points.changePoints }} 分</template>
          </div>
        </div>

        <div class="section-head"><h3>打卡记录</h3><span>{{ checkinHistory.length }} 条</span></div>
        <div class="card">
          <div v-if="!checkinHistory.length" class="empty">还没有打卡记录</div>
          <div v-for="r in checkinHistory" :key="r.id" class="list-row">
            <span class="idx">#{{ r.id }}</span>
            <span>
              {{ locations.find((l) => l.id === r.locationId)?.name || '自由打卡' }}
              <span class="muted"> · {{ r.distance ?? '-' }}m</span>
            </span>
            <span class="status-chip" :class="r.verifyStatus === 1 ? 'ok' : 'warn'">
              {{ r.verifyStatus === 1 ? '已通过' : '待抽检' }}
            </span>
          </div>
        </div>
      </section>

      <!-- POINTS -->
      <section v-else-if="tab === 'points'">
        <h2 class="panel-title">一票通攒</h2>
        <p class="muted" style="margin: 0 0 14px">积分商城 · 排行榜 · 流水</p>

        <div class="rank-me">
          <div class="k">MY POINTS · 我的积分</div>
          <div class="n">{{ points?.totalPoints ?? 0 }}<span style="font-size: 14px; opacity: .8; margin-left: 4px">分</span></div>
          <div style="margin-top: 6px; font-size: 12px; opacity: .85">上传 / 打卡 / 核销均可攒分</div>
        </div>

        <div class="subtabs" style="margin-top: 14px">
          <button class="subtab" :class="{ active: pointsSub === 'mall' }" @click="pointsSub = 'mall'"><ShoppingBag :size="14" /> 商城</button>
          <button class="subtab" :class="{ active: pointsSub === 'rank' }" @click="pointsSub = 'rank'"><Trophy :size="14" /> 排行</button>
          <button class="subtab" :class="{ active: pointsSub === 'ledger' }" @click="pointsSub = 'ledger'"><ScrollText :size="14" /> 流水</button>
        </div>

        <div v-if="pointsSub === 'mall'" class="stack">
          <div v-for="g in goods" :key="g.id" class="goods">
            <div class="thumb">礼</div>
            <div>
              <div class="n">{{ g.goodsName }}</div>
              <div class="m">{{ g.description || '积分兑换' }} · 库存 {{ g.stock }}</div>
            </div>
            <div>
              <div class="price">{{ g.needPoints }}<small>积分</small></div>
              <button
                class="btn btn-solid"
                style="padding: 6px 10px; margin-top: 6px; width: auto"
                :disabled="loading || (points?.totalPoints ?? 0) < g.needPoints || g.stock <= 0"
                @click="exchangeGoods(g)"
              >
                兑换
              </button>
            </div>
          </div>
          <div v-if="!goods.length" class="card empty">暂无商品</div>

          <div class="section-head"><h3>兑换记录</h3></div>
          <div class="card">
            <div v-if="!exchanges.length" class="empty">还没有兑换</div>
            <div v-for="e in exchanges" :key="e.id" class="list-row">
              <span class="idx">#{{ e.id }}</span>
              <span>{{ e.goods?.goodsName || `商品#${e.goodsId}` }}</span>
              <span class="pt">-{{ e.needPoints }}</span>
            </div>
          </div>
        </div>

        <div v-else-if="pointsSub === 'rank'" class="card">
          <h4>当前排行榜 · TOP</h4>
          <div v-for="r in rankList" :key="r.userId" class="list-row">
            <span class="idx" :class="{ gold: r.rank <= 3 }">{{ String(r.rank).padStart(2, '0') }}</span>
            <span>{{ r.nickname }}</span>
            <span class="pt">{{ r.totalPoints }} 分</span>
          </div>
          <div v-if="!rankList.length" class="empty">暂无榜单</div>
        </div>

        <div v-else class="card">
          <h4>积分流水</h4>
          <div v-for="l in pointLogs" :key="l.id" class="list-row">
            <span class="idx">{{ l.changeType }}</span>
            <span>{{ l.remark || l.changeType }}</span>
            <span class="pt" :style="{ color: l.changePoints >= 0 ? 'var(--status-ok)' : 'var(--accent)' }">
              {{ l.changePoints >= 0 ? '+' : '' }}{{ l.changePoints }}
            </span>
          </div>
          <div v-if="!pointLogs.length" class="empty">暂无流水</div>
        </div>
      </section>

      <!-- COUPONS -->
      <section v-else-if="tab === 'coupons'">
        <h2 class="panel-title">我的卡包</h2>
        <p class="muted" style="margin: 0 0 14px">未使用 / 已使用 / 已过期 · 点击查看详情与核销码</p>

        <div v-if="!coupons.length" class="card empty">暂无消费券。上传票根开盲盒即可入账。</div>
        <div v-else class="stack">
          <button
            v-for="c in coupons"
            :key="c.id"
            class="coupon"
            style="width:100%; text-align:left; cursor:pointer"
            @click="openCouponDetail(c)"
          >
            <div class="amt" :class="{ gold: c.status === 1 }">
              <div class="big">券</div>
              <div class="sm">COUPON</div>
            </div>
            <div>
              <div class="n">{{ c.template?.couponName || '消费券' }}</div>
              <div class="m">{{ c.couponCode }} · status={{ c.status }}</div>
            </div>
            <span class="status-chip" :class="c.status === 1 ? 'ok' : ''">
              {{ c.status === 1 ? '可使用' : c.status === 3 ? '已核销' : '查看' }}
            </span>
          </button>
        </div>
      </section>

      <!-- COUPON DETAIL -->
      <section v-else-if="tab === 'coupon-detail'">
        <button class="btn btn-ghost" style="margin-bottom: 10px" @click="tab = 'coupons'">
          <ChevronLeft :size="16" />
          返回卡包
        </button>
        <h2 class="panel-title">卡券详情</h2>
        <p class="muted" style="margin: 0 0 14px">到店出示券码 · 商户扫码/手工核销</p>

        <div class="card" v-if="couponDetail">
          <div class="code-card">
            <div class="eyebrow" style="opacity:.8">COUPON CODE</div>
            <div class="code">{{ couponDetail.couponCode }}</div>
            <div class="muted" style="margin-top:8px">
              {{ couponDetail.template?.couponName || '消费券' }}
              ·
              <span class="status-chip" :class="couponDetail.status === 1 ? 'ok' : couponDetail.status === 3 ? '' : 'warn'">
                {{ couponDetail.status === 1 ? '可使用' : couponDetail.status === 3 ? '已核销' : couponDetail.status === 2 ? '已锁定' : '查看' }}
              </span>
            </div>
          </div>

          <div style="margin-top: 14px" class="stack">
            <div class="list-row"><span class="idx">规则</span><span>{{ couponDetail.template?.discountDesc || '详见门店规则' }}</span><span class="pt">{{ couponDetail.template?.couponType || '-' }}</span></div>
            <div class="list-row"><span class="idx">面额</span><span>{{ couponDetail.template?.amount ?? '-' }}</span><span class="pt">元</span></div>
            <div class="list-row"><span class="idx">领取</span><span>{{ (couponDetail.receiveTime || '').replace('T',' ').slice(0,19) || '-' }}</span><span class="pt">source</span></div>
            <div class="list-row"><span class="idx">有效期</span><span>{{ (couponDetail.expireTime || '').replace('T',' ').slice(0,19) || '-' }}</span><span class="pt">expire</span></div>
            <div class="list-row" v-if="couponDetail.useTime"><span class="idx">核销</span><span>{{ couponDetail.useTime.replace('T',' ').slice(0,19) }}</span><span class="pt">used</span></div>
          </div>

          <div class="row" style="margin-top: 14px">
            <button class="btn btn-solid" @click="copyCouponCode">
              <Copy :size="15" />
              复制券码
            </button>
            <button class="btn btn-ghost" @click="goTab('points')">
              <Coins :size="15" />
              去攒积分
            </button>
          </div>
        </div>
        <div v-else class="card empty">加载中…</div>
      </section>

      <!-- MESSAGES -->
      <section v-else-if="tab === 'messages'">
        <div class="row" style="justify-content: space-between; align-items: center; margin-bottom: 8px">
          <div>
            <h2 class="panel-title" style="margin:0">消息中心</h2>
            <p class="muted" style="margin: 6px 0 0">审核 / 发券 / 积分 / 系统通知</p>
          </div>
          <button class="btn btn-ghost" style="padding:8px 12px" :disabled="!unreadCount" @click="markAllRead">
            <CheckCircle2 :size="15" />
            全部已读
          </button>
        </div>

        <div class="card">
          <div v-if="!messages.length" class="empty">暂无消息。完成上传/开盒/核销后会收到通知。</div>
          <div v-for="m in messages" :key="m.id" class="msg-item" :class="{ unread: m.read === 0 }">
            <div class="msg-top">
              <strong>{{ m.title }}</strong>
              <span class="status-chip" :class="m.read === 0 ? 'warn' : 'ok'">{{ m.category }}</span>
            </div>
            <div class="muted" style="margin-top:4px">{{ m.content }}</div>
            <div class="msg-time">{{ (m.createdAt || '').replace('T', ' ').slice(0, 19) }}</div>
          </div>
        </div>
      </section>

      <!-- MINE -->
      <section v-else>
        <h2 class="panel-title">我的</h2>
        <p class="muted" style="margin: 0 0 14px">票据、卡包、积分、打卡与演示日志</p>

        <div class="card">
          <div class="row" style="justify-content: space-between">
            <div>
              <div style="font-family: var(--font-display); font-size: 20px">
                {{ user?.nickname || '未登录游客' }}
              </div>
              <div class="muted">演示账号 code=demo</div>
            </div>
            <button class="btn btn-ghost" :disabled="loading" @click="authed ? logout() : goTab('login')">
              <component :is="authed ? LogOut : LogIn" :size="15" />
              {{ authed ? '退出登录' : '去登录' }}
            </button>
          </div>
          <div class="grid-2" style="margin-top: 12px">
            <button class="tile" style="text-align: left" @click="goTab('points')">
              <div class="k">Points</div>
              <div class="n">{{ points?.totalPoints ?? 0 }}</div>
              <div class="l">积分商城</div>
            </button>
            <button class="tile" style="text-align: left" @click="goTab('coupons')">
              <div class="k">Coupons</div>
              <div class="n">{{ coupons.length }}</div>
              <div class="l">我的卡包</div>
            </button>
            <button class="tile" style="text-align: left" @click="goTab('checkin')">
              <div class="k">Checkin</div>
              <div class="n">{{ checkinHistory.length }}</div>
              <div class="l">打卡集章</div>
            </button>
            <button class="tile" style="text-align: left" @click="goTab('upload')">
              <div class="k">Tickets</div>
              <div class="n">{{ tickets.length }}</div>
              <div class="l">上传票根</div>
            </button>
          </div>
        </div>

        <div class="card">
          <h4>快捷入口</h4>
          <div class="list-row link-row" @click="goTab('blindbox')"><span class="idx"><Gift :size="15" /></span><span>票根盲盒</span><span class="pt">开奖</span></div>
          <div class="list-row link-row" @click="goTab('points'); pointsSub = 'rank'"><span class="idx"><Trophy :size="15" /></span><span>积分排行榜</span><span class="pt">TOP</span></div>
          <div class="list-row link-row" @click="goTab('points'); pointsSub = 'ledger'"><span class="idx"><ScrollText :size="15" /></span><span>积分流水</span><span class="pt">明细</span></div>
          <div class="list-row link-row" @click="uploadAndOpen"><span class="idx"><Sparkles :size="15" /></span><span>一键演示闭环</span><span class="pt">GO</span></div>
          <div class="list-row link-row" @click="goTab('messages')"><span class="idx"><Bell :size="15" /></span><span>消息中心</span><span class="pt">{{ unreadCount || '通知' }}</span></div>
        </div>

        <div class="section-head">
          <h3>票据记录</h3>
          <button class="btn btn-ghost" style="padding: 6px 10px" :disabled="loading || !authed" @click="refresh">
            刷新
          </button>
        </div>
        <div class="card">
          <div v-if="!tickets.length" class="empty">暂无票据</div>
          <div v-for="t in tickets" :key="t.id" class="list-row">
            <span class="idx">#{{ t.id }}</span>
            <span>{{ t.merchantName || t.ticketType }} · ¥{{ t.amount ?? '-' }}</span>
            <span class="status-chip" :class="t.status === 3 || t.status === 6 ? 'ok' : t.status === 5 ? 'warn' : ''">
              {{ statusMap[t.status] ?? t.status }}
            </span>
          </div>
        </div>

        <div class="section-head"><h3>运行日志</h3></div>
        <div class="log">{{ log }}</div>
      </section>
    </main>

    <nav class="tabbar" aria-label="主导航">
      <button class="tab" :class="{ active: tab === 'home' }" @click="goTab('home')">
        <Home :size="20" :stroke-width="tab === 'home' ? 2.4 : 1.8" />
        <strong>首页</strong>
      </button>
      <button class="tab" :class="{ active: tab === 'upload' || tab === 'blindbox' }" @click="goTab('upload')">
        <Ticket :size="20" :stroke-width="(tab === 'upload' || tab === 'blindbox') ? 2.4 : 1.8" />
        <strong>票根</strong>
      </button>
      <button class="tab" :class="{ active: tab === 'checkin' }" @click="goTab('checkin')">
        <MapPin :size="20" :stroke-width="tab === 'checkin' ? 2.4 : 1.8" />
        <strong>打卡</strong>
      </button>
      <button
        class="tab"
        :class="{ active: tab === 'points' || tab === 'coupons' || tab === 'coupon-detail' || tab === 'messages' || tab === 'mine' }"
        @click="goTab('mine')"
      >
        <UserRound :size="20" :stroke-width="(['points','coupons','coupon-detail','messages','mine'].includes(tab)) ? 2.4 : 1.8" />
        <strong>我的</strong>
        <i v-if="unreadCount" class="tab-dot" />
      </button>
    </nav>
  </div>
</template>
