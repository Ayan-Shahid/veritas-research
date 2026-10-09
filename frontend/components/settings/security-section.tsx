"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { TextField } from "@/components/auth/text-field";
import { useServerAction } from "@/components/auth/use-server-action";
import { SettingsCard } from "@/components/settings/settings-card";
import { changePasswordAction, signOutOtherSessionsAction } from "@/lib/auth/actions";
import { changePasswordSchema } from "@/lib/auth/schemas";

export function SecuritySection({ isAnonymous }: { isAnonymous: boolean }) {
    return (
        <SettingsCard title="Security" description="Your password and active sessions.">
            {isAnonymous ? (
                <p className="text-sm text-muted-foreground">
                    Guest workspaces don&apos;t have a password.{" "}
                    <Link href="/register" className="text-primary underline">
                        Save your work
                    </Link>{" "}
                    to add an email and password.
                </p>
            ) : (
                <>
                    <ChangePasswordForm />
                    <SignOutOthers />
                </>
            )}
        </SettingsCard>
    );
}

function ChangePasswordForm() {
    const form = useForm({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
        mode: "onTouched",
    });
    const { state, formAction, formRef, isPending, submit } = useServerAction({
        action: changePasswordAction,
        setError: form.setError,
        onSuccess: (s) => {
            form.reset();
            toast.add({ title: "Password updated", description: s.message, type: "success", timeout: 6000 });
        },
    });
    const { errors } = form.formState;

    return (
        <form ref={formRef} action={formAction} onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-4">
            <TextField id="currentPassword" label="Current password" type="password" autoComplete="current-password" error={errors.currentPassword} registration={form.register("currentPassword")} />
            <TextField id="password" label="New password" type="password" autoComplete="new-password" error={errors.password} registration={form.register("password")} />
            <TextField id="confirmPassword" label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirmPassword} registration={form.register("confirmPassword")} />
            {state.status === "error" && !state.fieldErrors && (
                <p role="alert" className="text-sm text-destructive">
                    {state.message}
                </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={isPending}>
                    {isPending ? "Updating…" : "Update password"}
                </Button>
                <Link href="/forgot-password" className="text-xs text-muted-foreground underline">
                    Forgot your current password?
                </Link>
            </div>
        </form>
    );
}

function SignOutOthers() {
    const [pending, start] = useTransition();

    return (
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <p className="text-sm font-medium">Sign out other devices</p>
                <p className="text-xs text-muted-foreground">Ends every other session. This device stays signed in.</p>
            </div>
            <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                    start(async () => {
                        const r = await signOutOtherSessionsAction();
                        toast.add({
                            title: r.status === "success" ? "Done" : "Something went wrong",
                            description: r.status === "idle" ? undefined : r.message,
                            type: r.status === "success" ? "success" : "error",
                        });
                    })
                }
            >
                {pending ? "Signing out…" : "Sign out other devices"}
            </Button>
        </div>
    );
}