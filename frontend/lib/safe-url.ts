/**
 * Returns a normalised https URL string, or null. Used for values that come from env vars
 * and end up in an href: only https is allowed, so a typo (or a hostile value) can never
 * become a javascript: or data: link, and credentials in the URL are rejected.
 */
export function safeExternalUrl(raw: string | undefined | null): string | null {
    if (!raw) return null;
    let url: URL;
    try {
        url = new URL(raw.trim());
    } catch {
        return null;
    }
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.toString();
}