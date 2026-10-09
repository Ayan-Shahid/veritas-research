"use client";

import { startTransition, useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Lock, Mail, RotateCw, ShieldCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IDLE } from "@/lib/auth/state";
import { codeOnlySchema, setPasswordSchema, startRegistrationSchema } from "@/lib/auth/schemas";
import { setPasswordAction, startRegistrationAction, verifyCodeAction } from "@/lib/auth/actions";
import { useServerAction } from "@/components/auth/use-server-action";
import { GlassField } from "./glass-field";
import { GlassButton } from "./glass-button";
import { OtpInput } from "./otp-input";
import { PasswordStrengthMeter } from "./password-strength-meter";
import { useShakeOnError } from "./use-shake-on-error";
import { OTP_LENGTH, RESEND_COOLDOWN_MS, stagger } from "./motion";

/* ───────────────────────── shared bits ───────────────────────── */

function StepHeader({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-4 text-center">
            <div className="fx-pop relative grid size-14 place-items-center rounded-2xl border border-foreground/10 bg-gradient-to-br from-primary/25 to-cyan-400/15 text-primary shadow-[0_8px_24px_-8px_var(--primary)]">
                <span aria-hidden className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
                <Icon className="fx-float relative size-6" />
            </div>
            <div className="fx-rise flex flex-col gap-1.5" style={stagger(1)}>
                <h1 className="font-heading text-2xl font-bold tracking-tight">{title}</h1>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
        </div>
    );
}

function FormError({ message }: { message?: string }) {
    if (!message) return null;
    return (
        <p role="alert" className="fx-rise rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
        </p>
    );
}

/* ───────────────────────── step 1: email ───────────────────────── */

export function EmailStep({ defaultEmail, onSent }: { defaultEmail: string; onSent: (email: string) => void }) {
    const form = useForm({
        resolver: zodResolver(startRegistrationSchema),
        defaultValues: { email: defaultEmail },
        mode: "onTouched",
    });
    const { setFocus } = form;
    const { state, formAction, formRef, isPending, submit } = useServerAction({
        action: startRegistrationAction,
        setError: form.setError,
        onSuccess: () => onSent(form.getValues("email").trim()),
    });
    useShakeOnError(formRef, state);

    const email = useWatch({ control: form.control, name: "email" });
    const valid = startRegistrationSchema.safeParse({ email }).success;

    useEffect(() => {
        setFocus("email");
    }, [setFocus]);

    return (
        <form ref={formRef} action={formAction} onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-6">
            <StepHeader
                icon={Mail}
                title="Save your work"
                subtitle="Add an email to keep your workspace and memos. We'll send you a verification code."
            />
            <div className="fx-rise" style={stagger(2)}>
                <GlassField
                    id="email"
                    label="Email address"
                    icon={Mail}
                    type="email"
                    autoComplete="email"
                    placeholder="you@firm.com"
                    error={form.formState.errors.email}
                    valid={valid}
                    registration={form.register("email")}
                />
            </div>
            <FormError message={state.status === "error" ? state.message : undefined} />
            <div className="fx-rise flex flex-col gap-3" style={stagger(3)}>
                <GlassButton type="submit" loading={isPending} loadingText="Sending code…" showArrow>
                    Send verification code
                </GlassButton>
                <p className="text-center text-xs text-muted-foreground">Your current workspace and memos move to this account.</p>
            </div>
        </form>
    );
}

/* ───────────────────────── step 2: code ───────────────────────── */

const RING_DURATION = { animationDuration: `${RESEND_COOLDOWN_MS}ms` };

export function CodeStep({
                             email,
                             sentAt,
                             onResent,
                             onVerified,
                             onBack,
                         }: {
    email: string;
    sentAt: number;
    onResent: () => void;
    onVerified: () => void;
    onBack: () => void;
}) {
    const form = useForm({ resolver: zodResolver(codeOnlySchema), defaultValues: { code: "" } });
    const { state, formAction, formRef, isPending } = useServerAction({
        action: verifyCodeAction,
        setError: form.setError,
        onSuccess: onVerified,
    });
    useShakeOnError(formRef, state);
    const otpRef = useRef<HTMLInputElement>(null);

    // Wrong code: clear the cells and put the cursor back at the start.
    useEffect(() => {
        if (state.status === "error") {
            form.setValue("code", "");
            otpRef.current?.focus();
        }
    }, [state, form]);

    useEffect(() => {
        otpRef.current?.focus({ preventScroll: true });
    }, []);

    // Built from values, not the DOM, so auto-submit never races React's re-render.
    const submitCode = (code: string) => {
        if (isPending) return;
        const parsed = codeOnlySchema.safeParse({ code });
        if (!parsed.success) return;
        const data = new FormData();
        data.set("email", email);
        data.set("code", parsed.data.code);
        startTransition(() => formAction(data));
    };

    /* resend cooldown: derived from timestamps, so nothing impure runs during render */
    const [now, setNow] = useState(sentAt);
    const remaining = Math.max(0, Math.ceil((RESEND_COOLDOWN_MS - Math.max(0, now - sentAt)) / 1000));
    const canResend = remaining === 0;
    useEffect(() => {
        if (canResend) return;
        const id = window.setInterval(() => setNow(Date.now()), 250);
        return () => window.clearInterval(id);
    }, [canResend]);

    const [resending, startResend] = useTransition();
    const [resendNote, setResendNote] = useState<{ ok: boolean; text: string } | null>(null);
    const resend = () => {
        setResendNote(null);
        const data = new FormData();
        data.set("email", email);
        startResend(async () => {
            const result = await startRegistrationAction(IDLE, data);
            if (result.status === "success") {
                onResent();
                setResendNote({ ok: true, text: "A new code is on its way." });
            } else {
                setResendNote({ ok: false, text: result.status === "error" ? result.message : "Couldn't resend the code." });
            }
        });
    };

    const clientError = form.formState.errors.code?.message;
    const serverError = state.status === "error" ? state.message : undefined;
    const errorText = clientError ?? serverError;

    return (
        <form
            ref={formRef}
            action={formAction}
            onSubmit={form.handleSubmit((values) => submitCode(values.code))}
            noValidate
            className="flex flex-col gap-6"
        >
            <input type="hidden" name="email" value={email} readOnly />
            <StepHeader
                icon={ShieldCheck}
                title="Check your inbox"
                subtitle={
                    <>
                        We sent a code to <span className="break-all font-medium text-foreground">{email}</span>
                    </>
                }
            />
            <div className="fx-rise flex flex-col gap-2" style={stagger(2)}>
                <Controller
                    name="code"
                    control={form.control}
                    render={({ field }) => (
                        <OtpInput
                            name="code"
                            length={OTP_LENGTH}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            onComplete={submitCode}
                            disabled={isPending}
                            invalid={!!errorText}
                            describedBy={errorText ? "code-error" : undefined}
                            inputRef={otpRef}
                        />
                    )}
                />
                {errorText && (
                    <p id="code-error" role="alert" className="fx-rise text-center text-sm text-destructive">
                        {errorText}
                    </p>
                )}
            </div>
            <div className="fx-rise flex flex-col gap-3" style={stagger(3)}>
                <GlassButton type="submit" loading={isPending} loadingText="Verifying…" showArrow>
                    Verify email
                </GlassButton>
                <div className="flex items-center justify-between text-xs">
                    <button
                        type="button"
                        onClick={onBack}
                        className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                        Use a different email
                    </button>
                    {canResend ? (
                        <button
                            type="button"
                            onClick={resend}
                            disabled={resending}
                            className="flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline disabled:opacity-60"
                        >
                            <RotateCw className={cn("size-3.5", resending && "animate-spin")} />
                            {resending ? "Sending…" : "Resend code"}
                        </button>
                    ) : (
                        <span className="flex items-center gap-2 text-muted-foreground" aria-live="off">
                            <svg viewBox="0 0 20 20" className="size-5 -rotate-90" aria-hidden>
                                <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2" className="stroke-foreground/10" />
                                <circle
                                    key={sentAt}
                                    cx="10"
                                    cy="10"
                                    r="8"
                                    fill="none"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    className="fx-ring-drain stroke-primary"
                                    style={RING_DURATION}
                                />
                            </svg>
                            Resend in {remaining}s
                        </span>
                    )}
                </div>
                {resendNote && (
                    <p role="status" className={cn("fx-rise text-center text-xs", resendNote.ok ? "text-emerald-500" : "text-destructive")}>
                        {resendNote.text}
                    </p>
                )}
            </div>
        </form>
    );
}

/* ───────────────────────── step 3: password ───────────────────────── */

export function PasswordStep({ onDone }: { onDone: (redirectTo?: string) => void }) {
    const form = useForm({
        resolver: zodResolver(setPasswordSchema),
        defaultValues: { password: "", confirmPassword: "" },
        mode: "onTouched",
    });
    const { setFocus } = form;
    const { state, formAction, formRef, isPending, submit } = useServerAction({
        action: setPasswordAction,
        setError: form.setError,
        onSuccess: (s) => onDone(s.redirectTo),
    });
    useShakeOnError(formRef, state);
    const [revealed, setRevealed] = useState(false);

    const password = useWatch({ control: form.control, name: "password" });
    const confirm = useWatch({ control: form.control, name: "confirmPassword" });
    const matches = confirm.length > 0 && confirm === password;
    const { errors } = form.formState;

    useEffect(() => {
        setFocus("password");
    }, [setFocus]);

    return (
        <form ref={formRef} action={formAction} onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-6">
            <StepHeader icon={Lock} title="Secure your account" subtitle="Choose a password you don't use anywhere else." />
            <div className="fx-rise flex flex-col gap-4" style={stagger(2)}>
                <GlassField
                    id="password"
                    label="Password"
                    icon={Lock}
                    type="password"
                    autoComplete="new-password"
                    error={errors.password}
                    revealed={revealed}
                    onToggleReveal={() => setRevealed((r) => !r)}
                    registration={form.register("password")}
                />
                <PasswordStrengthMeter password={password} />
                <GlassField
                    id="confirmPassword"
                    label="Confirm password"
                    icon={KeyRound}
                    type="password"
                    autoComplete="new-password"
                    error={errors.confirmPassword}
                    revealed={revealed}
                    valid={matches}
                    registration={form.register("confirmPassword")}
                />
            </div>
            <FormError message={state.status === "error" ? state.message : undefined} />
            <div className="fx-rise" style={stagger(3)}>
                <GlassButton type="submit" loading={isPending} loadingText="Securing account…" showArrow>
                    Finish setup
                </GlassButton>
            </div>
        </form>
    );
}

/* ───────────────────────── done ───────────────────────── */

// Deterministic particle layout (module scope: pure, identical on server and client).
const PARTICLES = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const distance = 58 + (i % 3) * 14;
    return {
        tx: Math.round(Math.cos(angle) * distance),
        ty: Math.round(Math.sin(angle) * distance),
        delay: 320 + (i % 4) * 45,
        color: ["bg-primary", "bg-cyan-400", "bg-emerald-400"][i % 3],
    };
});

export function DoneStep({ onContinue }: { onContinue: () => void }) {
    return (
        <div className="flex flex-col items-center gap-6 py-2 text-center">
            <div className="relative grid size-24 place-items-center">
                {PARTICLES.map((p, i) => (
                    <span
                        key={i}
                        aria-hidden
                        className={cn("fx-burst absolute left-1/2 top-1/2 size-1.5 rounded-full", p.color)}
                        style={{ ["--tx" as string]: `${p.tx}px`, ["--ty" as string]: `${p.ty}px`, animationDelay: `${p.delay}ms` } as React.CSSProperties}
                    />
                ))}
                <span aria-hidden className="absolute inset-0 rounded-full bg-emerald-400/25 blur-xl" />
                <span className="fx-pop relative grid size-20 place-items-center rounded-full bg-gradient-to-br from-primary to-cyan-500 text-white shadow-[0_12px_32px_-8px_var(--primary)]">
                    <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} className="fx-draw" />
                    </svg>
                </span>
            </div>
            <div className="fx-rise flex flex-col gap-1.5" style={stagger(2)}>
                <h1 className="font-heading text-2xl font-bold tracking-tight">You&apos;re all set</h1>
                <p className="text-sm text-muted-foreground">Your workspace is saved to your account. Everything you built is still here.</p>
            </div>
            <div className="fx-rise flex w-full flex-col gap-3" style={stagger(3)}>
                <GlassButton type="button" onClick={onContinue} showArrow>
                    Continue to Veritas
                </GlassButton>
                <div className="h-1 overflow-hidden rounded-full bg-foreground/10" aria-hidden>
                    <div className="fx-drain h-full rounded-full bg-gradient-to-r from-primary to-cyan-400" />
                </div>
                <p className="text-xs text-muted-foreground">Taking you there automatically…</p>
            </div>
        </div>
    );
}