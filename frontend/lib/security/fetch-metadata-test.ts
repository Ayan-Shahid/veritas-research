import test from "node:test";
import assert from "node:assert/strict";
import { shouldBlockCrossSite as b } from "./fetch-metadata";

const r = (method: string, site: string | null, mode: string | null, dest: string | null) => ({ method, site, mode, dest });

test("same-origin / none / missing headers pass", () => {
    assert.equal(b(r("POST", "same-origin", "cors", "empty")), false);
    assert.equal(b(r("GET", "none", "navigate", "document")), false);
    assert.equal(b(r("GET", null, null, null)), false);
});
test("cross-site link click (top-level GET navigation) passes", () => {
    assert.equal(b(r("GET", "cross-site", "navigate", "document")), false);
});
test("cross-site probes are blocked", () => {
    assert.equal(b(r("GET", "cross-site", "navigate", "iframe")), true);
    assert.equal(b(r("GET", "cross-site", "no-cors", "image")), true);
    assert.equal(b(r("GET", "cross-site", "no-cors", "script")), true);
    assert.equal(b(r("GET", "cross-site", "cors", "empty")), true);
    assert.equal(b(r("POST", "cross-site", "navigate", "document")), true);
});
test("same-site (sibling subdomain) is treated as untrusted", () => {
    assert.equal(b(r("POST", "same-site", "cors", "empty")), true);
});