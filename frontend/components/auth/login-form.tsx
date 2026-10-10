"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Mail } from "lucide-react";
import { GlassButton } from "@/components/auth/register/glass-button";
import { GlassField } from "@/components/auth/register/glass-field";
import { shakeElement, useShakeOnError } from "@/components/auth/register/use-shake-on-error";
import { useServerAction } from "@/components/auth/use-server-action";
import { loginAction } from "@/lib/auth/actions";
import { loginSchema, startRegistrationSchema } from "@/lib/auth/schemas";
import { safeRedirectPath } from "@/lib/auth/redirect";

/** Time the "Signed in" state stays on screen before the hard navigation. */
const SUCCESS_HOLD_MS = 900;

export function LoginForm({ next }: { next: string }) {
    const form = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "", next },
        mode: "onTouched",
    });
    const { setFocus } = form;
    const [signedIn, setSignedIn] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const [capsLock, setCapsLock] = useState(false);
    const redirectTimer = useRef<number | null>(null);

    useEffect(
        () => () => {
            if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current);
        },
        [],
    );

    const { state, formAction, formRef, isPending, submit } = useServerAction({
        action: loginAction,
        setError: form.setError,
        onSuccess: (s) => {
            setSignedIn(true);
            const target = safeRedirectPath(s.redirectTo);
            // Hard navigation on purpose: this is a different user than any guest session in this
            // browser, so the in-memory React Query cache must not survive.
            redirectTimer.current = window.setTimeout(() => window.location.assign(target), SUCCESS_HOLD_MS);
        },
    });
    useShakeOnError(formRef, state);

    // Only invoked by react-hook-form on a failed client-side validation, never during render
    // (handleSubmit(onValid, onInvalid) defers both callbacks to submit time) — but the
    // experimental react-hooks/refs rule can't prove that about a function it didn't define,
    // so it flags the ref read wherever this is passed to handleSubmit(). See the disable
    // comment at the call site below.
    const shakeOnInvalid = () => shakeElement(formRef.current);

    useEffect(() => {
        setFocus("email");
    }, [setFocus]);

    // Live checkers: the tick uses the same email rule the server applies.
    const email = useWatch({ control: form.control, name: "email" });
    const emailValid = startRegistrationSchema.safeParse({ email }).success;
    const { errors } = form.formState;
    const locked = isPending || signedIn;

    return (
        // action={formAction} keeps the form working with JS disabled; with JS, handleSubmit validates
        // first (and shakes if it fails) and then dispatches the same action manually.
        <form
            ref={formRef}
            action={formAction}
            // eslint-disable-next-line react-hooks/refs -- false positive, see shakeOnInvalid above
            onSubmit={form.handleSubmit(submit, shakeOnInvalid)}
            noValidate
            className="flex flex-col gap-5"
        >
            <input type="hidden" {...form.register("next")} />

            <div className="fx-rise" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
                <GlassField
                    id="email"
                    label="Email address"
                    icon={Mail}
                    type="email"
                    autoComplete="email"
                    placeholder="you@firm.com"
                    error={errors.email}
                    valid={emailValid}
                    disabled={locked}
                    registration={form.register("email")}
                />
            </div>

            <div className="fx-rise flex flex-col gap-2" style={{ ["--i" as string]: 2 } as React.CSSProperties}>
                <GlassField
                    id="password"
                    label="Password"
                    icon={Lock}
                    type="password"
                    autoComplete="current-password"
                    error={errors.password}
                    revealed={revealed}
                    onToggleReveal={() => setRevealed((r) => !r)}
                    disabled={locked}
                    hint={capsLock ? "Caps Lock is on" : undefined}
                    onKeyEvent={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                    registration={form.register("password")}
                />
                <Link
                    href="/forgot-password"
                    className="self-end text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                >
                    Forgot password?
                </Link>
            </div>

            {state.status === "error" && !signedIn && (
                <p role="alert" className="fx-rise rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm font-medium text-destructive">
                    {state.message}
                </p>
            )}

            <div className="fx-rise flex flex-col gap-3" style={{ ["--i" as string]: 3 } as React.CSSProperties}>
                <GlassButton
                    type="submit"
                    loading={isPending}
                    loadingText="Signing in…"
                    success={signedIn}
                    successText="Signed in"
                    showArrow
                >
                    Sign in
                </GlassButton>
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                    Signing in switches to your saved workspace. Anything in a guest workspace on this browser stays with
                    that guest session.
                </p>
            </div>
        </form>
    );
}