// lib/rateLimit.ts
type RouteKey = 'login' | 'signup';

export const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 5);
export const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);

export class RateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter: number) {
    super('Too many requests');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// naive in-memory sliding window (per process)
const buckets = new Map<string, number[]>();

export function getClientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const ip = xff.split(',')[0]?.trim();
    if (ip) return ip;
  }
  const xrip = req.headers.get('x-real-ip');
  if (xrip) return xrip.trim();
  return '127.0.0.1'; // dev fallback
}

export async function assertRateLimit(route: RouteKey, req: Request) {
  const ip = getClientIp(req) ?? 'unknown';
  const key = `${route}:${ip}`;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const list = buckets.get(key)?.filter(ts => ts > windowStart) ?? [];

  if (list.length >= RATE_LIMIT_MAX) {
  const earliest = typeof list[0] === 'number' ? list[0] : now; // assert for TS
  const retryAfterMs = Math.max(0, earliest + RATE_LIMIT_WINDOW_MS - now);
  const retryAfter = Math.max(1, Math.ceil(retryAfterMs / 1000));
  throw new RateLimitError(retryAfter);
  }

  list.push(now);
  buckets.set(key, list);
}
