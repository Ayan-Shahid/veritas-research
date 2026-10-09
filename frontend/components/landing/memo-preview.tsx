"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PREVIEW } from "./content";
import { GLASS } from "./landing-ui";

const CYCLE_MS = 3600;

/** Placeholder lines only: bars stand in for text so nothing here can be mistaken for real output. */
function Lines({ widths, tone }: { widths: readonly number[]; tone: "active" | "idle" }) {
    return (
        <div className="flex flex-col gap-2" aria-hidden>
            {widths.map((w, i) => (
                <div
                    key={i}
                    style={{ width: `${w}%` }}
                    className={cn(
                        "h-2.5 rounded-full transition-colors duration-500",
                        tone === "active" ? "bg-primary/25" : "bg-foreground/10",
                    )}
                />
            ))}
        </div>
    );
}

export function MemoPreview() {
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);
    const current = PREVIEW.claims[active];

    useEffect(() => {
        if (paused) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const id = window.setInterval(() => setActive((i) => (i + 1) % PREVIEW.claims.length), CYCLE_MS);
        return () => window.clearInterval(id);
    }, [paused]);

    return (
        <figure className="flex flex-col gap-3">
            <div
                className={cn(GLASS, "overflow-hidden")}
                onPointerEnter={() => setPaused(true)}
                onPointerLeave={() => setPaused(false)}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
            >
                {/* window chrome */}
                <div className="flex items-center justify-between border-b border-foreground/5 px-4 py-3">
                    <div className="flex gap-1.5" aria-hidden>
                        <span className="size-2.5 rounded-full bg-foreground/15" />
                        <span className="size-2.5 rounded-full bg-foreground/15" />
                        <span className="size-2.5 rounded-full bg-foreground/15" />
                    </div>
                    <span className="rounded-full border border-foreground/10 bg-foreground/5 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Draft
                    </span>
                </div>

                <div className="grid sm:grid-cols-[1.1fr_1fr]">
                    {/* memo pane */}
                    <div className="flex flex-col gap-5 p-5">
                        {PREVIEW.claims.map((claim, i) => {
                            const isActive = i === active;
                            return (
                                <div key={claim.section} className="flex flex-col gap-2.5">
                                    <span
                                        className={cn(
                                            "font-mono text-[10px] font-bold uppercase tracking-widest transition-colors duration-500",
                                            isActive ? "text-primary" : "text-muted-foreground",
                                        )}
                                    >
                                        {claim.section}
                                    </span>
                                    <Lines widths={claim.widths} tone={isActive ? "active" : "idle"} />
                                    <button
                                        type="button"
                                        onClick={() => setActive(i)}
                                        onFocus={() => setActive(i)}
                                        aria-pressed={isActive}
                                        aria-label={`Show the source excerpt for ${claim.section}`}
                                        className={cn(
                                            "w-fit rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                            isActive
                                                ? "scale-105 border-primary/50 bg-primary/15 text-primary shadow-[0_6px_16px_-8px_var(--primary)]"
                                                : "border-foreground/10 bg-foreground/5 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                                        )}
                                    >
                                        [{claim.chip}]
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* source pane */}
                    <div className="flex flex-col gap-4 border-t border-foreground/5 bg-foreground/[0.02] p-5 sm:border-l sm:border-t-0">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Source excerpt
                        </span>
                        <div key={active} className="fx-rise flex flex-col gap-4" aria-live="polite">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                                    10-K
                                </span>
                                <span className="rounded-md border border-foreground/10 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                                    {current.item}
                                </span>
                            </div>
                            <div className="flex flex-col gap-2" aria-hidden>
                                <div className="h-2.5 w-full rounded-full bg-foreground/10" />
                                <div className="h-2.5 w-[92%] rounded-full bg-primary/25" />
                                <div className="h-2.5 w-[84%] rounded-full bg-primary/25" />
                                <div className="h-2.5 w-full rounded-full bg-foreground/10" />
                                <div className="h-2.5 w-[70%] rounded-full bg-foreground/10" />
                            </div>
                            <span className="w-fit font-mono text-[11px] font-semibold text-primary">View on EDGAR ↗</span>
                        </div>
                    </div>
                </div>
            </div>
            <figcaption className="text-center text-xs text-muted-foreground">{PREVIEW.caption}</figcaption>
        </figure>
    );
}