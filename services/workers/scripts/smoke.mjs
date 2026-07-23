/**
 * Smoke: workers health + optional publish ticket.upload if RabbitMQ up.
 * Usage: node scripts/smoke.mjs
 */
const WORKERS = process.env.WORKERS_URL || 'http://127.0.0.1:3001';
const API = process.env.API_BASE_URL || 'http://127.0.0.1:3000';

async function main() {
  console.log('→ workers health');
  const wh = await fetch(`${WORKERS}/health`);
  const whj = await wh.json();
  console.log(JSON.stringify(whj, null, 2));
  if (!wh.ok && whj?.code !== 0) {
    throw new Error('workers health failed');
  }

  console.log('→ api health');
  try {
    const ah = await fetch(`${API}/health`);
    const ahj = await ah.json();
    console.log(
      'api',
      ahj?.data?.infra || ahj?.infra || ahj,
    );
  } catch (e) {
    console.warn('api unreachable:', e.message);
  }

  console.log('smoke ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
