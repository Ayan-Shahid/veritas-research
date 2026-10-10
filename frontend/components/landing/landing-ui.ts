import type { CSSProperties } from "react";

/** Frosted panel with one plain border: the `surface` utility in app/globals.css. */
export const GLASS = "surface";

/** style={rise(2)} staggers the fx-rise entrance (defined in globals.css) by 2 × 70ms. */
export const rise = (i: number): CSSProperties => ({ ["--i" as string]: i }) as CSSProperties;