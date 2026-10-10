import test from "node:test";
import assert from "node:assert/strict";
import { safeRedirectPath, DEFAULT_AFTER_AUTH as D } from "./redirect.ts";

test("allows in-app paths, keeps query", () => {
    assert.equal(safeRedirectPath("/companies"), "/companies");
    assert.equal(safeRedirectPath("/memos/abc-123"), "/memos/abc-123");
    assert.equal(safeRedirectPath("/watchlist?tab=a"), "/watchlist?tab=a");
});
test("rejects absolute / protocol-relative / scheme tricks", () => {
    for (const bad of [
        "https://evil.com", "//evil.com", "///evil.com", "/\\evil.com", "\\\\evil.com",
        "javascript:alert(1)", "/\t/evil.com", "/\n/evil.com", "/ /evil.com",
        "/..//evil.com", "/companies/..//evil.com", "/companies/../..//evil.com",
        "http:evil.com", "data:text/html,x", "", " /companies", "companies",
    ]) assert.equal(safeRedirectPath(bad), D, JSON.stringify(bad));
});
test("rejects non-strings and oversize", () => {
    for (const bad of [undefined, null, 5, {}, ["/companies"]]) assert.equal(safeRedirectPath(bad), D);
    assert.equal(safeRedirectPath("/companies?" + "a".repeat(600)), D);
});
test("allowlist: unknown in-app paths and look-alike prefixes fall back", () => {
    assert.equal(safeRedirectPath("/admin"), D);
    assert.equal(safeRedirectPath("/companiesevil"), D);
    assert.equal(safeRedirectPath("/login"), D);
});
test("encoded slashes stay inside the path (not protocol-relative)", () => {
    assert.equal(safeRedirectPath("/companies/%2F%2Fevil.com"), "/companies/%2F%2Fevil.com");
    assert.equal(safeRedirectPath("/%2F%2Fevil.com"), D);
});