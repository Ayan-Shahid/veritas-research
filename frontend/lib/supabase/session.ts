import type { Session } from "@supabase/supabase-js";
import { createClient } from "./client";

let inflight: Promise<Session> | null = null;

/** Resolves with a session, creating an anonymous one if none exists.
 *  Concurrent callers share one in-flight attempt. */
export function ensureSession(): Promise<Session> {
    if (!inflight) {
        inflight = (async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (session) return session;

            const { data, error } = await supabase.auth.signInAnonymously();
            if (error || !data.session) {
                throw error ?? new Error("Anonymous sign-in returned no session");
            }
            return data.session;
        })().finally(() => {
            inflight = null; // later callers re-check (cheap, local); failures can retry
        });
    }
    return inflight;
}