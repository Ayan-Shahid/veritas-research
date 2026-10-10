"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepDef {
    id: string;
    label: string;
    icon: LucideIcon;
}

function CheckDraw() {
    return (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} className="fx-draw" />
        </svg>
    );
}

/** Slim gradient bar pinned to the top edge of the card. `current === total` means finished. */
export function ProgressEdge({ total, current }: { total: number; current: number }) {
    const fraction = Math.min(current + 1, total) / total;
    return (
        <div
            role="progressbar"
            aria-label="Registration progress"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={Math.min(current, total)}
            className="absolute inset-x-0 top-0 h-[3px] overflow-hidden rounded-t-xs bg-foreground/5"
        >
            <div
                className="relative h-full origin-left overflow-hidden bg-primary transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                style={{ transform: `scaleX(${fraction})` }}
            >
            </div>
        </div>
    );
}

/** Numbered nodes joined by connectors that fill as you advance. */
export function Stepper({ steps, current }: { steps: readonly StepDef[]; current: number }) {
    return (
        <ol aria-label="Steps" className="flex items-start">
            {steps.map((step, i) => {
                const state = i < current ? "complete" : i === current ? "active" : "upcoming";
                const Icon = step.icon;
                const isLast = i === steps.length - 1;
                return (
                    <li key={step.id} aria-current={state === "active" ? "step" : undefined} className={cn("flex items-start", !isLast && "flex-1")}>
                        <div className="flex w-14 flex-col items-center gap-2">
                            <div className="relative grid size-9 place-items-center">
                                <span
                                    className={cn(
                                        "relative grid size-9 place-items-center rounded-xs border transition-colors duration-500",
                                        state === "complete" && "tag [--tag-c:var(--primary)] [--tag-fg:var(--primary-foreground)]",
                                        state === "active" && "border-primary bg-background text-primary",
                                        state === "upcoming" && "border-border bg-background/60 text-muted-foreground",
                                    )}
                                >
                                    {state === "complete" ? <CheckDraw /> : <Icon className="size-4" />}
                                </span>
                            </div>
                            <span
                                className={cn(
                                    "text-[11px] font-medium tracking-wide transition-colors duration-500",
                                    state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                                )}
                            >
                                {step.label}
                                <span className="sr-only">{state === "complete" ? " (completed)" : state === "active" ? " (current step)" : ""}</span>
                            </span>
                        </div>
                        {!isLast && (
                            <div aria-hidden className="mx-1 mt-[17px] h-px flex-1 overflow-hidden bg-border">
                                <div
                                    className={cn(
                                        "h-full origin-left bg-primary transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                                        i < current ? "scale-x-100" : "scale-x-0",
                                    )}
                                />
                            </div>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}