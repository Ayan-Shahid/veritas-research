"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureSession } from "@/lib/supabase/session";
import { toAuthUser, type AuthUser } from "@/lib/auth/types";

interface AuthState {
    user: AuthUser;
    isAnonymous: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const supabase = createClient();
        let active = true;
        let hadUser = false;

        // First load: reuse the session in the cookies, or start a guest. State is only set from
        // callbacks, never synchronously in the effect body.
        ensureSession()
            .then((session) => {
                if (!active) return;
                hadUser = true;
                setUser(toAuthUser(session.user));
            })
            .catch(() => {
                if (active) setError("Couldn't start a session");
            });

        // Later changes: token refresh, profile updates, and sign-out in this or another tab.
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
            if (!active) return;
            if (session?.user) {
                hadUser = true;
                setUser(toAuthUser(session.user));
            } else if (event === "SIGNED_OUT" && hadUser) {
                // Signed out (here, in another tab, or the session was revoked): leave, don't
                // silently mint a new guest.
                window.location.assign("/");
            }
        });

        return () => {
            active = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    const value = useMemo<AuthState | null>(() => user && { user, isAnonymous: user.isAnonymous }, [user]);

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center p-8 text-center text-sm text-destructive">
                {error}. Reload the page to try again.
            </div>
        );
    }
    if (!value) {
        return (
            <div className="flex min-h-screen items-center justify-center text-muted-foreground">
                Starting your workspace…
            </div>
        );
    }
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
