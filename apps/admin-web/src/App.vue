<script setup>
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  ClipboardCheck,
  Megaphone,
  Ticket,
  Gift,
  Store,
  Settings,
  ShoppingBag,
  RefreshCw,
  LogOut,
  Search,
  Plus,
  Save,
  Ban,
  CircleCheck,
} from 'lucide-vue-next';

const API = import.meta.env.VITE_API_BASE || '';
const token = ref(localStorage.getItem('te_admin_token') || '');
const username = ref('admin');
const password = ref('admin123');
const dashboard = ref(null);
const tickets = ref([]);
const templates = ref([]);
const blindboxes = ref([]);
const goods = ref([]);
const merchants = ref([]);
const merchantStatus = ref('');
const users = ref([]);
const userStatus = ref('');
const userKeyword = ref('');
const banners = ref([]);
const announcements = ref([]);
const configs = ref([]);
const newBanner = ref({ title: '', subtitle: '', linkUrl: '/upload', sortNo: 1 });
const newAnnouncement = ref({ title: '', content: '' });
const riskOverview = ref(null);
const riskBlacklist = ref([]);
const riskStrategies = ref([]);
const riskEvents = ref([]);
const riskSignals = ref([]);
const newRisk = ref({ targetType: 'user', targetValue: '', reason: '' });
const sysRoles = ref([]);
const sysPermissions = ref([]);
const systemOverview = ref(null);
const statusFilter = ref('');
const loading = ref(false);
const nav = ref('review');
const selectedTicket = ref(null);
const autoRefresh = ref(true);
let reviewTimer = null;


const statusMap = {
  0: '待识别',
  1: 'OCR中',
  2: 'AI审核中',
  3: '已通过',
  4: '已拒绝',
  5: '人工审核',
  6: '已兑换',
};

const kpis = computed(() => {
  const d = dashboard.value || {};
  return [
    ['用户', d.users ?? 0],
    ['商户', d.merchants ?? 0],
    ['票据', d.tickets ?? 0],
    ['待人工', d.pendingManual ?? 0],
    ['已发券', d.couponsIssued ?? 0],
    ['已核销', d.couponsUsed ?? 0],
  ];
});

const newGoods = ref({
  goodsName: '',
  needPoints: 50,
  stock: 100,
  description: '',
});

const newCoupon = ref({
  couponName: '',
  couponType: 'merchant',
  amount: 20,
  discountDesc: '满100减20',
  totalCount: 1000,
  validDays: 30,
});

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && token.value ? { Authorization: `Bearer ${token.value}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || '请求失败');
  return json.data;
}

async function login() {
  try {
    const data = await api('/api/auth/admin/login', {
      method: 'POST',
      body: { username: username.value, password: password.value },
      auth: false,
    });
    token.value = data.accessToken;
    localStorage.setItem('te_admin_token', token.value);
    ElMessage.success('登录成功');
    await loadAll();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

function startReviewPolling() {
  if (reviewTimer) clearInterval(reviewTimer);
  reviewTimer = setInterval(() => {
    if (token.value && nav.value === 'review' && autoRefresh.value) {
      loadAll();
    }
  }, 4000);
}

async function loadAll() {
  if (!token.value) return;
  loading.value = true;
  try {
    dashboard.value = await api('/api/admin/dashboard');
    const q = statusFilter.value === '' ? '' : `?status=${statusFilter.value}`;
    tickets.value = (await api(`/api/admin/ticket/list${q}`)).list || [];
    if (nav.value === 'coupons' || nav.value === 'blindbox' || nav.value === 'dashboard' || nav.value === 'goods') {
      await loadConfig();
    }
  } catch (e) {
    ElMessage.error(e.message);
  } finally {
    loading.value = false;
  }
}

async function loadConfig() {
  templates.value = (await api('/api/admin/coupon/templates')) || [];
  blindboxes.value = (await api('/api/admin/blindbox/list')) || [];
  goods.value = (await api('/api/admin/point/goods')) || [];
}

async function loadSystem() {
  systemOverview.value = await api('/api/admin/system/overview');
  sysRoles.value = (await api('/api/admin/system/roles')) || [];
  sysPermissions.value = (await api('/api/admin/system/permissions')) || [];
}

async function loadRisk() {
  riskOverview.value = await api('/api/admin/risk/overview');
  riskBlacklist.value = (await api('/api/admin/risk/blacklist')) || [];
  riskStrategies.value = (await api('/api/admin/risk/strategies')) || [];
  riskEvents.value = (await api('/api/admin/risk/events?limit=50')) || [];
  riskSignals.value = (await api('/api/admin/risk/ticket-signals?limit=30')) || [];
}

async function loadActivity() {
  banners.value = (await api('/api/admin/banners')) || [];
  announcements.value = (await api('/api/admin/announcements')) || [];
  configs.value = (await api('/api/admin/configs')) || [];
}

async function loadUsers() {
  const qs = new URLSearchParams();
  if (userStatus.value !== '') qs.set('status', userStatus.value);
  if (userKeyword.value) qs.set('keyword', userKeyword.value);
  const q = qs.toString() ? `?${qs.toString()}` : '';
  const data = await api(`/api/admin/users${q}`);
  users.value = data.list || [];
}

async function loadMerchants() {
  const q = merchantStatus.value === '' ? '' : `?status=${merchantStatus.value}`;
  const data = await api(`/api/admin/merchants${q}`);
  merchants.value = data.list || data || [];
}

async function switchNav(next) {
  nav.value = next;
  try {
    if (['coupons', 'blindbox', 'dashboard', 'goods'].includes(next)) {
      await loadConfig();
    }
    if (next === 'merchants') {
      await loadMerchants();
    }
    if (next === 'users') {
      await loadUsers();
    }
    if (next === 'activity') {
      await loadActivity();
    }
    if (next === 'risk') {
      await loadRisk();
    }
    if (next === 'system') {
      await loadSystem();
    }
  } catch (e) {
    ElMessage.error(e.message);
  }
}

function openTicket(row) {
  selectedTicket.value = row;
}

async function requeueOcr(row) {
  try {
    const data = await api(`/api/admin/ticket/${row.id}/requeue-ocr`, { method: 'POST' });
    ElMessage.success(data.message || '已重投 OCR');
    await loadAll();
    // keep selection refreshed
    const latest = tickets.value.find((t) => t.id === row.id);
    if (latest) selectedTicket.value = latest;
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function review(row, action) {
  try {
    await api('/api/admin/ticket/review', {
      method: 'POST',
      body: {
        ticketId: row.id,
        action,
        reason: action === 'reject' ? '人工拒绝' : undefined,
      },
    });
    ElMessage.success(action === 'approve' ? '已通过' : '已拒绝');
    await loadAll();
    if (selectedTicket.value?.id === row.id) {
      selectedTicket.value = tickets.value.find((t) => t.id === row.id) || null;
    }
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function createCoupon() {
  try {
    if (!newCoupon.value.couponName) {
      ElMessage.warning('请填写券名称');
      return;
    }
    await api('/api/admin/coupon/templates', {
      method: 'POST',
      body: {
        ...newCoupon.value,
        amount: Number(newCoupon.value.amount),
        totalCount: Number(newCoupon.value.totalCount),
        validDays: Number(newCoupon.value.validDays),
      },
    });
    ElMessage.success('券模板已创建');
    newCoupon.value.couponName = '';
    await loadConfig();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function toggleTemplate(row) {
  try {
    await api(`/api/admin/coupon/templates/${row.id}`, {
      method: 'PUT',
      body: { status: row.status === 1 ? 0 : 1 },
    });
    ElMessage.success(row.status === 1 ? '已停用' : '已启用');
    await loadConfig();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function saveReward(reward) {
  try {
    await api(`/api/admin/blindbox/rewards/${reward.id}`, {
      method: 'PUT',
      body: {
        weight: Number(reward.weight),
        remainStock: Number(reward.remainStock),
        stock: Number(reward.stock),
        status: Number(reward.status),
      },
    });
    ElMessage.success(`奖品「${reward.rewardName}」已保存`);
    await loadConfig();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function addRiskBlacklist() {
  try {
    if (!newRisk.value.targetValue) return ElMessage.warning('填写拉黑对象');
    await api('/api/admin/risk/blacklist', {
      method: 'POST',
      body: { ...newRisk.value },
    });
    ElMessage.success('已加入风控黑名单');
    newRisk.value.targetValue = '';
    newRisk.value.reason = '';
    await loadRisk();
    dashboard.value = await api('/api/admin/dashboard');
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function toggleRiskBlacklist(row) {
  try {
    await api(`/api/admin/risk/blacklist/${row.id}`, {
      method: 'PUT',
      body: { status: row.status === 1 ? 0 : 1 },
    });
    ElMessage.success(row.status === 1 ? '已停用' : '已启用');
    await loadRisk();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function saveStrategy(row) {
  try {
    await api(`/api/admin/risk/strategies/${row.id}`, {
      method: 'PUT',
      body: {
        strategyName: row.strategyName,
        threshold: row.threshold === '' || row.threshold == null ? null : Number(row.threshold),
        action: row.action,
        enabled: Number(row.enabled),
        remark: row.remark,
      },
    });
    ElMessage.success(`策略 ${row.strategyCode} 已保存`);
    await loadRisk();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function createBanner() {
  try {
    if (!newBanner.value.title) return ElMessage.warning('填写 Banner 标题');
    await api('/api/admin/banners', {
      method: 'POST',
      body: {
        title: newBanner.value.title,
        subtitle: newBanner.value.subtitle || null,
        linkUrl: newBanner.value.linkUrl || null,
        sortNo: Number(newBanner.value.sortNo || 1),
      },
    });
    ElMessage.success('Banner 已创建');
    newBanner.value.title = '';
    newBanner.value.subtitle = '';
    await loadActivity();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function saveBanner(row) {
  try {
    await api(`/api/admin/banners/${row.id}`, {
      method: 'PUT',
      body: {
        title: row.title,
        subtitle: row.subtitle,
        linkUrl: row.linkUrl,
        sortNo: Number(row.sortNo),
        status: Number(row.status),
      },
    });
    ElMessage.success('Banner 已保存');
    await loadActivity();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function toggleBanner(row) {
  try {
    await api(`/api/admin/banners/${row.id}`, {
      method: 'PUT',
      body: { status: row.status === 1 ? 0 : 1 },
    });
    ElMessage.success(row.status === 1 ? '已下线' : '已上线');
    await loadActivity();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function createAnnouncement() {
  try {
    if (!newAnnouncement.value.title || !newAnnouncement.value.content) {
      return ElMessage.warning('填写公告标题和内容');
    }
    await api('/api/admin/announcements', {
      method: 'POST',
      body: { ...newAnnouncement.value },
    });
    ElMessage.success('公告已发布');
    newAnnouncement.value = { title: '', content: '' };
    await loadActivity();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function toggleAnnouncement(row) {
  try {
    await api(`/api/admin/announcements/${row.id}`, {
      method: 'PUT',
      body: { status: row.status === 1 ? 0 : 1 },
    });
    ElMessage.success(row.status === 1 ? '公告已下线' : '公告已上线');
    await loadActivity();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function saveConfig(row) {
  try {
    await api(`/api/admin/configs/${encodeURIComponent(row.configKey)}`, {
      method: 'PUT',
      body: { value: row.configValue, remark: row.remark },
    });
    ElMessage.success(`配置 ${row.configKey} 已保存`);
    await loadActivity();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function toggleBlacklist(row, action) {
  try {
    await api(`/api/admin/users/${row.id}/blacklist`, {
      method: 'POST',
      body: {
        action,
        reason: action === 'block' ? '运营风控拉黑' : undefined,
      },
    });
    ElMessage.success(action === 'block' ? '已拉黑' : '已解除');
    await loadUsers();
    dashboard.value = await api('/api/admin/dashboard');
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function reviewMerchant(row, action) {
  try {
    await api(`/api/admin/merchants/${row.id}/review`, {
      method: 'POST',
      body: {
        action,
        reason: action === 'reject' ? '资质不符/停用' : undefined,
      },
    });
    ElMessage.success(action === 'approve' ? '商户已通过' : '商户已拒绝/停用');
    await loadMerchants();
    dashboard.value = await api('/api/admin/dashboard');
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function createGoods() {
  try {
    if (!newGoods.value.goodsName) {
      ElMessage.warning('请填写商品名');
      return;
    }
    await api('/api/admin/point/goods', {
      method: 'POST',
      body: {
        goodsName: newGoods.value.goodsName,
        needPoints: Number(newGoods.value.needPoints),
        stock: Number(newGoods.value.stock),
        description: newGoods.value.description || null,
      },
    });
    ElMessage.success('积分商品已创建');
    newGoods.value.goodsName = '';
    await loadConfig();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function toggleGoods(row) {
  try {
    await api(`/api/admin/point/goods/${row.id}`, {
      method: 'PUT',
      body: {
        goodsName: row.goodsName,
        needPoints: row.needPoints,
        stock: row.stock,
        status: row.status === 1 ? 0 : 1,
      },
    });
    ElMessage.success(row.status === 1 ? '已下架' : '已上架');
    await loadConfig();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

async function saveGoods(row) {
  try {
    await api(`/api/admin/point/goods/${row.id}`, {
      method: 'PUT',
      body: {
        goodsName: row.goodsName,
        needPoints: Number(row.needPoints),
        stock: Number(row.stock),
        description: row.description,
        status: Number(row.status),
      },
    });
    ElMessage.success(`商品「${row.goodsName}」已保存`);
    await loadConfig();
  } catch (e) {
    ElMessage.error(e.message);
  }
}

function logout() {
  token.value = '';
  localStorage.removeItem('te_admin_token');
}

onMounted(() => {
  if (token.value) {
    loadAll();
    startReviewPolling();
  }
});
</script>

<template>
  <div v-if="!token" class="login-wrap">
    <div class="login-card">
      <div class="sub" style="font-family: var(--font-mono); font-size: 11px; letter-spacing: .12em; color: var(--accent);">
        ADMIN · NANCHANG
      </div>
      <h2>洪城票根后台</h2>
      <p class="lead">智能核验中心 · 券模板 · 盲盒权重。演示账号 admin / admin123</p>
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="用户名">
          <el-input v-model="username" size="large" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="password" type="password" show-password size="large" />
        </el-form-item>
        <el-button type="primary" size="large" style="width: 100%" @click="login"><LayoutDashboard :size="16" style="margin-right:6px" />进入运营中枢</el-button>
      </el-form>
    </div>
  </div>

  <div v-else class="admin-shell">
    <header class="admin-top">
      <div class="brand">
        <div class="mark">洪</div>
        <div>
          <h1>南昌票根经济 · 后台运营中枢</h1>
          <p class="sub">
            redis={{ dashboard?.infra?.redis || '-' }} · queue={{ dashboard?.infra?.queueMode || dashboard?.infra?.queue || '-' }} · pipeline={{ dashboard?.infra?.reviewPipeline || '-' }} · storage={{ dashboard?.infra?.storage || '-' }}
          </p>
        </div>
      </div>
      <div class="meta">
        <span>AI ≥ 0.90 自动过</span>
        <el-button size="small" @click="loadAll" :loading="loading">
          <RefreshCw :size="14" style="margin-right:4px" />刷新
        </el-button>
        <el-button size="small" @click="logout">
          <LogOut :size="14" style="margin-right:4px" />退出
        </el-button>
      </div>
    </header>

    <div class="admin-body">
      <aside class="admin-side">
        <div class="side-sec">核销运营</div>
        <button class="side-link" :class="{ on: nav === 'users' }" @click="switchNav('users')">
          <span class="side-label"><Users :size="15" /> 用户管理</span>
          <span class="c">{{ dashboard?.users ?? users.length ?? 0 }}</span>
        </button>
        <button class="side-link" :class="{ on: nav === 'risk' }" @click="switchNav('risk')">
          <span class="side-label"><ShieldAlert :size="15" /> 风控中心</span>
          <span class="c">{{ riskOverview?.events24h ?? 0 }}</span>
        </button>
        <button class="side-link" :class="{ on: nav === 'review' }" @click="switchNav('review')">
          <span class="side-label"><ClipboardCheck :size="15" /> 智能核验</span>
          <span class="c">{{ dashboard?.pendingManual ?? 0 }}</span>
        </button>
        <button class="side-link" :class="{ on: nav === 'dashboard' }" @click="switchNav('dashboard')">
          <span class="side-label"><LayoutDashboard :size="15" /> 数据总览</span>
          <span class="c">KPI</span>
        </button>
        <button class="side-link" :class="{ on: nav === 'activity' }" @click="switchNav('activity')">
          <span class="side-label"><Megaphone :size="15" /> 活动中心</span>
          <span class="c">{{ banners.length || 0 }}</span>
        </button>
        <button class="side-link" :class="{ on: nav === 'coupons' }" @click="switchNav('coupons')">
          <span class="side-label"><Ticket :size="15" /> 券模板</span>
          <span class="c">{{ templates.length || 0 }}</span>
        </button>
        <button class="side-link" :class="{ on: nav === 'blindbox' }" @click="switchNav('blindbox')">
          <span class="side-label"><Gift :size="15" /> 盲盒权重</span>
          <span class="c">{{ blindboxes.length || 0 }}</span>
        </button>
        <button class="side-link" :class="{ on: nav === 'goods' }" @click="switchNav('goods')">
          <span class="side-label"><ShoppingBag :size="15" /> 积分商品</span>
          <span class="c">{{ goods.length || 0 }}</span>
        </button>

        <div class="side-sec">系统对接</div>
        <button class="side-link" :class="{ on: nav === 'merchants' }" @click="switchNav('merchants')">
          <span class="side-label"><Store :size="15" /> 商户管理</span>
          <span class="c">{{ dashboard?.merchants ?? merchants.length ?? 0 }}</span>
        </button>
        <button class="side-link" :class="{ on: nav === 'system' }" @click="switchNav('system')">
          <span class="side-label"><Settings :size="15" /> 系统设置</span>
          <span class="c">RBAC</span>
        </button>
      </aside>

      <main class="admin-main">
        <div class="kpi-row">
          <div v-for="item in kpis" :key="item[0]" class="kpi">
            <div class="l">{{ item[0] }}</div>
            <div class="n">{{ item[1] }}</div>
          </div>
        </div>

        <!-- USERS -->
        <section v-if="nav === 'risk'" class="panel">
          <div class="panel-head">
            <div>
              <h2>风控中心 · 策略 / 黑名单 / 事件</h2>
              <p class="desc">设备/IP/用户维度拦截 · 票据风险信号 · 策略可调</p>
            </div>
            <el-button @click="loadRisk" :loading="loading">刷新</el-button>
          </div>

          <div class="kpi-row" style="margin-bottom:16px" v-if="riskOverview">
            <div class="kpi"><div class="l">活跃黑名单</div><div class="n">{{ riskOverview.blacklistActive }}</div></div>
            <div class="kpi"><div class="l">启用策略</div><div class="n">{{ riskOverview.strategiesEnabled }}</div></div>
            <div class="kpi"><div class="l">事件</div><div class="n">{{ riskOverview.events24h }}</div></div>
            <div class="kpi"><div class="l">人工票</div><div class="n">{{ riskOverview.ticketsManual }}</div></div>
            <div class="kpi"><div class="l">拒绝票</div><div class="n">{{ riskOverview.ticketsRejected }}</div></div>
            <div class="kpi"><div class="l">封禁用户</div><div class="n">{{ riskOverview.blockedUsers }}</div></div>
          </div>

          <h3 style="margin: 4px 0 10px; font-family: var(--font-display)">策略</h3>
          <el-table :data="riskStrategies" stripe style="margin-bottom: 20px">
            <el-table-column prop="strategyCode" label="Code" min-width="140" />
            <el-table-column label="名称" min-width="140"><template #default="{ row }"><el-input v-model="row.strategyName" size="small" /></template></el-table-column>
            <el-table-column label="阈值" width="100"><template #default="{ row }"><el-input v-model="row.threshold" size="small" /></template></el-table-column>
            <el-table-column label="动作" width="130"><template #default="{ row }"><el-input v-model="row.action" size="small" /></template></el-table-column>
            <el-table-column label="启用" width="90"><template #default="{ row }">{{ Number(row.enabled) === 1 ? '是' : '否' }}</template></el-table-column>
            <el-table-column label="操作" width="160">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="saveStrategy(row)">保存</el-button>
                <el-button size="small" @click="row.enabled = Number(row.enabled) === 1 ? 0 : 1; saveStrategy(row)">
                  {{ Number(row.enabled) === 1 ? '停用' : '启用' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <h3 style="margin: 4px 0 10px; font-family: var(--font-display)">黑名单</h3>
          <el-form :inline="true" style="margin-bottom: 12px">
            <el-form-item label="类型">
              <el-select v-model="newRisk.targetType" style="width:120px">
                <el-option label="用户ID" value="user" />
                <el-option label="手机号" value="phone" />
                <el-option label="OpenID" value="openid" />
                <el-option label="设备" value="device" />
                <el-option label="IP" value="ip" />
              </el-select>
            </el-form-item>
            <el-form-item label="值"><el-input v-model="newRisk.targetValue" style="width:160px" /></el-form-item>
            <el-form-item label="原因"><el-input v-model="newRisk.reason" style="width:200px" /></el-form-item>
            <el-button type="danger" @click="addRiskBlacklist">拉黑</el-button>
          </el-form>
          <el-table :data="riskBlacklist" stripe style="margin-bottom: 20px">
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="targetType" label="类型" width="100" />
            <el-table-column prop="targetValue" label="值" min-width="140" />
            <el-table-column prop="reason" label="原因" min-width="160" />
            <el-table-column label="状态" width="90"><template #default="{ row }">{{ row.status === 1 ? '生效' : '停用' }}</template></el-table-column>
            <el-table-column label="操作" width="110">
              <template #default="{ row }">
                <el-button size="small" @click="toggleRiskBlacklist(row)">{{ row.status === 1 ? '停用' : '启用' }}</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:16px">
            <div>
              <h3 style="margin: 4px 0 10px; font-family: var(--font-display)">风险事件</h3>
              <el-table :data="riskEvents" stripe height="320">
                <el-table-column prop="id" label="ID" width="60" />
                <el-table-column prop="eventType" label="类型" width="120" />
                <el-table-column prop="level" label="级别" width="80" />
                <el-table-column prop="detail" label="详情" min-width="180" />
              </el-table>
            </div>
            <div>
              <h3 style="margin: 4px 0 10px; font-family: var(--font-display)">票据风险信号</h3>
              <el-table :data="riskSignals" stripe height="320">
                <el-table-column prop="ticketId" label="票" width="70" />
                <el-table-column prop="userId" label="用户" width="70" />
                <el-table-column prop="riskScore" label="风险分" width="80" />
                <el-table-column prop="status" label="状态" width="70" />
                <el-table-column prop="rejectReason" label="原因" min-width="140" />
              </el-table>
            </div>
          </div>
        </section>

        <section v-else-if="nav === 'users'" class="panel">
          <div class="panel-head">
            <div>
              <h2>用户管理 · 黑名单</h2>
              <p class="desc">画像摘要 · 拉黑/解封 · 同步消息通知</p>
            </div>
            <div style="display:flex; gap:10px; align-items:center">
              <el-input v-model="userKeyword" placeholder="昵称/ID/手机" style="width:160px" clearable @keyup.enter="loadUsers" />
              <el-select v-model="userStatus" clearable placeholder="状态" style="width:120px" @change="loadUsers">
                <el-option label="正常" value="1" />
                <el-option label="拉黑" value="0" />
              </el-select>
              <el-button @click="loadUsers" :loading="loading"><Search :size="14" style="margin-right:4px" />查询</el-button>
            </div>
          </div>
          <el-table :data="users" v-loading="loading" stripe>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="nickname" label="昵称" min-width="120" />
            <el-table-column prop="phone" label="手机" width="120" />
            <el-table-column prop="level" label="等级" width="80" />
            <el-table-column prop="totalPoints" label="积分" width="90" />
            <el-table-column prop="tickets" label="票据" width="80" />
            <el-table-column prop="coupons" label="券" width="70" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">{{ row.status === 1 ? '正常' : '拉黑' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="160">
              <template #default="{ row }">
                <el-button v-if="row.status === 1" size="small" type="danger" @click="toggleBlacklist(row, 'block')">拉黑</el-button>
                <el-button v-else size="small" type="success" @click="toggleBlacklist(row, 'unblock')">解封</el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>

        <!-- REVIEW -->
        <section v-else-if="nav === 'review'" class="panel">
          <div class="panel-head">
            <div>
              <h2>智能核验中心 · Workers OCR</h2>
              <p class="desc">
                管线 {{ dashboard?.infra?.reviewPipeline || '-' }}
                · 队列 {{ dashboard?.infra?.queueMode || dashboard?.infra?.queue || '-' }}
                · OCR 置信度 / 风险分来自 services/workers
              </p>
            </div>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap">
              <el-select
                v-model="statusFilter"
                clearable
                placeholder="全部状态"
                style="width: 150px"
                @change="loadAll"
              >
                <el-option
                  v-for="(label, val) in statusMap"
                  :key="val"
                  :label="label"
                  :value="String(val)"
                />
              </el-select>
              <el-switch v-model="autoRefresh" active-text="自动刷新" />
              <el-button @click="loadAll" :loading="loading">
                <RefreshCw :size="14" style="margin-right:4px" />刷新
              </el-button>
            </div>
          </div>

          <div class="review-layout">
            <div class="review-table">
              <el-table
                :data="tickets"
                v-loading="loading"
                stripe
                style="width: 100%"
                highlight-current-row
                @row-click="openTicket"
              >
                <el-table-column prop="id" label="ID" width="70" />
                <el-table-column prop="userId" label="用户" width="70" />
                <el-table-column prop="merchantName" label="OCR 商户" min-width="140" />
                <el-table-column prop="amount" label="金额" width="80" />
                <el-table-column prop="ocrConfidence" label="OCR%" width="80" />
                <el-table-column prop="riskScore" label="风险分" width="80" />
                <el-table-column label="状态" width="100">
                  <template #default="{ row }">{{ statusMap[row.status] ?? row.status }}</template>
                </el-table-column>
                <el-table-column label="操作" width="220">
                  <template #default="{ row }">
                    <el-button size="small" @click.stop="openTicket(row)">详情</el-button>
                    <template v-if="row.status === 5">
                      <el-button size="small" type="success" @click.stop="review(row, 'approve')">通过</el-button>
                      <el-button size="small" type="danger" @click.stop="review(row, 'reject')">拒绝</el-button>
                    </template>
                    <el-button
                      v-if="row.status === 1 || row.status === 2 || row.status === 5 || row.status === 0"
                      size="small"
                      @click.stop="requeueOcr(row)"
                    >重跑OCR</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <aside class="review-detail card-like" v-if="selectedTicket">
              <div class="detail-head">
                <div>
                  <div class="detail-title">票据 #{{ selectedTicket.id }}</div>
                  <div class="muted">{{ statusMap[selectedTicket.status] ?? selectedTicket.status }} · user {{ selectedTicket.userId }}</div>
                </div>
                <el-button size="small" @click="selectedTicket = null">关闭</el-button>
              </div>

              <div class="ticket-image-wrap" v-if="selectedTicket.imageUrl">
                <img :src="selectedTicket.imageUrl" alt="票据原图" class="ticket-image" />
              </div>
              <div v-else class="empty muted">无票据图片</div>

              <div class="ocr-grid">
                <div class="ocr-item"><span>OCR 商户</span><b>{{ selectedTicket.merchantName || '-' }}</b></div>
                <div class="ocr-item"><span>金额</span><b>{{ selectedTicket.amount ?? '-' }}</b></div>
                <div class="ocr-item"><span>单号</span><b>{{ selectedTicket.orderNo || '-' }}</b></div>
                <div class="ocr-item"><span>消费时间</span><b>{{ (selectedTicket.consumeTime || '').replace('T',' ').slice(0,19) || '-' }}</b></div>
                <div class="ocr-item"><span>OCR 置信度</span><b>{{ selectedTicket.ocrConfidence ?? '-' }}</b></div>
                <div class="ocr-item"><span>风险分</span><b>{{ selectedTicket.riskScore ?? '-' }}</b></div>
                <div class="ocr-item"><span>票种</span><b>{{ selectedTicket.ticketType || '-' }}</b></div>
                <div class="ocr-item"><span>拒绝原因</span><b>{{ selectedTicket.rejectReason || '-' }}</b></div>
              </div>

              <div class="row" style="margin-top: 12px; display:flex; gap:8px; flex-wrap:wrap">
                <el-button type="primary" size="small" @click="requeueOcr(selectedTicket)">重跑 Workers OCR</el-button>
                <el-button
                  v-if="selectedTicket.status === 5"
                  type="success"
                  size="small"
                  @click="review(selectedTicket, 'approve')"
                >人工通过</el-button>
                <el-button
                  v-if="selectedTicket.status === 5"
                  type="danger"
                  size="small"
                  @click="review(selectedTicket, 'reject')"
                >人工拒绝</el-button>
              </div>
            </aside>
            <aside class="review-detail card-like" v-else>
              <div class="empty muted">点击左侧票据查看 OCR 结果与原图</div>
              <p class="muted" style="margin-top:10px;font-size:12px">
                split 管线：API 投递 ticket.upload → workers OCR → AI 决策回写 → 本台展示/人工兜底
              </p>
            </aside>
          </div>
        </section>

        <!-- COUPONS -->
        <section v-else-if="nav === 'coupons'" class="panel">
          <div class="panel-head">
            <div>
              <h2>消费券模板</h2>
              <p class="desc">Sprint 2 · 创建 / 启停，实时影响盲盒发券池</p>
            </div>
            <el-button type="primary" @click="createCoupon"><Plus :size="14" style="margin-right:4px" />新建模板</el-button>
          </div>

          <el-form :inline="true" style="margin-bottom: 14px">
            <el-form-item label="名称">
              <el-input v-model="newCoupon.couponName" placeholder="本地商户满减券" style="width: 180px" />
            </el-form-item>
            <el-form-item label="类型">
              <el-select v-model="newCoupon.couponType" style="width: 120px">
                <el-option label="商户" value="merchant" />
                <el-option label="景区" value="scenic" />
                <el-option label="地铁" value="metro" />
                <el-option label="出行" value="didi" />
                <el-option label="电影" value="movie" />
              </el-select>
            </el-form-item>
            <el-form-item label="面额">
              <el-input v-model="newCoupon.amount" style="width: 90px" />
            </el-form-item>
            <el-form-item label="说明">
              <el-input v-model="newCoupon.discountDesc" style="width: 140px" />
            </el-form-item>
            <el-form-item label="库存">
              <el-input v-model="newCoupon.totalCount" style="width: 100px" />
            </el-form-item>
            <el-form-item label="有效天">
              <el-input v-model="newCoupon.validDays" style="width: 90px" />
            </el-form-item>
          </el-form>

          <el-table :data="templates" v-loading="loading" stripe>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="couponName" label="名称" min-width="150" />
            <el-table-column prop="couponType" label="类型" width="100" />
            <el-table-column prop="amount" label="面额" width="90" />
            <el-table-column prop="discountDesc" label="说明" min-width="120" />
            <el-table-column label="库存" width="120">
              <template #default="{ row }">{{ row.remainCount }} / {{ row.totalCount }}</template>
            </el-table-column>
            <el-table-column prop="validDays" label="有效天" width="90" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">{{ row.status === 1 ? '启用' : '停用' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button size="small" @click="toggleTemplate(row)">
                  {{ row.status === 1 ? '停用' : '启用' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>

        <!-- BLINDBOX -->
        <section v-else-if="nav === 'blindbox'" class="panel">
          <div class="panel-head">
            <div>
              <h2>盲盒奖池 · 权重 / 库存</h2>
              <p class="desc">调整权重即时影响开奖概率；库存耗尽自动剔除</p>
            </div>
            <el-button @click="loadConfig" :loading="loading">同步配置</el-button>
          </div>

          <div v-for="box in blindboxes" :key="box.id" style="margin-bottom: 18px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
              <div>
                <strong style="font-family: var(--font-display); font-size: 18px">{{ box.boxName }}</strong>
                <span class="muted" style="margin-left: 8px">日限 {{ box.dayLimit ?? '∞' }} · status={{ box.status }}</span>
              </div>
            </div>
            <el-table :data="box.rewards || []" stripe>
              <el-table-column prop="id" label="ID" width="70" />
              <el-table-column prop="rewardName" label="奖品" min-width="140" />
              <el-table-column label="权重" width="120">
                <template #default="{ row }">
                  <el-input v-model="row.weight" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="剩余库存" width="120">
                <template #default="{ row }">
                  <el-input v-model="row.remainStock" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="总库存" width="120">
                <template #default="{ row }">
                  <el-input v-model="row.stock" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="谢谢参与" width="100">
                <template #default="{ row }">{{ row.isThanks ? '是' : '否' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="110">
                <template #default="{ row }">
                  <el-button size="small" type="primary" @click="saveReward(row)">保存</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div v-if="!blindboxes.length" class="muted">暂无盲盒配置</div>
        </section>

        <!-- MERCHANTS -->
        <section v-else-if="nav === 'merchants'" class="panel">
          <div class="panel-head">
            <div>
              <h2>商户管理</h2>
              <p class="desc">入驻审核 · 门店状态 · 核销量</p>
            </div>
            <div style="display:flex; gap:10px; align-items:center">
              <el-select v-model="merchantStatus" clearable placeholder="全部状态" style="width:140px" @change="loadMerchants">
                <el-option label="待审" value="0" />
                <el-option label="已通过" value="1" />
                <el-option label="拒绝/停用" value="2" />
              </el-select>
              <el-button @click="loadMerchants" :loading="loading">刷新</el-button>
            </div>
          </div>

          <el-table :data="merchants" v-loading="loading" stripe>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="merchantName" label="品牌" min-width="120" />
            <el-table-column prop="storeName" label="门店" min-width="140" />
            <el-table-column prop="address" label="地址" min-width="160" />
            <el-table-column prop="verifyCount" label="核销量" width="90" />
            <el-table-column label="账号" min-width="120">
              <template #default="{ row }">
                {{ (row.accounts || []).map(a => a.username).join(', ') || '—' }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                {{ row.status === 1 ? '已通过' : row.status === 0 ? '待审' : '拒绝/停用' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="190">
              <template #default="{ row }">
                <template v-if="row.status !== 1">
                  <el-button size="small" type="success" @click="reviewMerchant(row, 'approve')">通过</el-button>
                </template>
                <template v-if="row.status !== 2">
                  <el-button size="small" type="danger" @click="reviewMerchant(row, 'reject')">停用</el-button>
                </template>
                <span v-if="row.status === 1" style="color: var(--muted); margin-right: 6px">营业中</span>
              </template>
            </el-table-column>
          </el-table>
        </section>

        <!-- GOODS -->
        <section v-else-if="nav === 'activity'" class="panel">
          <div class="panel-head">
            <div>
              <h2>活动中心</h2>
              <p class="desc">Banner / 公告 / 运营配置，驱动消费者首页投放</p>
            </div>
            <el-button @click="loadActivity" :loading="loading">刷新</el-button>
          </div>

          <h3 style="margin: 8px 0 12px; font-family: var(--font-display)">Banner</h3>
          <el-form :inline="true" style="margin-bottom: 12px">
            <el-form-item label="标题"><el-input v-model="newBanner.title" style="width:160px" /></el-form-item>
            <el-form-item label="副标题"><el-input v-model="newBanner.subtitle" style="width:180px" /></el-form-item>
            <el-form-item label="链接"><el-input v-model="newBanner.linkUrl" style="width:120px" /></el-form-item>
            <el-form-item label="排序"><el-input v-model="newBanner.sortNo" style="width:80px" /></el-form-item>
            <el-button type="primary" @click="createBanner">新建</el-button>
          </el-form>
          <el-table :data="banners" stripe style="margin-bottom: 24px">
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column label="标题" min-width="140"><template #default="{ row }"><el-input v-model="row.title" size="small" /></template></el-table-column>
            <el-table-column label="副标题" min-width="160"><template #default="{ row }"><el-input v-model="row.subtitle" size="small" /></template></el-table-column>
            <el-table-column label="链接" width="120"><template #default="{ row }"><el-input v-model="row.linkUrl" size="small" /></template></el-table-column>
            <el-table-column label="排序" width="90"><template #default="{ row }"><el-input v-model="row.sortNo" size="small" /></template></el-table-column>
            <el-table-column label="状态" width="90"><template #default="{ row }">{{ row.status === 1 ? '上线' : '下线' }}</template></el-table-column>
            <el-table-column label="操作" width="180">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="saveBanner(row)">保存</el-button>
                <el-button size="small" @click="toggleBanner(row)">{{ row.status === 1 ? '下线' : '上线' }}</el-button>
              </template>
            </el-table-column>
          </el-table>

          <h3 style="margin: 8px 0 12px; font-family: var(--font-display)">公告</h3>
          <el-form :inline="true" style="margin-bottom: 12px">
            <el-form-item label="标题"><el-input v-model="newAnnouncement.title" style="width:180px" /></el-form-item>
            <el-form-item label="内容"><el-input v-model="newAnnouncement.content" style="width:280px" /></el-form-item>
            <el-button type="primary" @click="createAnnouncement">发布</el-button>
          </el-form>
          <el-table :data="announcements" stripe style="margin-bottom: 24px">
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="title" label="标题" min-width="160" />
            <el-table-column prop="content" label="内容" min-width="240" />
            <el-table-column label="状态" width="90"><template #default="{ row }">{{ row.status === 1 ? '上线' : '下线' }}</template></el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button size="small" @click="toggleAnnouncement(row)">{{ row.status === 1 ? '下线' : '上线' }}</el-button>
              </template>
            </el-table-column>
          </el-table>

          <h3 style="margin: 8px 0 12px; font-family: var(--font-display)">运营配置</h3>
          <el-table :data="configs" stripe>
            <el-table-column prop="configKey" label="Key" min-width="180" />
            <el-table-column label="Value" min-width="220"><template #default="{ row }"><el-input v-model="row.configValue" size="small" /></template></el-table-column>
            <el-table-column prop="remark" label="备注" min-width="140" />
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="saveConfig(row)">保存</el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>

        <section v-else-if="nav === 'system'" class="panel">
          <div class="panel-head">
            <div>
              <h2>系统设置 · 角色权限</h2>
              <p class="desc">RBAC 视图（演示数据）· 环境开关只读</p>
            </div>
            <el-button @click="loadSystem" :loading="loading">刷新</el-button>
          </div>

          <div class="kpi-row" style="margin-bottom:16px" v-if="systemOverview">
            <div class="kpi"><div class="l">角色</div><div class="n">{{ systemOverview.roles }}</div></div>
            <div class="kpi"><div class="l">权限点</div><div class="n">{{ systemOverview.permissions }}</div></div>
            <div class="kpi"><div class="l">管理员</div><div class="n">{{ systemOverview.admins }}</div></div>
            <div class="kpi"><div class="l">DB</div><div class="n" style="font-size:18px">{{ systemOverview.env?.dbMode }}</div></div>
            <div class="kpi"><div class="l">AI</div><div class="n" style="font-size:16px">{{ systemOverview.env?.aiMockMode }}</div></div>
            <div class="kpi"><div class="l">审核</div><div class="n" style="font-size:16px">{{ systemOverview.env?.reviewMode }}</div></div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1.2fr; gap:16px">
            <div>
              <h3 style="margin:4px 0 10px;font-family:var(--font-display)">角色</h3>
              <el-table :data="sysRoles" stripe>
                <el-table-column prop="id" label="ID" width="70" />
                <el-table-column prop="roleCode" label="Code" min-width="140" />
                <el-table-column prop="roleName" label="名称" min-width="120" />
                <el-table-column label="状态" width="90">
                  <template #default="{ row }">{{ row.status === 1 ? '启用' : '停用' }}</template>
                </el-table-column>
              </el-table>
            </div>
            <div>
              <h3 style="margin:4px 0 10px;font-family:var(--font-display)">权限点</h3>
              <el-table :data="sysPermissions" stripe>
                <el-table-column prop="id" label="ID" width="70" />
                <el-table-column prop="module" label="模块" width="100" />
                <el-table-column prop="permCode" label="权限码" min-width="160" />
                <el-table-column prop="permName" label="名称" min-width="140" />
              </el-table>
            </div>
          </div>
        </section>

        <section v-else-if="nav === 'goods'" class="panel">
          <div class="panel-head">
            <div>
              <h2>积分商城商品</h2>
              <p class="desc">配置兑换所需积分、库存与上下架</p>
            </div>
            <el-button type="primary" @click="createGoods"><Plus :size="14" style="margin-right:4px" />新建商品</el-button>
          </div>

          <el-form :inline="true" style="margin-bottom: 14px">
            <el-form-item label="名称">
              <el-input v-model="newGoods.goodsName" placeholder="文创冰箱贴" style="width: 160px" />
            </el-form-item>
            <el-form-item label="积分">
              <el-input v-model="newGoods.needPoints" style="width: 100px" />
            </el-form-item>
            <el-form-item label="库存">
              <el-input v-model="newGoods.stock" style="width: 100px" />
            </el-form-item>
            <el-form-item label="说明">
              <el-input v-model="newGoods.description" style="width: 180px" />
            </el-form-item>
          </el-form>

          <el-table :data="goods" v-loading="loading" stripe>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column label="名称" min-width="140">
              <template #default="{ row }">
                <el-input v-model="row.goodsName" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="积分" width="110">
              <template #default="{ row }">
                <el-input v-model="row.needPoints" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="库存" width="110">
              <template #default="{ row }">
                <el-input v-model="row.stock" size="small" />
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" min-width="140" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">{{ row.status === 1 ? '上架' : '下架' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="180">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="saveGoods(row)">保存</el-button>
                <el-button size="small" @click="toggleGoods(row)">
                  {{ row.status === 1 ? '下架' : '上架' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>

        <!-- DASHBOARD -->
        <section v-else class="panel">
          <div class="panel-head">
            <div>
              <h2>100 天进度 · 玩法转化</h2>
              <p class="desc">实时 KPI 来自 API；漏斗条为演示对照数据</p>
            </div>
            <el-button @click="loadAll" :loading="loading">同步实时指标</el-button>
          </div>

          <div class="pool">
            <div class="pool-row">
              <span>票根上传</span>
              <span class="bar"><i style="width: 100%"></i></span>
              <span class="val">100%</span>
            </div>
            <div class="pool-row">
              <span>识别通过</span>
              <span class="bar"><i style="width: 94%"></i></span>
              <span class="val">94%</span>
            </div>
            <div class="pool-row">
              <span>抢券 / 盲盒</span>
              <span class="bar"><i style="width: 71%"></i></span>
              <span class="val">71%</span>
            </div>
            <div class="pool-row">
              <span>到店核销</span>
              <span class="bar"><i style="width: 49%"></i></span>
              <span class="val">49%</span>
            </div>
            <div class="pool-row">
              <span>复访 ≥2 次</span>
              <span class="bar"><i style="width: 22%"></i></span>
              <span class="val">22%</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>
