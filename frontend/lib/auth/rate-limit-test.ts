import test from "node:test";
import assert from "node:assert/strict";
import { createLimiter, clientIp } from "./rate-limit.ts";

test("allows up to max per window, then blocks with retryAfter", () => {
    let t = 1_000;
    const l = createLimiter({ windowMs: 10_000, max: 3, now: () => t });
    assert.ok(l.hit("a").ok && l.hit("a").ok && l.hit("a").ok);
    t = 4_000;
    const blocked = l.hit("a");
    assert.equal(blocked.ok, false);
    assert.equal(blocked.retryAfterMs, 7_000);
});
test("window resets", () => {
    let t = 0;
    const l = createLimiter({ windowMs: 1_000, max: 1, now: () => t });
    assert.ok(l.hit("k").ok);
    assert.equal(l.hit("k").ok, false);
    t = 1_000;
    assert.ok(l.hit("k").ok);
});
test("keys are independent", () => {
    const l = createLimiter({ windowMs: 1_000, max: 1, now: () => 0 });
    assert.ok(l.hit("a").ok);
    assert.ok(l.hit("b").ok);
    assert.equal(l.hit("a").ok, false);
});
test("unique-key flood is bounded", () => {
    const l = createLimiter({ windowMs: 60_000, max: 1, now: () => 0, maxKeys: 5 });
    for (let i = 0; i < 5; i++) assert.ok(l.hit(`k${i}`).ok);
    assert.equal(l.hit("overflow").ok, false); // refused, map did not grow
    assert.equal(l.hit("k0").ok, false); // existing keys still tracked
});
test("expired keys are swept to make room", () => {
    let t = 0;
    const l = createLimiter({ windowMs: 1_000, max: 1, now: () => t, maxKeys: 2 });
    l.hit("a"); l.hit("b");
    t = 2_000;
    assert.ok(l.hit("c").ok);
});
test("clientIp prefers cf-connecting-ip, then first x-forwarded-for", () => {
    const mk = (o: Record<string, string>) => ({ get: (n: string) => o[n] ?? null });
    assert.equal(clientIp(mk({ "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" })), "1.2.3.4");
    assert.equal(clientIp(mk({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" })), "5.6.7.8");
    assert.equal(clientIp(mk({})), "unknown");
});