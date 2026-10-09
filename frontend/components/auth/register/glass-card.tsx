"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export const GLASS =
    "rounded-xl text-card-foreground backdrop-saturate-150 border border-foreground/5 backdrop-blur-xl bg-gradient-to-br from-card/20 to-card/5 dark:from-card/20 dark:to-background/5 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)]";

/** Frosted-glass card with a soft spotlight that follows the pointer. */
export function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);

    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };

    return (
        <div ref={ref} onPointerMove={onPointerMove} className={cn("group/card relative fx-card-in", GLASS, className)}>
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
                style={{
                    background:
                        "radial-gradient(420px circle at var(--mx, 50%) var(--my, 0%), color-mix(in oklch, var(--primary) 18%, transparent), transparent 65%)",
                }}
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/25"
            />
            <div className="relative z-10">{children}</div>
        </div>
    );
}