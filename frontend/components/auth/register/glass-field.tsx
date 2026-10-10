"use client";

import { Check, Eye, EyeOff, type LucideIcon } from "lucide-react";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";
import { cn } from "@/lib/utils";

interface GlassFieldProps {
    id: string;
    label: string;
    icon: LucideIcon;
    type?: "text" | "email" | "password";
    autoComplete?: string;
    placeholder?: string;
    error?: FieldError;
    registration: UseFormRegisterReturn;
    /** Shows an animated check when true (and there is no error). */
    valid?: boolean;
    /** Password fields: whether the text is currently visible. */
    revealed?: boolean;
    /** Provide to render the show/hide toggle on this field. */
    onToggleReveal?: () => void;
    /** Greyed out and uneditable (e.g. while a submit is in flight). */
    disabled?: boolean;
    /** Amber helper line shown only while the field has focus (e.g. "Caps Lock is on"). */
    hint?: string;
    /** Called on key down and key up, e.g. to read getModifierState("CapsLock"). */
    onKeyEvent?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function GlassField({
                               id,
                               label,
                               icon: Icon,
                               type = "text",
                               autoComplete,
                               placeholder,
                               error,
                               registration,
                               valid,
                               revealed,
                               onToggleReveal,
                               disabled,
                               hint,
                               onKeyEvent,
                           }: GlassFieldProps) {
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const inputType = type === "password" && revealed ? "text" : type;
    const showValid = !!valid && !error && !onToggleReveal;
    const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

    return (
        <div className={cn("group/field flex flex-col gap-1.5 transition-opacity duration-300", disabled && "opacity-60")}>
            <label
                htmlFor={id}
                className="text-xs font-medium text-muted-foreground transition-colors group-focus-within/field:text-foreground"
            >
                {label}
            </label>
            <div
                className={cn(
                    "relative rounded-xs border bg-background/60 transition-colors duration-200",
                    error
                        ? "border-destructive ring-1 ring-destructive"
                        : "border-input focus-within:border-ring focus-within:ring-1 focus-within:ring-ring",
                )}
            >
                <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/field:text-primary" />
                <input
                    id={id}
                    type={inputType}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    disabled={disabled}
                    aria-invalid={!!error}
                    aria-describedby={describedBy}
                    onKeyDown={onKeyEvent}
                    onKeyUp={onKeyEvent}
                    className="h-11 w-full rounded-xs bg-transparent pl-10 pr-11 text-sm outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed"
                    {...registration}
                />
                {showValid && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden>
                        <span className="fx-pop tag grid size-5 place-items-center rounded-xs [--tag-c:var(--success)] [--tag-fg:var(--success-foreground)]">
                            <Check className="size-3" strokeWidth={3} />
                        </span>
                    </span>
                )}
                {onToggleReveal && (
                    <button
                        type="button"
                        onClick={onToggleReveal}
                        disabled={disabled}
                        aria-label={revealed ? "Hide password" : "Show password"}
                        aria-pressed={!!revealed}
                        className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    >
                        <Eye
                            className={cn(
                                "absolute size-4 transition-all duration-300",
                                revealed ? "rotate-12 scale-50 opacity-0" : "scale-100 opacity-100",
                            )}
                        />
                        <EyeOff
                            className={cn(
                                "absolute size-4 transition-all duration-300",
                                revealed ? "scale-100 opacity-100" : "-rotate-12 scale-50 opacity-0",
                            )}
                        />
                    </button>
                )}
            </div>
            {hint && (
                <p id={hintId} className="hidden text-xs font-medium text-amber-600 group-focus-within/field:block dark:text-amber-400">
                    {hint}
                </p>
            )}
            {error && (
                <p id={errorId} role="alert" className="fx-rise text-xs text-destructive">
                    {error.message}
                </p>
            )}
        </div>
    );
}