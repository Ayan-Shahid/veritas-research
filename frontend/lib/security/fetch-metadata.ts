// Resource-isolation policy based on Fetch Metadata request headers (Sec-Fetch-*),
// which browsers set and page scripts cannot forge.

export interface FetchMetadata {
    method: string;
    site: string | null; // Sec-Fetch-Site
    mode: string | null; // Sec-Fetch-Mode
    dest: string | null; // Sec-Fetch-Dest
}

/**
 * True when the request should be refused.
 *  - Same-origin and user-initiated ("none") requests pass.
 *  - Requests with no Sec-Fetch-Site (old browsers, curl) pass: we can't tell them
 *    apart, and Next's Origin/Host check still guards actions.
 *  - Cross-site AND same-site (a sibling subdomain isn't trusted either) pass only as
 *    a top-level GET navigation, i.e. an ordinary link click. Everything else (fetch,
 *    <img>, <script>, <iframe>, form POST) is refused, which closes the request-based
 *    XS-Leak probes (timing, error events, cache probing, frame counting).
 */
export function shouldBlockCrossSite(m: FetchMetadata): boolean {
    if (!m.site || m.site === "same-origin" || m.site === "none") return false;
    const topLevelNav = m.method === "GET" && m.mode === "navigate" && m.dest === "document";
    return !topLevelNav;
}