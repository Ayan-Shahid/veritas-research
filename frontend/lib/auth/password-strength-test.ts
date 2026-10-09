import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePassword as ev } from "./password-strength.ts";

test("empty and short passwords", () => {
    assert.equal(ev("").score, 0);
    assert.equal(ev("").label, "");
    assert.equal(ev("short1!").score, 1);
    assert.equal(ev("short1!").label, "Too short");
    assert.equal(ev("elevenchars").score, 1); // 11 chars: still below the 12 minimum
});
test("the length rule flips exactly at 12", () => {
    assert.equal(ev("a".repeat(11)).rules[0].passed, false);
    assert.equal(ev("abcdefghijkl").rules[0].passed, true);
    assert.ok(ev("Mn7qLw2xZp4k").score >= 2);
});
test("mixed 12-char password with 4 classes is Good, long mixed is Strong", () => {
    assert.equal(ev("Xk9#mP2$vL5!").score, 3);
    assert.equal(ev("Tr1cky-Lorry-Orange-9").score, 4);
});
test("long single-class passphrase is Good, not Strong", () => {
    assert.equal(ev("correct horse battery staple").score, 3); // lower + space only
});
test("weak patterns are capped at Fair", () => {
    for (const bad of ["aaaaaaaaaaaaaaaa", "ababababababab", "Password123456!", "qwertyuiop123!A", "Xk9#mP2$vL5!111111"]) {
        const r = ev(bad);
        assert.equal(r.weakPattern, true, bad);
        assert.ok(r.score <= 2, `${bad} -> ${r.score}`);
    }
});
test("rules reflect character classes", () => {
    const r = ev("Abc123!@#xyz");
    const byId = Object.fromEntries(r.rules.map((x) => [x.id, x.passed]));
    assert.deepEqual(byId, { length: true, case: true, number: true, symbol: true });
    assert.equal(ev("alllowercaseonly").rules.find((x) => x.id === "case")?.passed, false);
});
test("only the length rule is required", () => {
    assert.deepEqual(ev("x").rules.filter((r) => r.required).map((r) => r.id), ["length"]);
});