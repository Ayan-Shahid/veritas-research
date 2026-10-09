import "server-only";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { authOrigin, supabaseConfig, cookieOptions, cookieAttributes } from "./config";
import { clientIp } from "@/lib/auth/rate-limit";

/**
 * Where this server reaches GoTrue. In production SUPABASE_INTERNAL_URL=http://caddy, so server
 * actions talk to the auth server over the private Docker network instead of leaving the machine
 * and coming back in through Cloudflare. Unset in development: the public URL is used.
 */
function serverAuthUrl(): string {
    const internal = process.env.SUPABASE_INTERNAL_URL;
    return internal ? authOrigin(internal, "SUPABASE_INTERNAL_URL") : supabaseConfig.url;
}

/**
 * GoTrue keys its per-IP limits on GOTRUE_RATE_LIMIT_HEADER (CF-Connecting-IP). Requests from this
 * server would otherwise all look like one client (or, with no header, not be limited at all), so
 * pass the visitor's address along. Safe because the site is only reachable through Cloudflare,
 * which overwrites CF-Connecting-IP on every incoming request.
 */
async function forwardedHeaders(): Promise<Record<string, string>> {
    const ip = clientIp(await headers());
    return ip === "unknown" ? {} : { "CF-Connecting-IP": ip };
}

/** For Server Actions and Route Handlers only: setAll throws while rendering a Server Component. */
export async function createServerSupabase() {
    const cookieStore = await cookies();
    return createServerClient(serverAuthUrl(), supabaseConfig.key, {
        cookieOptions,
        global: { headers: await forwardedHeaders() },
        cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: (list) => {
                for (const { name, value, options } of list) {
                    cookieStore.set(name, value, { ...options, ...cookieAttributes });
                }
            },
        },
    });
}

/**
 * Checks a password by signing in with a throwaway client that stores nothing, then ending
 * only that throwaway session. Needed because GoTrue's own current-password check
 * (GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD) is skipped for sessions that
 * started from an emailed code (GoTrue treats those like a recovery), which is exactly how a
 * newly registered user is signed in.
 */
export async function verifyPassword(
    email: string,
    password: string,
): Promise<{ ok: true } | { ok: false; error: { status?: number; code?: string } }> {
    const sb = createClient(serverAuthUrl(), supabaseConfig.key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: await forwardedHeaders() },
    });
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: { status: error.status, code: error.code } };
    // scope "local" is essential: the default ("global") would end the user's real sessions too.
    await sb.auth.signOut({ scope: "local" });
    return { ok: true };
}
