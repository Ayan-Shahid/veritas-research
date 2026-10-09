import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig, cookieOptions } from "./config";

let client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
    if (!client) {
        client = createBrowserClient(supabaseConfig.url, supabaseConfig.key, { cookieOptions });
    }
    return client;
}