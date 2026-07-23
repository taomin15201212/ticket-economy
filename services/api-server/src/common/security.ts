/**
 * Security helpers for CORS / trusted proxies (Sprint 8).
 */

export function parseCorsOrigins(
  raw: string | undefined,
): boolean | string | RegExp | (string | RegExp)[] {
  if (!raw || raw.trim() === '' || raw.trim() === '*') {
    // Reflect request origin (dev-friendly). Production should set explicit list.
    return true;
  }
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 1) return list[0];
  return list;
}

/** Basic path denylist for static/public exposure notes */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer-when-downgrade',
};
