import test from "node:test";
import assert from "node:assert/strict";
import { authErrorMessage, toAuthError, isRateLimited, isWrongCurrentPassword, LOCAL_RATE_LIMIT } from "./errors.ts";

test("toAuthError reads the supabase-js AuthError shape and never keeps the message", () => {
    const e = Object.assign(new Error("secret internal text"), { status: 400, code: "otp_expired" });
    assert.deepEqual(toAuthError(e), { status: 400, code: "otp_expired" });
    assert.deepEqual(toAuthError("nope"), {});
    assert.deepEqual(toAuthError(null), {});
    assert.deepEqual(toAuthError({ status: "400", code: 7 }), { status: undefined, code: undefined });
});
test("rate limits: HTTP 429, GoTrue's codes and our local marker", () => {
    assert.ok(isRateLimited({ status: 429 }));
    assert.ok(isRateLimited({ code: LOCAL_RATE_LIMIT }));
    assert.ok(isRateLimited({ status: 400, code: "over_email_send_rate_limit" }));
    assert.ok(isRateLimited({ code: "over_request_rate_limit" }));
    assert.equal(isRateLimited({ status: 400 }), false);
    assert.equal(isRateLimited({ code: "otp_expired" }), false);
    assert.match(authErrorMessage({ code: LOCAL_RATE_LIMIT }, "login"), /Too many attempts/);
});
test("login failures are one generic message (no account oracle)", () => {
    for (const code of ["invalid_credentials", "user_not_found", "email_not_confirmed", undefined])
        assert.equal(authErrorMessage({ status: 400, code }, "login"), "Invalid email or password.");
});
test("an existing address gets the same message as any other registration failure", () => {
    assert.equal(
        authErrorMessage({ status: 422, code: "email_exists" }, "start-registration"),
        authErrorMessage({}, "start-registration"),
    );
});
test("same_password gets a specific hint only where a password is being set", () => {
    assert.match(authErrorMessage({ code: "same_password" }, "change-password"), /different from your current/);
    assert.match(authErrorMessage({ code: "same_password" }, "reset-password"), /different from your current/);
    assert.equal(authErrorMessage({ code: "same_password" }, "login"), "Invalid email or password.");
});
test("wrong current password detection", () => {
    assert.ok(isWrongCurrentPassword({ code: "current_password_invalid" }));
    assert.ok(isWrongCurrentPassword({ code: "current_password_required" }));
    assert.equal(isWrongCurrentPassword({ code: "invalid_credentials" }), false);
});
