// Pure, in-memory fixed-window limiter. No imports, so it runs under `node --test`.
//
// Why this exists: GoTrue only limits per IP (plus a global emails-per-hour cap), so the server
// actions add per-address, per-user and daily caps on top. State lives in this process (we run
// one `web` container), so a restart resets the counters - fine for 1-2 testers.

export interface LimitResult {
    ok: boolean;
    /** Milliseconds until the window resets (0 when ok). */
    retryAfterMs: number;
}

export interface Limiter {
    hit(key: string): LimitResult;
}

export function createLimiter(opts: {
    windowMs: number;
    max: number;
    now?: () => number;
    maxKeys?: number;
}): Limiter {
    const { windowMs, max } = opts;
    const now = opts.now ?? Date.now;
    const maxKeys = opts.maxKeys ?? 10_000;
    const buckets = new Map<string, { start: number; count: number }>();

    function sweep(t: number) {
        for (const [k, b] of buckets) if (t - b.start >= windowMs) buckets.delete(k);
    }

    return {
        hit(key) {
            const t = now();
            let b = buckets.get(key);
            if (!b || t - b.start >= windowMs) {
                if (buckets.size >= maxKeys) sweep(t);
                // Still full of live keys (a flood of unique keys): refuse rather than grow without bound.
                if (buckets.size >= maxKeys) return { ok: false, retryAfterMs: windowMs };
                b = { start: t, count: 0 };
                buckets.set(key, b);
            }
            if (b.count >= max) return { ok: false, retryAfterMs: Math.max(0, b.start + windowMs - t) };
            b.count += 1;
            return { ok: true, retryAfterMs: 0 };
        },
    };
}

/** Best-effort client IP. Only meaningful because the origin is reachable solely through
 *  Cloudflare, which sets CF-Connecting-IP and overwrites any client-supplied value. */
export function clientIp(headers: { get(name: string): string | null }): string {
    const cf = headers.get("cf-connecting-ip")?.trim();
    if (cf) return cf;
    const xff = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    return xff || "unknown";
}