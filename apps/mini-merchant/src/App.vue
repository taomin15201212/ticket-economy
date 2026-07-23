<script setup>
import { computed, ref } from 'vue';
import {
  Store,
  ScanLine,
  Keyboard,
  ClipboardList,
  BarChart3,
  LogIn,
  LogOut,
  RefreshCw,
  Download,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
} from 'lucide-vue-next';

const API = import.meta.env.VITE_API_BASE || '';
const token = ref(localStorage.getItem('te_merchant_token') || '');
const profile = ref(null);
const username = ref('merchant01');
const password = ref('123456');
const couponCode = ref('');
const message = ref('');
const isError = ref(false);
const loading = ref(false);
const tab = ref('verify');
const verifyMode = ref('scan'); // scan | manual
const records = ref([]);
const report = ref(null);
const lastVerify = ref(null);

const storeLabel = computed(() => {
  if (!profile.value) return '未登录门店';
  const name = profile.value.merchantName || profile.value.name || '门店';
  const store = profile.value.storeName || '';
  return store ? `${name} · ${store}` : name;
});

const maxTrend = computed(() => {
  const arr = report.value?.trend7d || [];
  return Math.max(1, ...arr.map((d) => d.count || 0));
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
  if (json.code !== 0) throw new Error(json.message || '失败');
  return json.data;
}

async function login() {
  loading.value = true;
  try {
    const data = await api('/api/merchant/login', {
      method: 'POST',
      body: { username: username.value, password: password.value },
      auth: false,
    });
    token.value = data.accessToken;
    localStorage.setItem('te_merchant_token', token.value);
    profile.value = data.account || data.merchant || null;
    message.value = `登录成功：${data.account?.storeName || storeLabel.value}`;
    isError.value = false;
    await loadAll();
    tab.value = 'home';
  } catch (e) {
    isError.value = true;
    message.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function loadProfile() {
  if (!token.value) return;
  const p = await api('/api/merchant/profile');
  profile.value = {
    ...(p.merchant || p.account || {}),
    stats: p.stats,
    recent: p.recent || [],
  };
}

async function loadRecords() {
  const data = await api('/api/merchant/use-records?page=1&pageSize=50');
  records.value = data.list || [];
}

async function loadReport() {
  report.value = await api('/api/merchant/report');
}

async function loadAll() {
  await loadProfile();
  await Promise.all([loadRecords(), loadReport()]);
}

async function verify() {
  if (!couponCode.value.trim()) {
    isError.value = true;
    message.value = '请输入券码';
    return;
  }
  loading.value = true;
  try {
    const data = await api('/api/merchant/verify', {
      method: 'POST',
      body: {
        couponCode: couponCode.value.trim(),
        verifyType: verifyMode.value,
        requestId: `m-${Date.now()}`,
      },
    });
    isError.value = false;
    lastVerify.value = data;
    const name =
      data.coupon?.template?.couponName ||
      data.merchant?.storeName ||
      '消费券';
    message.value = data.idempotent
      ? `幂等命中：该 request 已核销过\n记录 #${data.record?.id}`
      : `核销成功 · ${name}\n券码 ${couponCode.value.trim()}\n用户 ${data.coupon?.userId ?? '-'}`;
    couponCode.value = '';
    await loadAll();
    tab.value = 'records';
  } catch (e) {
    isError.value = true;
    message.value = e.message;
  } finally {
    loading.value = false;
  }
}

function exportCsv() {
  if (!records.value.length) {
    message.value = '暂无记录可导出';
    isError.value = true;
    return;
  }
  const header = ['id', 'useTime', 'couponCode', 'couponName', 'userNickname', 'verifyType'];
  const lines = [header.join(',')];
  for (const r of records.value) {
    lines.push(
      [
        r.id,
        r.useTime,
        r.couponCode || '',
        (r.couponName || '').replaceAll(',', ' '),
        (r.userNickname || '').replaceAll(',', ' '),
        r.verifyType || '',
      ].join(','),
    );
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `merchant-verify-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  isError.value = false;
  message.value = `已导出 ${records.value.length} 条核销记录`;
}

function logout() {
  token.value = '';
  profile.value = null;
  records.value = [];
  report.value = null;
  lastVerify.value = null;
  localStorage.removeItem('te_merchant_token');
  message.value = '已退出登录';
  isError.value = false;
}

async function goTab(next) {
  tab.value = next;
  if (!token.value) return;
  try {
    if (next === 'records') await loadRecords();
    if (next === 'report') await loadReport();
    if (next === 'home') await loadProfile();
  } catch (e) {
    isError.value = true;
    message.value = e.message;
  }
}
</script>

<template>
  <header class="header">
    <div class="eyebrow"><Store :size="12" /> Merchant · POS Mini</div>
    <h1>门店核销台</h1>
    <p>{{ storeLabel }}</p>
  </header>

  <main class="page">
    <div v-if="!token" class="card">
      <h3>商户登录</h3>
      <p class="muted">演示账号 merchant01 / 123456</p>
      <label>用户名</label>
      <input v-model="username" placeholder="merchant01" autocomplete="username" />
      <label>密码</label>
      <input v-model="password" type="password" placeholder="密码" autocomplete="current-password" />
      <button class="btn btn-primary" :disabled="loading" @click="login">
        <LogIn :size="16" />
        {{ loading ? '登录中…' : '登录工作台' }}
      </button>
    </div>

    <template v-else>
      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'home' }" @click="goTab('home')"><Store :size="14" /> 工作台</button>
        <button class="tab" :class="{ active: tab === 'verify' }" @click="goTab('verify')"><ScanLine :size="14" /> 核销</button>
        <button class="tab" :class="{ active: tab === 'records' }" @click="goTab('records')"><ClipboardList :size="14" /> 记录</button>
        <button class="tab" :class="{ active: tab === 'report' }" @click="goTab('report')"><BarChart3 :size="14" /> 对账</button>
      </div>

      <section v-if="tab === 'home'" class="card">
        <h3>{{ profile?.storeName || '门店工作台' }}</h3>
        <p class="muted">{{ profile?.merchantName || '品牌门店' }} · 扫码 / 手工 / 对账</p>
        <div class="stats">
          <div class="stat">
            <div class="n">{{ profile?.stats?.todayVerify ?? 0 }}</div>
            <div class="l">今日核销</div>
          </div>
          <div class="stat">
            <div class="n">{{ profile?.stats?.totalVerify ?? 0 }}</div>
            <div class="l">累计核销</div>
          </div>
        </div>

        <div style="margin-top: 14px">
          <div class="muted" style="margin-bottom: 6px">最近核销</div>
          <div v-if="!(profile?.recent || []).length" class="muted">暂无记录，去核销一笔试试</div>
          <div v-for="r in profile?.recent || []" :key="r.id" class="list-row">
            <span>{{ r.couponName || '消费券' }}</span>
            <span class="pt">{{ r.verifyType }}</span>
          </div>
        </div>

        <button class="btn btn-primary" @click="goTab('verify')"><ScanLine :size="16" /> 开始核销</button>
        <button class="btn btn-secondary" @click="loadAll"><RefreshCw :size="15" /> 刷新数据</button>
        <button class="btn btn-secondary" @click="logout"><LogOut :size="15" /> 退出登录</button>
      </section>

      <section v-else-if="tab === 'verify'">
        <div class="card">
          <h3>核销验券</h3>
          <p class="muted">支持扫码模拟 / 手工输入 · requestId 幂等</p>

          <div class="tabs" style="margin: 10px 0 12px">
            <button class="tab" :class="{ active: verifyMode === 'scan' }" @click="verifyMode = 'scan'"><ScanLine :size="14" /> 扫码</button>
            <button class="tab" :class="{ active: verifyMode === 'manual' }" @click="verifyMode = 'manual'"><Keyboard :size="14" /> 手工</button>
          </div>

          <div v-if="verifyMode === 'scan'" class="scanner" aria-hidden="true">
            <div class="frame"></div>
            <div class="hint">SCAN AREA · 对准券码</div>
          </div>

          <label>{{ verifyMode === 'scan' ? '识别到的券码' : '手工输入券码' }}</label>
          <input v-model="couponCode" placeholder="粘贴消费者券码 CPN..." />
          <button class="btn btn-primary" :disabled="loading" @click="verify">
            <ShieldCheck :size="16" />
            {{ loading ? '核销中…' : '确认核销' }}
          </button>
          <button class="btn btn-secondary" @click="goTab('records')">
            <ClipboardList :size="15" />
            查看核销记录
          </button>
        </div>

        <div class="card" v-if="lastVerify && !isError">
          <h3 class="with-icon"><CheckCircle2 :size="18" color="var(--status-ok)" /> 核销回执</h3>
          <div class="list-row"><span>记录 ID</span><span class="pt">#{{ lastVerify.record?.id }}</span></div>
          <div class="list-row"><span>用户</span><span class="pt">{{ lastVerify.coupon?.userId }}</span></div>
          <div class="list-row"><span>门店</span><span class="pt">{{ lastVerify.merchant?.storeName || '-' }}</span></div>
          <div class="list-row"><span>方式</span><span class="pt">{{ lastVerify.record?.verifyType || verifyMode }}</span></div>
        </div>
      </section>

      <section v-else-if="tab === 'records'" class="card">
        <div class="row-between" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <div>
            <h3 style="margin:0">核销记录</h3>
            <p class="muted" style="margin:4px 0 0">共 {{ records.length }} 条</p>
          </div>
          <button class="btn btn-secondary" style="width:auto;margin:0;padding:8px 12px" @click="exportCsv">
            <Download :size="14" /> 导出 CSV
          </button>
        </div>

        <div style="margin-top: 10px">
          <div v-if="!records.length" class="muted">暂无核销记录</div>
          <div v-for="r in records" :key="r.id" class="record">
            <div class="record-top">
              <strong>{{ r.couponName || '消费券' }}</strong>
              <span class="pt">#{{ r.id }}</span>
            </div>
            <div class="muted">{{ r.couponCode || '-' }} · {{ r.userNickname || ('用户' + r.userId) }}</div>
            <div class="record-meta">
              <span>{{ r.verifyType || 'scan' }}</span>
              <span>{{ (r.useTime || '').replace('T', ' ').slice(0, 19) }}</span>
            </div>
          </div>
        </div>
      </section>

      <section v-else class="card">
        <h3>今日对账</h3>
        <p class="muted">门店维度归档 · 近 7 日趋势</p>
        <div class="stats">
          <div class="stat">
            <div class="n">{{ report?.today ?? profile?.stats?.todayVerify ?? 0 }}</div>
            <div class="l">今日核销</div>
          </div>
          <div class="stat">
            <div class="n">{{ report?.total ?? profile?.stats?.totalVerify ?? 0 }}</div>
            <div class="l">区间累计</div>
          </div>
        </div>

        <div style="margin-top: 14px">
          <div class="muted" style="margin-bottom: 8px">近 7 日</div>
          <div class="trend">
            <div v-for="d in report?.trend7d || []" :key="d.date" class="trend-col">
              <div class="bar-wrap">
                <div class="bar" :style="{ height: `${Math.max(8, (d.count / maxTrend) * 100)}%` }"></div>
              </div>
              <div class="c">{{ d.count }}</div>
              <div class="d">{{ d.date.slice(5) }}</div>
            </div>
          </div>
        </div>

        <div style="margin-top: 14px">
          <div class="list-row"><span>扫码核销</span><span class="pt">{{ report?.byVerifyType?.scan || 0 }}</span></div>
          <div class="list-row"><span>手工核销</span><span class="pt">{{ report?.byVerifyType?.manual || 0 }}</span></div>
          <div class="list-row"><span>导出对账单</span><span class="pt" style="cursor:pointer" @click="exportCsv">CSV</span></div>
        </div>
      </section>
    </template>

    <div v-if="message" class="card">
      <div class="msg" :class="{ err: isError }">{{ message }}</div>
    </div>
  </main>
</template>
