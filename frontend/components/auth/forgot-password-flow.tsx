"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/auth/text-field";
import { useServerAction } from "@/components/auth/use-server-action";
import { requestPasswordResetAction, resetPasswordAction } from "@/lib/auth/actions";
import { forgotPasswordSchema, resetPasswordFormSchema } from "@/lib/auth/schemas";
import { safeRedirectPath } from "@/lib/auth/redirect";

type Step = "email" | "reset";

export function ForgotPasswordFlow() {
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");

    if (step === "email") {
        return (
            <EmailStep
                onSent={(e) => {
                    setEmail(e);
                    setStep("reset");
                }}
            />
        );
    }
    return <ResetStep email={email} onBack={() => setStep("email")} />;
}

function FormError({ message }: { message?: string }) {
    if (!message) return null;
    return (
        <p role="alert" className="text-sm text-destructive">
            {message}
        </p>
    );
}

function EmailStep({ onSent }: { onSent: (email: string) => void }) {
    const form = useForm({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" }, mode: "onTouched" });
    const { state, formAction, formRef, isPending, submit } = useServerAction({
        action: requestPasswordResetAction,
        setError: form.setError,
        onSuccess: () => onSent(form.getValues("email").trim()),
    });

    return (
        <form ref={formRef} action={formAction} onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Enter your account email and we&apos;ll send you a code.</p>
            <TextField id="email" label="Email" type="email" autoComplete="email" error={form.formState.errors.email} registration={form.register("email")} />
            <FormError message={state.status === "error" ? state.message : undefined} />
            <Button type="submit" disabled={isPending}>
                {isPending ? "Sending…" : "Send reset code"}
            </Button>
        </form>
    );
}

function ResetStep({ email, onBack }: { email: string; onBack: () => void }) {
    const form = useForm({
        resolver: zodResolver(resetPasswordFormSchema),
        defaultValues: { code: "", password: "", confirmPassword: "" },
        mode: "onTouched",
    });
    const { state, formAction, formRef, isPending, submit } = useServerAction({
        action: resetPasswordAction,
        setError: form.setError,
        // Hard navigation: this is now a different session, so drop any cached app state.
        onSuccess: (s) => window.location.assign(safeRedirectPath(s.redirectTo)),
    });
    const { errors } = form.formState;

    return (
        <form ref={formRef} action={formAction} onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-4">
            {/* Carried to the server; the server schema requires it and verifyOtp fails on a mismatch. */}
            <input type="hidden" name="email" value={email} readOnly />
            {/* Wording is deliberate: it must not confirm that an account exists. */}
            <p className="text-sm text-muted-foreground">
                If an account exists for {email}, we&apos;ve emailed it a code. Enter it below with your new password.
            </p>
            <TextField id="code" label="Code" inputMode="numeric" autoComplete="one-time-code" error={errors.code} registration={form.register("code")} />
            <TextField id="password" label="New password" type="password" autoComplete="new-password" error={errors.password} registration={form.register("password")} />
            <TextField id="confirmPassword" label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirmPassword} registration={form.register("confirmPassword")} />
            <FormError message={state.status === "error" ? state.message : undefined} />
            <Button type="submit" disabled={isPending}>
                {isPending ? "Resetting…" : "Reset password"}
            </Button>
            <Button type="button" variant="ghost" onClick={onBack}>
                Use a different email or resend the code
            </Button>
            <p className="text-xs text-muted-foreground">
                Resetting signs you in to that account and signs out its other devices.
            </p>
        </form>
    );
}