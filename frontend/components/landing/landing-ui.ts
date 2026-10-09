import type { CSSProperties } from "react";

/** Same frosted-glass recipe used by the dashboard, auth pages and cards. */
export const GLASS =
    "rounded-2xl text-card-foreground backdrop-saturate-150 border border-foreground/5 backdrop-blur-xl bg-gradient-to-br from-card/20 to-card/5 dark:from-card/20 dark:to-background/5 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)]";

/** style={rise(2)} staggers the fx-rise entrance (defined in globals.css) by 2 × 70ms. */
export const rise = (i: number): CSSProperties => ({ ["--i" as string]: i }) as CSSProperties;