"use client";

import { useState, Suspense, useEffect, useRef, startTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, KeyRound, ShieldCheck, RotateCw, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Server Actions & Auth
import { useServerAction } from "@/components/auth/use-server-action";
import { startRegistrationAction, verifyCodeAction, setPasswordAction } from "@/lib/auth/actions";
import { startRegistrationSchema, codeOnlySchema, setPasswordSchema } from "@/lib/auth/schemas";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { IDLE } from "@/lib/auth/state";

// Custom Animated UI Components
import { GlassCard } from "@/components/auth/register/glass-card";
import { GlassField } from "@/components/auth/register/glass-field";
import { GlassButton } from "@/components/auth/register/glass-button";
import { OtpInput } from "@/components/auth/register/otp-input";
import { Stepper, ProgressEdge } from "@/components/auth/register/step-indicator";
import { AnimatedHeight } from "@/components/auth/register/animated-height";
import { PasswordStrengthMeter } from "@/components/auth/register/password-strength-meter";

// Hooks
import { useShakeOnError } from "@/components/auth/register/use-shake-on-error";
import { useStepTransition } from "@/components/auth/register/use-step-transition";
import { stagger, panelClass } from "@/components/auth/register/motion";

type Step = "email" | "code" | "password" | "done";
const STEP_ORDER: Step[] = ["email", "code", "password", "done"];

const REGISTER_STEPS = [
    { id: "email", label: "Email", icon: Mail },
    { id: "code", label: "Verify", icon: KeyRound },
    { id: "password", label: "Secure", icon: Lock },
];

const RESEND_COOLDOWN_MS = 60000;
const OTP_LENGTH = 6;

// 1. Fixed Icon Type to LucideIcon
function StepHeader({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-3 text-center">
            <div className="grid size-12 place-items-center rounded-xs border border-border bg-background text-primary">
                <Icon className="size-5" />
            </div>
            <div className="flex flex-col gap-1.5">
                <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
        </div>
    );
}

const ANNOUNCEMENTS: Record<Step, string> = {
    email: "Step 1 of 3: enter your email",
    code: "Step 2 of 3: verify your email",
    password: "Step 3 of 3: choose a password",
    done: "Registration complete",
};

function RegisterFlowContent() {
    const searchParams = useSearchParams();

    // Only the password step may be deep-linked (an emailed link can land there; the server still checks
    // the user is verified). "code" would have no email to verify against, and "done" would just redirect.
    const initial: Step = searchParams.get("step") === "password" ? "password" : "email";

    const { step, phase, direction, go } = useStepTransition<Step>(initial, STEP_ORDER);

    const [email, setEmail] = useState("");
    const [sentAt, setSentAt] = useState(0);
    const [redirectUrl, setRedirectUrl] = useState<string | undefined>();

    // On "done" every node is complete and the top bar is full, instead of the last step staying "active".
    const currentIndex = step === "done" ? REGISTER_STEPS.length : STEP_ORDER.indexOf(step);

    useEffect(() => {
        if (step === "done") {
            const timer = setTimeout(() => {
                window.location.assign(safeRedirectPath(redirectUrl));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [step, redirectUrl]);

    return (
        // No padding on the card itself: ProgressEdge is absolutely positioned against the content wrapper
        // inside GlassCard, so card padding would push the bar down into the card instead of its top edge.
        <GlassCard className="w-full max-w-md">
            <ProgressEdge total={REGISTER_STEPS.length} current={currentIndex} />
            <p className="sr-only" role="status" aria-live="polite">
                {ANNOUNCEMENTS[step]}
            </p>

            <div className="flex flex-col gap-6 p-6 pt-8 md:p-8 md:pt-10">
                <Stepper steps={REGISTER_STEPS} current={currentIndex} />

                <AnimatedHeight>
                    <div key={step} className={panelClass(phase, direction)} aria-busy={phase === "out"}>
                        {step === "email" && (
                            <EmailStep
                                defaultEmail={email}
                                onSent={(e) => {
                                    setEmail(e);
                                    setSentAt(Date.now());
                                    go("code");
                                }}
                            />
                        )}
                        {step === "code" && (
                            <CodeStep
                                email={email}
                                sentAt={sentAt}
                                onResent={() => setSentAt(Date.now())}
                                onVerified={() => go("password")}
                                onBack={() => go("email")}
                            />
                        )}
                        {step === "password" && (
                            <PasswordStep
                                onDone={(url) => {
                                    setRedirectUrl(url);
                                    go("done");
                                }}
                            />
                        )}
                        {step === "done" && (
                            <DoneStep onContinue={() => window.location.assign(safeRedirectPath(redirectUrl))} />
                        )}
                    </div>
                </AnimatedHeight>

                {step === "email" && (
                    <p className="text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                            Sign in
                        </Link>
                    </p>
                )}
            </div>
        </GlassCard>
    );
}

export function RegisterFlow() {
    return (
        <Suspense
            fallback={
                <GlassCard className="w-full max-w-md">
                    <div className="flex animate-pulse flex-col items-center gap-4 p-8 py-12" aria-hidden>
                        <div className="size-12 rounded-xs bg-foreground/10" />
                        <div className="h-6 w-40 rounded-xs bg-foreground/10" />
                        <div className="h-12 w-full rounded-xs bg-foreground/10" />
                        <div className="h-12 w-full rounded-xs bg-foreground/10" />
                    </div>
                </GlassCard>
            }
        >
            <RegisterFlowContent />
        </Suspense>
    );
}

function FormError({ message }: { message?: string }) {
    if (!message) return null;
    return (
        <p role="alert" className="fx-rise text-sm text-destructive text-center font-medium mt-1">
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

    useEffect(() => {
        if (state.status === "error") {
            form.setValue("code", "");
            otpRef.current?.focus();
        }
    }, [state, form]);

    useEffect(() => {
        otpRef.current?.focus({ preventScroll: true });
    }, []);

    const submitCode = (code: string) => {
        if (isPending) return;
        const parsed = codeOnlySchema.safeParse({ code });
        if (!parsed.success) return;
        const data = new FormData();
        data.set("email", email);
        data.set("code", parsed.data.code);
        startTransition(() => formAction(data));
    };

    const [now, setNow] = useState(sentAt);
    const remaining = Math.max(0, Math.ceil((RESEND_COOLDOWN_MS - Math.max(0, now - sentAt)) / 1000));
    const canResend = remaining === 0;

    useEffect(() => {
        if (canResend) return;
        const id = window.setInterval(() => setNow(Date.now()), 250);
        return () => window.clearInterval(id);
    }, [canResend]);

    const [resendNote, setResendNote] = useState<{ ok: boolean; text: string } | null>(null);
    const [isResending, setIsResending] = useState(false);

    const resend = async () => {
        setResendNote(null);
        setIsResending(true);
        const data = new FormData();
        data.set("email", email);

        try {
            const result = await startRegistrationAction(IDLE, data);
            if (result.status === "success") {
                onResent();
                setResendNote({ ok: true, text: "A new code is on its way." });
            } else {
                setResendNote({ ok: false, text: result.status === "error" ? result.message : "Couldn't resend the code." });
            }
        } catch {
            setResendNote({ ok: false, text: "We couldn't reach the server. Check your connection and try again." });
        } finally {
            setIsResending(false);
        }
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
                    <p id="code-error" role="alert" className="fx-rise text-center text-sm text-destructive font-medium mt-2">
                        {errorText}
                    </p>
                )}
            </div>
            <div className="fx-rise flex flex-col gap-3" style={stagger(3)}>
                <GlassButton type="submit" loading={isPending} loadingText="Verifying…" showArrow>
                    Verify email
                </GlassButton>
                <div className="flex items-center justify-between text-xs mt-2 px-1">
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
                            disabled={isResending}
                            className="flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline disabled:opacity-60"
                        >
                            <RotateCw className={cn("size-3.5", isResending && "animate-spin")} />
                            {isResending ? "Sending…" : "Resend code"}
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
                    <p role="status" className={cn("fx-rise text-center text-xs font-medium", resendNote.ok ? "text-emerald-500" : "text-destructive")}>
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

/* ───────────────────────── step 4: done ───────────────────────── */

const PARTICLES = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const distance = 58 + (i % 3) * 14;
    return {
        tx: Math.round(Math.cos(angle) * distance),
        ty: Math.round(Math.sin(angle) * distance),
        delay: 320 + (i % 4) * 45,
        color: ["bg-primary", "bg-success", "bg-foreground/40"][i % 3],
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
                        className={cn("fx-burst absolute left-1/2 top-1/2 size-1.5 rounded-xs", p.color)}
                        style={{ ["--tx" as string]: `${p.tx}px`, ["--ty" as string]: `${p.ty}px`, animationDelay: `${p.delay}ms` } as React.CSSProperties}
                    />
                ))}
                <span className="fx-pop btn-mesh relative grid size-20 place-items-center rounded-xs [--btn-c:var(--success)] [--btn-fg:var(--success-foreground)]">
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
                <div className="h-1 overflow-hidden rounded-xs bg-foreground/10" aria-hidden>
                    <div className="fx-drain h-full bg-primary" />
                </div>
                <p className="text-xs text-muted-foreground">Taking you there automatically…</p>
            </div>
        </div>
    );
}