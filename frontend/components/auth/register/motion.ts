import type { CSSProperties } from "react";

/** Must match the fx-step-out-* duration in globals.css (180ms). */
export const EXIT_MS = 180;
/** UI cooldown between resends (Supabase enforces its own limit too). */
export const RESEND_COOLDOWN_MS = 30_000;
/** Digits in the emailed code. Must match GOTRUE_MAILER_OTP_LENGTH (GoTrue allows 6-10). */
export const OTP_LENGTH = Math.min(10, Math.max(6, Math.trunc(Number(process.env.NEXT_PUBLIC_OTP_LENGTH ?? 6)) || 6));

/** style={stagger(2)} → animation-delay of 2 × 70ms via the fx-rise utility. */
export const stagger = (i: number): CSSProperties => ({ ["--i" as string]: i }) as CSSProperties;

export type Phase = "in" | "out";
export type Direction = 1 | -1;

export function panelClass(phase: Phase, direction: Direction): string {
    if (phase === "out") {
        return direction === 1 ? "fx-step-out-fwd pointer-events-none" : "fx-step-out-back pointer-events-none";
    }
    return direction === 1 ? "fx-step-in-fwd" : "fx-step-in-back";
}