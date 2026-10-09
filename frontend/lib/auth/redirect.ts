// Deliberately NOT a "use server" file: everything exported from a "use server"
// module becomes a publicly callable POST endpoint. Keep helpers out of there.

export const DEFAULT_AFTER_AUTH = "/companies";

/** Same-origin app areas a login may send the user back to. */
const ALLOWED_PREFIXES = ["/companies", "/watchlist", "/memos", "/organizations", "/settings"] as const;

const MAX_LENGTH = 512;
// Control chars, whitespace and backslash. Browsers strip \t \r \n inside URLs and
// treat "\" like "/", so "/\t/evil.com" or "/\evil.com" can become "//evil.com".
const FORBIDDEN = /[\u0000-\u0020\u007f\\]/;

/**
 * Returns a safe same-origin path (pathname + search) or the fallback.
 * Input is attacker-controlled (query string / hidden form field).
 */
export function safeRedirectPath(input: unknown, fallback: string = DEFAULT_AFTER_AUTH): string {
    if (typeof input !== "string" || input.length === 0 || input.length > MAX_LENGTH) return fallback;
    if (!input.startsWith("/") || input.startsWith("//") || FORBIDDEN.test(input)) return fallback;

    let url: URL;
    try {
        url = new URL(input, "http://app.invalid");
    } catch {
        return fallback;
    }
    // Same-origin after parsing, AND no protocol-relative result after dot-segment
    // normalisation ("/..//evil.com" normalises to "//evil.com").
    if (url.origin !== "http://app.invalid" || url.pathname.startsWith("//")) return fallback;

    const allowed = ALLOWED_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`));
    return allowed ? url.pathname + url.search : fallback;
}