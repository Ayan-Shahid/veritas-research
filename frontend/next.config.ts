import type { NextConfig } from "next";

// Development only: supabase-js calls <NEXT_PUBLIC_SUPABASE_URL>/auth/v1/*. With
// NEXT_PUBLIC_SUPABASE_URL=http://localhost:3000 this rewrite hands those requests to the local
// GoTrue container (which serves at its root), so dev is single-origin like production. In
// production Caddy does this routing and the rewrite is not registered.
const authDevUpstream = process.env.NODE_ENV === "production" ? "" : (process.env.AUTH_DEV_UPSTREAM ?? "");

const nextConfig: NextConfig = {
    poweredByHeader: false,
    output: "standalone",
    // Only if you deploy behind a proxy/CDN whose host differs from the Origin the
    // browser sends (Next's Origin vs Host check then rejects actions). Check the
    // serverActions doc for your installed version: older ones nest it under `experimental`.
    // serverActions: { allowedOrigins: ["app.example.com"] },
    async rewrites() {
        if (!authDevUpstream) return [];
        return [{ source: "/auth/v1/:path*", destination: `${authDevUpstream.replace(/\/$/, "")}/:path*` }];
    },
};

export default nextConfig;
