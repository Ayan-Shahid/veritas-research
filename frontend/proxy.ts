import { NextResponse, type NextRequest } from "next/server";
import { shouldBlockCrossSite } from "@/lib/security/fetch-metadata";

const isProd = process.env.NODE_ENV === "production";

function originOf(value: string | undefined): string {
    try {
        return value ? new URL(value).origin : "";
    } catch {
        return "";
    }
}
const API_ORIGIN = originOf(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");
// Normally the page's own origin (Caddy or the dev rewrite forwards /auth/v1 to GoTrue).
const AUTH_ORIGIN = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);

// Set CSP_REPORT_ONLY=1 for the first deploy: violations show in the browser console
// without breaking anything. Remove it once the console is clean.
const RESPONSE_CSP_HEADER =
    process.env.CSP_REPORT_ONLY === "1" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/settings"];

function buildCsp(nonce: string): string {
    return [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProd ? "" : " 'unsafe-eval'"}`,
        // 'unsafe-inline' stays for styles: SSR'd style="" attributes can't carry a nonce.
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data:",
        "font-src 'self'",
        ["connect-src 'self'", API_ORIGIN, AUTH_ORIGIN, isProd ? "" : "ws: wss:"].filter(Boolean).join(" "),
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        ...(isProd ? ["upgrade-insecure-requests"] : []),
    ].join("; ");
}

export function proxy(request: NextRequest) {
    // XS-Leaks / CSRF defence in depth: refuse cross-site subresource, frame and POST requests.
    if (
        shouldBlockCrossSite({
            method: request.method,
            site: request.headers.get("sec-fetch-site"),
            mode: request.headers.get("sec-fetch-mode"),
            dest: request.headers.get("sec-fetch-dest"),
        })
    ) {
        return new NextResponse("Forbidden", { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    const csp = buildCsp(nonce);

    // The request header is how Next finds the nonce and applies it to its own scripts.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set(RESPONSE_CSP_HEADER, csp);
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    if (isProd) response.headers.set("Strict-Transport-Security", "max-age=31536000");

    if (AUTH_PATHS.some((p) => request.nextUrl.pathname === p)) {
        response.headers.set("Cache-Control", "no-store"); // no cache-probing of auth pages
        response.headers.set("Referrer-Policy", "no-referrer");
    }
    return response;
}

export const config = {
    matcher: [
        {
            source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
            missing: [
                { type: "header", key: "next-router-prefetch" },
                { type: "header", key: "purpose", value: "prefetch" },
            ],
        },
    ],
};