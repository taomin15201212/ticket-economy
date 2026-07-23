/**
 * k6 smoke test for ticket-economy API.
 *
 * Install: https://k6.io/docs/get-started/installation/
 * Run:
 *   k6 run scripts/k6-smoke.js
 *   k6 run -e BASE=http://127.0.0.1:3000 -e VUS=10 -e DURATION=30s scripts/k6-smoke.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE || 'http://127.0.0.1:3000';

export const options = {
  vus: Number(__ENV.VUS || 5),
  duration: __ENV.DURATION || '15s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<800'],
  },
};

function json(res) {
  try {
    return res.json();
  } catch {
    return {};
  }
}

export default function () {
  const health = http.get(`${BASE}/health`);
  check(health, {
    'health 200': (r) => r.status === 200,
    'health code 0': (r) => json(r).code === 0,
  });

  const login = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ code: `k6_${__VU}_${Date.now()}` }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  const loginBody = json(login);
  check(login, {
    'login ok': (r) => r.status === 200 || r.status === 201,
    'login token': () => !!loginBody?.data?.accessToken,
  });
  const token = loginBody?.data?.accessToken;
  if (!token) {
    sleep(0.5);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const up = http.post(
    `${BASE}/api/ticket/upload`,
    JSON.stringify({
      ticketType: 'dining',
      imageUrl: `https://placehold.co/200x200?text=k6-${__VU}-${Date.now()}`,
    }),
    { headers },
  );
  const upBody = json(up);
  check(up, { 'upload ok': () => upBody?.code === 0 });

  if (upBody?.data?.ticketId) {
    const sub = http.post(
      `${BASE}/api/ticket/submit`,
      JSON.stringify({ ticketId: upBody.data.ticketId }),
      { headers },
    );
    check(sub, { 'submit ok': (r) => json(r).code === 0 });
  }

  const goods = http.get(`${BASE}/api/point/goods`, { headers });
  check(goods, { 'goods ok': (r) => json(r).code === 0 });

  sleep(0.3);
}
