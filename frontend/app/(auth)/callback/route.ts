import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/auth/redirect";

// Handles PKCE `?code=` redirects only. Password reset now uses an emailed code, so no
// one-time token is ever consumed by a plain GET here (email scanners can't burn it).
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = safeRedirectPath(searchParams.get("next")); // never trust `next` raw

    if (code) {
        const supabase = await createServerSupabase();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) return NextResponse.redirect(new URL(next, origin));
    }
    return NextResponse.redirect(new URL("/login", origin));
}