"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
    name: string;
    value: string;
    length: number;
    onChange: (value: string) => void;
    onBlur?: () => void;
    /** Fires when the last digit is entered (typing, paste, or OS autofill). */
    onComplete?: (value: string) => void;
    disabled?: boolean;
    invalid?: boolean;
    describedBy?: string;
    inputRef?: React.Ref<HTMLInputElement>;
}

export function OtpInput({
                             name,
                             value,
                             length,
                             onChange,
                             onBlur,
                             onComplete,
                             disabled,
                             invalid,
                             describedBy,
                             inputRef,
                         }: OtpInputProps) {
    const [focused, setFocused] = useState(false);
    const active = Math.min(value.length, length - 1);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value.replace(/\D/g, "").slice(0, length);
        onChange(next);
        if (next.length === length && value.length !== length) onComplete?.(next);
    };

    return (
        <div className="relative">
            <input
                ref={inputRef}
                name={name}
                value={value}
                onChange={handleChange}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                    setFocused(false);
                    onBlur?.();
                }}
                disabled={disabled}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="Verification code"
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
            />
            <div className="flex gap-2" aria-hidden>
                {Array.from({ length }, (_, i) => {
                    const char = value[i];
                    const isActive = focused && !disabled && i === active;
                    return (
                        <div
                            key={i}
                            className={cn(
                                "grid h-12 min-w-0 flex-1 place-items-center rounded-xs border bg-background/60 font-mono text-lg font-semibold transition-colors duration-200",
                                length % 2 === 0 && i === length / 2 && "ml-2",
                                invalid
                                    ? "border-destructive ring-1 ring-destructive"
                                    : isActive
                                        ? "border-ring ring-1 ring-ring"
                                        : char
                                            ? "border-foreground/40"
                                            : "border-input",
                            )}
                        >
                            {char ? (
                                <span key={char + i} className="fx-pop">
                                    {char}
                                </span>
                            ) : isActive ? (
                                <span className="fx-caret h-5 w-px bg-primary" />
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}