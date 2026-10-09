import "server-only";

export function siteUrl(): string {
    const prod = process.env.NODE_ENV === "production";
    const raw = process.env.NEXT_PUBLIC_SITE_URL ?? (prod ? "" : "http://localhost:3000");
    if (!raw) throw new Error("NEXT_PUBLIC_SITE_URL must be set in production");
    const url = new URL(raw);
    if (prod && url.protocol !== "https:") throw new Error("NEXT_PUBLIC_SITE_URL must be https in production");
    return url.origin;
}