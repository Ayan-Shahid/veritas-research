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
                        "h-2 rounded-xs transition-colors duration-500",
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
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground" aria-hidden>
                        memo.draft
                    </span>
                    <span className="tag rounded-xs px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest [--tag-c:var(--warning)] [--tag-fg:var(--warning-foreground)]">
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
                                            "tag w-fit rounded-xs px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                                            isActive
                                                ? "[--tag-c:var(--primary)] [--tag-fg:var(--primary-foreground)]"
                                                : "[--tag-c:var(--secondary)] [--tag-fg:var(--secondary-foreground)]",
                                        )}
                                    >
                                        [{claim.chip}]
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* source pane */}
                    <div className="flex flex-col gap-4 border-t border-border bg-foreground/[0.02] p-5 sm:border-l sm:border-t-0">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Source excerpt
                        </span>
                        <div key={active} className="fx-rise flex flex-col gap-4" aria-live="polite">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="tag rounded-xs px-2 py-0.5 font-mono text-[11px] font-semibold [--tag-c:var(--primary)] [--tag-fg:var(--primary-foreground)]">
                                    10-K
                                </span>
                                <span className="tag rounded-xs px-2 py-0.5 font-mono text-[11px] [--tag-c:var(--secondary)] [--tag-fg:var(--secondary-foreground)]">
                                    {current.item}
                                </span>
                            </div>
                            <div className="flex flex-col gap-2" aria-hidden>
                                <div className="h-2 w-full rounded-xs bg-foreground/10" />
                                <div className="h-2 w-[92%] rounded-xs bg-primary/25" />
                                <div className="h-2 w-[84%] rounded-xs bg-primary/25" />
                                <div className="h-2 w-full rounded-xs bg-foreground/10" />
                                <div className="h-2 w-[70%] rounded-xs bg-foreground/10" />
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