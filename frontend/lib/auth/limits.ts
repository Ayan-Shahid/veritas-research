import { createLimiter, type Limiter } from "@/lib/auth/rate-limit";

const MIN = 60_000;

// One instance per process. GoTrue limits per IP (and caps emails per hour); these add
// per-address, per-user and daily caps that it does not have. See rate-limit.ts.
export const limiters = {
    login: createLimiter({ windowMs: 15 * MIN, max: 10 }), // per ip+email
    loginIp: createLimiter({ windowMs: 15 * MIN, max: 40 }), // per ip
    otpEmail: createLimiter({ windowMs: 10 * MIN, max: 3 }), // codes per address
    otpIp: createLimiter({ windowMs: 60 * MIN, max: 10 }), // codes per ip
    // Resend's free tier is 100 emails/day; stop well short so nobody can burn the whole quota.
    otpGlobal: createLimiter({ windowMs: 24 * 60 * MIN, max: 80 }),
    verify: createLimiter({ windowMs: 10 * MIN, max: 10 }), // code guesses per ip+email
    password: createLimiter({ windowMs: 15 * MIN, max: 5 }), // change-password per user
};

/** True when any check is over its limit. Every limiter is hit (no short-circuit) so counters stay honest. */
export function anyLimited(checks: ReadonlyArray<readonly [Limiter, string]>): boolean {
    let limited = false;
    for (const [limiter, key] of checks) if (!limiter.hit(key).ok) limited = true;
    return limited;
}

export const normEmail = (e: string) => e.trim().toLowerCase();