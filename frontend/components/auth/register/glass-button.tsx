"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GlassButtonProps = React.ComponentProps<typeof Button> & {
    /** Submitting: shows the spinner layer. */
    loading?: boolean;
    loadingText?: string;
    /** Finished: shows the check layer, and the mesh sweeps once. */
    success?: boolean;
    successText?: string;
    showArrow?: boolean;
};

type State = "idle" | "loading" | "success";

/** One layer of the button's content. All three are stacked in one grid cell and cross-fade. */
function Layer({ active, children }: { active: boolean; children: React.ReactNode }) {
    return (
        <span
            aria-hidden={!active}
            className={cn(
                "col-start-1 row-start-1 flex items-center justify-center gap-2 transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                active ? "translate-y-0 scale-100 opacity-100 blur-0" : "pointer-events-none translate-y-2 scale-95 opacity-0 blur-[2px]",
            )}
        >
            {children}
        </span>
    );
}

export function GlassButton({
                                children,
                                loading,
                                loadingText = "Working…",
                                success,
                                successText = "Done",
                                showArrow,
                                className,
                                ...props
                            }: GlassButtonProps) {
    const state: State = success ? "success" : loading ? "loading" : "idle";

    return (
        <Button
            size="lg"
            data-state={state}
            aria-busy={state === "loading" || undefined}
            // Not `disabled`: that would desaturate the button mid-flight. Clicks are blocked instead,
            // and use-server-action ignores a submit that arrives while one is pending.
            className={cn("group/btn w-full data-[state=loading]:pointer-events-none data-[state=success]:pointer-events-none", className)}
            {...props}
        >
            <span className="grid place-items-center">
                <Layer active={state === "idle"}>
                    {children}
                    {showArrow && <ArrowRight className="transition-transform duration-300 group-hover/btn:translate-x-1" />}
                </Layer>
                <Layer active={state === "loading"}>
                    <Loader2 className="animate-spin" />
                    {loadingText}
                </Layer>
                <Layer active={state === "success"}>
                    <svg viewBox="0 0 24 24" className="size-[1.15rem]" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        {/* keyed so the check redraws every time the success layer becomes active */}
                        <path key={state === "success" ? "on" : "off"} d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} className={state === "success" ? "fx-draw" : undefined} />
                    </svg>
                    {successText}
                </Layer>
            </span>
            <span className="sr-only" role="status">
                {state === "loading" ? loadingText : state === "success" ? successText : ""}
            </span>
        </Button>
    );
}