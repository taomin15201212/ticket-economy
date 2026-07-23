/**
 * Lightweight load smoke (not a full stress test).
 * Fires concurrent login+upload+submit against a running API.
 *
 * Usage:
 *   node scripts/load-smoke.mjs [baseUrl] [concurrency=20] [rounds=3]
 */
const base = process.argv[2] || 'http://localhost:3000';
const concurrency = Number(process.argv[3] || 20);
const rounds = Number(process.argv[4] || 3);

async function one(i) {
  const t0 = Date.now();
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: `load_${i}_${Date.now()}` }),
  }).then((r) => r.json());
  if (login.code !== 0) throw new Error(login.message);

  const token = login.data.accessToken;
  const up = await fetch(`${base}/api/ticket/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ticketType: 'dining',
      imageUrl: `https://placehold.co/200x200?text=load-${i}`,
    }),
  }).then((r) => r.json());
  if (up.code !== 0) throw new Error(up.message);

  const sub = await fetch(`${base}/api/ticket/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ticketId: up.data.ticketId }),
  }).then((r) => r.json());
  if (sub.code !== 0) throw new Error(sub.message);

  return Date.now() - t0;
}

async function round(n) {
  const tasks = Array.from({ length: concurrency }, (_, i) => one(n * concurrency + i));
  const started = Date.now();
  const results = await Promise.allSettled(tasks);
  const ok = results.filter((r) => r.status === 'fulfilled');
  const fail = results.filter((r) => r.status === 'rejected');
  const latencies = ok.map((r) => r.value);
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const elapsed = Date.now() - started;
  return {
    ok: ok.length,
    fail: fail.length,
    elapsed,
    rps: ((ok.length / elapsed) * 1000).toFixed(1),
    p50,
    p95,
    errors: fail.slice(0, 3).map((f) => String(f.reason?.message || f.reason)),
  };
}

async function main() {
  console.log(`load-smoke base=${base} concurrency=${concurrency} rounds=${rounds}`);
  const health = await fetch(`${base}/health`).then((r) => r.json());
  if (health.code !== 0) throw new Error('health failed');
  console.log('health', health.data.infra);

  for (let r = 1; r <= rounds; r += 1) {
    const stat = await round(r);
    console.log(
      `round ${r}: ok=${stat.ok} fail=${stat.fail} rps≈${stat.rps} p50=${stat.p50}ms p95=${stat.p95}ms`,
    );
    if (stat.errors.length) console.log('  sample errors', stat.errors);
  }
  console.log('load-smoke done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
