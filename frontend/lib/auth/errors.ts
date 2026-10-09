export type AuthContext =
    | "login"
    | "start-registration"
    | "verify-code"
    | "set-password"
    | "request-reset"
    | "reset-password"
    | "change-password";

/** The two fields we read from a supabase-js AuthError. Never the message. */
export interface AuthErrorLike {
    status?: number;
    code?: string;
}

/** Marker for limits enforced by our own action-level limiter (see rate-limit.ts). */
export const LOCAL_RATE_LIMIT = "LOCAL_RATE_LIMIT";

// GoTrue error codes (internal/api/apierrors/errorcode.go in supabase/auth).
const RATE_LIMIT_CODES = new Set([LOCAL_RATE_LIMIT, "over_request_rate_limit", "over_email_send_rate_limit"]);

const GENERIC: Record<AuthContext, string> = {
    // One message for "no such user" and "wrong password": no account-existence oracle.
    login: "Invalid email or password.",
    "start-registration":
        "We couldn't start verification for that email. If you already have an account, sign in instead.",
    "verify-code": "That code is invalid or has expired. Request a new one and try again.",
    "set-password": "We couldn't save that password. Try a different one.",
    "request-reset": "We couldn't send a reset code right now. Please try again in a few minutes.",
    // The emailed code is single-use, so any failure here means starting over with a fresh code.
    "reset-password":
        "We couldn't reset your password with that code. It may be wrong or expired. Request a new code and try again.",
    "change-password": "We couldn't update your password. Please try again.",
};

/** Reduces a supabase-js AuthError (or anything else) to { status, code }, dropping the message. */
export function toAuthError(e: unknown): AuthErrorLike {
    if (typeof e !== "object" || e === null) return {};
    const o = e as { status?: unknown; code?: unknown };
    return {
        status: typeof o.status === "number" ? o.status : undefined,
        code: typeof o.code === "string" ? o.code : undefined,
    };
}

export function isRateLimited(error: AuthErrorLike): boolean {
    return error.status === 429 || (error.code !== undefined && RATE_LIMIT_CODES.has(error.code));
}

/** Maps an auth error to a fixed, user-safe string. Never echoes error.message. */
export function authErrorMessage(error: AuthErrorLike, ctx: AuthContext): string {
    if (isRateLimited(error)) return "Too many attempts. Please wait a few minutes and try again.";
    if ((ctx === "set-password" || ctx === "change-password" || ctx === "reset-password") && error.code === "same_password") {
        return "Choose a password different from your current one.";
    }
    return GENERIC[ctx];
}

/** GoTrue's answer when GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD rejects a change. */
export function isWrongCurrentPassword(error: AuthErrorLike): boolean {
    return error.code === "current_password_invalid" || error.code === "current_password_required";
}
