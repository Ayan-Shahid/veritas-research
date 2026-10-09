"use client";

import {Check} from "lucide-react";
import {cn} from "@/lib/utils";
import {evaluatePassword} from "@/lib/auth/password-strength";

const SEGMENT_COLORS = ["", "bg-red-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500"] as const;
const LABEL_COLORS = ["text-muted-foreground", "text-red-500", "text-amber-500", "text-lime-600 dark:text-lime-400", "text-emerald-500"] as const;

export function PasswordStrengthMeter({password}: { password: string }) {
    const {score, label, rules, weakPattern} = evaluatePassword(password);

    return (
        <div className="flex flex-col gap-3" aria-live="polite">
            <div className="flex items-center gap-3">
                <div className="flex flex-1 gap-1.5" aria-hidden>
                    {[1, 2, 3, 4].map((segment) => {
                        const filled = score >= segment;
                        return (
                            <div key={segment} className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
                                <div
                                    className={cn(
                                        "h-full origin-left rounded-full transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                                        filled ? cn("scale-x-100", SEGMENT_COLORS[score]) : "scale-x-0",
                                    )}
                                    style={{transitionDelay: filled ? `${segment * 40}ms` : "0ms"}}
                                />
                            </div>
                        );
                    })}
                </div>
                <span className={cn("w-16 text-right text-xs font-medium transition-colors", LABEL_COLORS[score])}>
    {label || "\u00a0"}
    </span>
            </div>

            <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {rules.map((rule) => (
                    <li
                        key={rule.id}
                        className={cn(
                            "flex items-center gap-2 text-xs transition-colors duration-300",
                            rule.passed ? "text-foreground" : "text-muted-foreground",
                        )}
                    >
    <span
        className={cn(
            "grid size-4 shrink-0 place-items-center rounded-full border transition-all duration-300",
            rule.passed ? "scale-110 border-emerald-500 bg-emerald-500 text-white" : "border-foreground/20",
        )}
    >
    {rule.passed && <Check className="fx-pop size-2.5" strokeWidth={4}/>}
    </span>
                        <span>
    {rule.label}
                            {!rule.required && <span className="opacity-60"> · nice to have</span>}
        </span>
                    </li>
                ))}
            </ul>

            {weakPattern && (
                <p className="fx-rise text-xs text-amber-600 dark:text-amber-400">
                    Avoid repeated characters and common words like &quot;password&quot;.
                </p>
            )}
        </div>
    );
}