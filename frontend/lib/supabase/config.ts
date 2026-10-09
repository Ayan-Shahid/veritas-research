// Config shared by the browser and server clients for the self-hosted Supabase Auth (GoTrue)
// server. Literal property access is required: Next inlines NEXT_PUBLIC_* at build time.
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Validates an auth base URL and returns its origin (scheme + host + port, nothing else). */
export function authOrigin(raw: string, label: string): string {
    const url = new URL(raw);
    if (url.username || url.password) throw new Error(`${label} must not contain credentials`);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error(`${label} must be http(s)`);
    return url.origin;
}

function validate() {
    if (!rawUrl || !rawKey) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    }
    const origin = authOrigin(rawUrl, "NEXT_PUBLIC_SUPABASE_URL");
    if (origin.startsWith("http:") && process.env.NODE_ENV === "production") {
        throw new Error("NEXT_PUBLIC_SUPABASE_URL must be https in production");
    }
    // supabase-js calls <origin>/auth/v1/...; Caddy (production) or a Next rewrite (development)
    // forwards that prefix to GoTrue.
    return { url: origin, key: rawKey };
}

export const supabaseConfig = validate();

/** Cookie attributes we enforce on every auth cookie we write. */
export const cookieAttributes = {
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
};

export const cookieOptions = {
    // Fixed cookie name. supabase-js would otherwise derive it from the URL's hostname, and the
    // server reaches GoTrue on a different (internal) hostname than the browser does, so the two
    // would read and write different cookies.
    name: "sb-veritas-auth-token",
    ...cookieAttributes,
};
