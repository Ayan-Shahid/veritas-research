import { isAuthApiError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { ensureSession } from "@/lib/supabase/session";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetcher<T>(endpoint: string, init?: RequestInit): Promise<T> {
    // The API authenticates the GoTrue access token (a JWT) sent as a Bearer header. Being a
    // header, not a cookie, it is never attached to cross-site requests, so there is nothing to CSRF.
    const send = (token: string) =>
        fetch(`${BASE_URL}${endpoint}`, {
            ...init,
            headers: { "Content-Type": "application/json", ...init?.headers, Authorization: `Bearer ${token}` },
        });

    // getSession() inside ensureSession() refreshes an expired access token first.
    let res = await send((await ensureSession()).access_token);

    if (res.status === 401) {
        // Rejected: refresh once and retry. If GoTrue refuses the refresh (an API error, not a
        // network blip or a race with another tab), the session was revoked elsewhere (sign-out,
        // password change). supabase-js keeps such a session until its access token expires, so
        // end it here; AuthProvider then sees SIGNED_OUT and takes the user out of the app.
        const supabase = createClient();
        const { data, error } = await supabase.auth.refreshSession();
        if (data.session) {
            res = await send(data.session.access_token);
        } else if (isAuthApiError(error)) {
            await supabase.auth.signOut({ scope: "local" });
        }
    }

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || `API error: ${res.status}`);
    }
    return res.json();
}
