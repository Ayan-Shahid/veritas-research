import test from "node:test";
import assert from "node:assert/strict";
import { safeExternalUrl as s } from "./safe-url.ts";

test("accepts plain https URLs", () => {
    assert.equal(s("https://github.com/someone/veritas-research"), "https://github.com/someone/veritas-research");
    assert.equal(s("  https://github.com/x/y  "), "https://github.com/x/y");
});
test("rejects everything else", () => {
    for (const bad of [
        undefined, null, "", "   ", "github.com/x/y", "http://github.com/x/y", "javascript:alert(1)",
        "JAVASCRIPT:alert(1)", "data:text/html,<script>alert(1)</script>", "//evil.com", "ftp://x.com",
        "https://user:pass@github.com/x/y", "https://", "not a url",
    ]) assert.equal(s(bad as string | undefined | null), null, JSON.stringify(bad));
});