interface RateLimitOptions {
  /** Cooldown window in milliseconds (default: 30_000 = 30s) */
  windowMs?: number;
  /** Build a key from the request context. Return null to skip limiting. */
  key: (ctx: { ip: string; params: Record<string, string> }) => string | null;
}

/**
 * In-memory per-key cooldown rate limiter.
 * Returns a `beforeHandle` function to attach directly to a single route.
 */
export const rateLimit = ({ windowMs = 30_000, key }: RateLimitOptions) => {
  const timestamps = new Map<string, number>();

  // Prune stale entries every 60s to prevent memory leaks
  const pruneInterval = setInterval(() => {
    const now = Date.now();
    for (const [k, ts] of timestamps) {
      if (now - ts > windowMs) timestamps.delete(k);
    }
  }, 60_000);

  // Allow GC if the server is torn down
  if (typeof pruneInterval === 'object' && 'unref' in pruneInterval) {
    pruneInterval.unref();
  }

  return ({ server, request, status, params }: any) => {
    const ip =
      server?.requestIP(request)?.address ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown';

    const k = key({ ip, params: params ?? {} });
    if (!k) return; // skip limiting

    const now = Date.now();
    const last = timestamps.get(k);

    if (last && now - last < windowMs) {
      const retryAfter = Math.ceil((windowMs - (now - last)) / 1000);
      return status(429, {
        error: 'Too many requests. Please try again later.',
        retryAfterSeconds: retryAfter,
      });
    }

    timestamps.set(k, now);
  };
};
