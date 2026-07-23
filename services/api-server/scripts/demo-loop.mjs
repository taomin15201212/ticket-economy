/**
 * E2E happy-path demo (Sprint 3):
 * login → upload → submit → poll → blindbox → merchant verify
 * → checkin GPS → points mall exchange
 *
 * Usage: node scripts/demo-loop.mjs [baseUrl]
 */
const base = process.argv[2] || 'http://localhost:3000';

async function req(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (json.code !== 0) {
    throw new Error(`${method} ${path} failed: ${json.message}`);
  }
  return json.data;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitApproved(token, ticketId, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const t = await req(`/api/ticket/detail/${ticketId}`, { token });
    if ([3, 4, 5].includes(t.status)) return t;
    await sleep(120);
  }
  throw new Error(`timeout waiting review for ticket ${ticketId}`);
}

async function main() {
  console.log('== ticket-economy demo loop (Sprint 3) ==');
  console.log('base:', base);

  const health = await req('/health');
  console.log('health infra', health.infra);

  const login = await req('/api/auth/login', {
    method: 'POST',
    body: { code: 'demo' },
  });
  console.log('user login ok', login.user);

  let opened = null;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const uploaded = await req('/api/ticket/upload', {
      method: 'POST',
      token: login.accessToken,
      body: {
        ticketType: 'dining',
        imageUrl: `https://placehold.co/400x600?text=demo-${Date.now()}-${attempt}`,
      },
    });
    console.log(
      `ticket uploaded (try ${attempt})`,
      uploaded.ticketId,
      'storage=',
      uploaded.storageBackend,
    );

    const submitted = await req('/api/ticket/submit', {
      method: 'POST',
      token: login.accessToken,
      body: { ticketId: uploaded.ticketId },
    });
    console.log(
      'ticket submitted',
      submitted.queued
        ? `queued(${submitted.queueMode})`
        : `status=${submitted.status}`,
    );

    const reviewed = await waitApproved(login.accessToken, uploaded.ticketId);
    console.log(
      'ticket reviewed status=',
      reviewed.status,
      'amount=',
      reviewed.amount,
      'ocr=',
      reviewed.ocrConfidence,
    );

    if (reviewed.status !== 3) {
      console.log('ticket not approved (AI_MOCK_MODE?), stop before blindbox');
      process.exit(0);
    }

    opened = await req('/api/blindbox/open', {
      method: 'POST',
      token: login.accessToken,
      body: { ticketId: uploaded.ticketId },
    });
    console.log('blindbox open', opened.reward, opened.coupon?.couponCode);
    if (opened.coupon?.couponCode) break;
  }

  if (opened?.coupon?.couponCode) {
    const merchant = await req('/api/merchant/login', {
      method: 'POST',
      body: { username: 'merchant01', password: '123456' },
    });
    console.log('merchant login', merchant.account.storeName);

    const verified = await req('/api/merchant/verify', {
      method: 'POST',
      token: merchant.accessToken,
      body: {
        couponCode: opened.coupon.couponCode,
        verifyType: 'scan',
        requestId: `req-${Date.now()}`,
      },
    });
    console.log('verified', verified.record?.id);
  } else {
    console.log('no coupon — skip merchant verify');
  }

  // Check-in near 秋水广场
  const locations = await req('/api/checkin/locations', {
    token: login.accessToken,
  });
  const spot = locations[0];
  console.log('checkin locations', locations.map((l) => l.name).join(', '));

  const checked = await req('/api/checkin', {
    method: 'POST',
    token: login.accessToken,
    body: {
      locationId: spot.id,
      longitude: spot.longitude + 0.0001,
      latitude: spot.latitude + 0.0001,
    },
  });
  console.log(
    'checkin',
    checked.message,
    'distance=',
    checked.record.distance,
    'points=',
    checked.points?.changePoints,
  );

  const points = await req('/api/user/points', { token: login.accessToken });
  console.log('points balance', points);

  const goods = await req('/api/point/goods', { token: login.accessToken });
  const cheap = (goods.list || []).sort(
    (a, b) => a.needPoints - b.needPoints,
  )[0];
  if (cheap && points.totalPoints >= cheap.needPoints) {
    const ex = await req('/api/point/exchange', {
      method: 'POST',
      token: login.accessToken,
      body: { goodsId: cheap.id },
    });
    console.log('exchange', ex.goods.goodsName, 'balance=', ex.balance);
  } else {
    console.log(
      'skip exchange (need',
      cheap?.needPoints,
      'have',
      points.totalPoints,
      ')',
    );
  }

  const logs = await req('/api/point/list', { token: login.accessToken });
  console.log(
    'point logs',
    logs.list.map((l) => `${l.changeType}:${l.changePoints}`),
  );

  const admin = await req('/api/auth/admin/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin123' },
  });
  const dash = await req('/api/admin/dashboard', { token: admin.accessToken });
  console.log('admin dashboard infra', dash.infra, 'checkins', dash.checkins);

  console.log('== demo loop SUCCESS ==');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
