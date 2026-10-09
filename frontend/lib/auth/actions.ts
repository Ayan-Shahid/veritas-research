"use server";

import { headers } from "next/headers";
import type { z } from "zod";
import { createServerSupabase, verifyPassword } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/auth/state";
import {
    loginSchema,
    startRegistrationSchema,
    verifyCodeSchema,
    setPasswordSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
} from "@/lib/auth/schemas";
import {
    authErrorMessage,
    isRateLimited,
    isWrongCurrentPassword,
    toAuthError,
    LOCAL_RATE_LIMIT,
    type AuthContext,
} from "@/lib/auth/errors";
import { safeRedirectPath, DEFAULT_AFTER_AUTH } from "@/lib/auth/redirect";
import { limiters, anyLimited, normEmail } from "@/lib/auth/limits";
import { clientIp } from "@/lib/auth/rate-limit";

// Every auth operation goes through these actions. GoTrue enforces its own limits as well
// (keyed on the visitor IP that lib/supabase/server.ts forwards); the limiters here add
// per-address and global caps that GoTrue does not have.

function invalid(error: z.ZodError): ActionState {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key) (fieldErrors[key] ??= []).push(issue.message);
    }
    return { status: "error", message: "Please correct the highlighted fields.", fieldErrors };
}

function failed(ctx: AuthContext, error: unknown): ActionState {
    const e = toAuthError(error);
    console.error(`[auth:${ctx}]`, e.status, e.code);
    return { status: "error", message: authErrorMessage(e, ctx) };
}

const tooMany = (ctx: AuthContext) => failed(ctx, { code: LOCAL_RATE_LIMIT });

async function visitorIp(): Promise<string> {
    return clientIp(await headers());
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
    const parsed = loginSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const { password, next } = parsed.data;
    const email = normEmail(parsed.data.email);

    const ip = await visitorIp();
    if (anyLimited([[limiters.login, `${ip}|${email}`], [limiters.loginIp, ip]])) return tooMany("login");

    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return failed("login", error);

    return { status: "success", redirectTo: safeRedirectPath(next) };
}

/** Step 1: attach an email to the current (anonymous) user; GoTrue emails a code to it. */
export async function startRegistrationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
    const parsed = startRegistrationSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const email = normEmail(parsed.data.email);

    const ip = await visitorIp();
    if (anyLimited([[limiters.otpEmail, email], [limiters.otpIp, ip], [limiters.otpGlobal, "all"]])) {
        return tooMany("start-registration");
    }

    const supabase = await createServerSupabase();
    const { data: current } = await supabase.auth.getUser();
    let user = current.user;

    if (!user) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data.user) return failed("start-registration", error);
        user = data.user;
    }
    if (!user.is_anonymous) {
        return { status: "error", message: "You're already signed in to a full account." };
    }

    // An address that already has an account fails here (email_exists) and gets the same
    // message as every other failure.
    const { error } = await supabase.auth.updateUser({ email });
    if (error) return failed("start-registration", error);
    return { status: "success" };
}

/** Step 2: confirm the emailed code. Converts the anonymous user in place: the user id is unchanged,
 *  so the guest's workspace simply stays theirs. */
export async function verifyCodeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
    const parsed = verifyCodeSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const email = normEmail(parsed.data.email);

    const ip = await visitorIp();
    if (anyLimited([[limiters.verify, `${ip}|${email}`]])) return tooMany("verify-code");

    const supabase = await createServerSupabase();
    const { data: current } = await supabase.auth.getUser();
    if (!current.user) {
        return { status: "error", message: "Your session expired. Start again from the email step." };
    }

    const { error } = await supabase.auth.verifyOtp({ email, token: parsed.data.code, type: "email_change" });
    if (error) return failed("verify-code", error);
    return { status: "success" };
}

/** Step 3: set a password. Only valid for a user whose email is already verified. */
export async function setPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
    const parsed = setPasswordSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);

    const supabase = await createServerSupabase();
    const { data: current } = await supabase.auth.getUser();
    const user = current.user;
    if (!user || user.is_anonymous || !user.email) {
        return { status: "error", message: "Verify your email first." };
    }
    if (anyLimited([[limiters.password, user.id]])) return tooMany("set-password");

    // A just-registered user has no password yet, so GoTrue does not ask for a current one.
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return failed("set-password", error);
    return { status: "success", redirectTo: DEFAULT_AFTER_AUTH };
}

export async function signOutAction(): Promise<ActionState> {
    const supabase = await createServerSupabase();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) console.error("[auth:sign-out]", error.status, error.code);
    }
    return { status: "success", redirectTo: "/" };
}

/** Forgot password, step 1. Always reports success so it can't be used to learn which emails have accounts. */
export async function requestPasswordResetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
    const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const email = normEmail(parsed.data.email);

    const ip = await visitorIp();
    if (anyLimited([[limiters.otpEmail, email], [limiters.otpIp, ip], [limiters.otpGlobal, "all"]])) {
        return tooMany("request-reset");
    }

    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
        const e = toAuthError(error);
        console.error("[auth:request-reset]", e.status, e.code);
        if (isRateLimited(e)) return { status: "error", message: authErrorMessage(e, "request-reset") };
        // Anything else is swallowed on purpose (it is logged above).
    }
    return { status: "success" };
}

/** Forgot password, step 2: verify the emailed code, set the new password, end other sessions. */
export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
    const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const { code, password } = parsed.data;
    const email = normEmail(parsed.data.email);

    const ip = await visitorIp();
    if (anyLimited([[limiters.verify, `${ip}|${email}`]])) return tooMany("reset-password");

    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
    if (error || !data.user) return failed("reset-password", error);

    // A recovery session: GoTrue does not ask for the current password here.
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
        // The code is spent; don't leave a half-finished recovery session behind.
        await supabase.auth.signOut({ scope: "local" });
        return failed("reset-password", updateError);
    }

    const { error: othersError } = await supabase.auth.signOut({ scope: "others" });
    if (othersError) console.error("[auth:reset-password] revoke others", othersError.status, othersError.code);

    return { status: "success", redirectTo: DEFAULT_AFTER_AUTH };
}

/** Settings: change password. Requires the current password, so a left-open session alone can't
 *  take over the account. Checked here for every session, and again by GoTrue
 *  (GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD) for password-based sessions, which
 *  also covers someone calling GoTrue directly with a stolen access token. */
export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
    const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const { currentPassword, password } = parsed.data;

    const supabase = await createServerSupabase();
    const { data: current } = await supabase.auth.getUser();
    const user = current.user;
    if (!user || user.is_anonymous || !user.email) {
        return { status: "error", message: "Save your work with an email and password first." };
    }
    if (anyLimited([[limiters.password, user.id]])) return tooMany("change-password");

    const wrongCurrent = (): ActionState => {
        const message = "Your current password is incorrect.";
        return { status: "error", message, fieldErrors: { currentPassword: [message] } };
    };

    const check = await verifyPassword(user.email, currentPassword);
    if (!check.ok) {
        return check.error.code === "invalid_credentials" ? wrongCurrent() : failed("change-password", check.error);
    }

    const { error } = await supabase.auth.updateUser({ password, current_password: currentPassword });
    if (error) {
        return isWrongCurrentPassword(toAuthError(error)) ? wrongCurrent() : failed("change-password", error);
    }

    const { error: othersError } = await supabase.auth.signOut({ scope: "others" });
    if (othersError) console.error("[auth:change-password] revoke others", othersError.status, othersError.code);

    return { status: "success", message: "Password updated. Other devices were signed out." };
}

/** Settings: end every session except this one. */
export async function signOutOtherSessionsAction(): Promise<ActionState> {
    const supabase = await createServerSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { status: "error", message: "You're not signed in." };

    const { error } = await supabase.auth.signOut({ scope: "others" });
    if (error) {
        console.error("[auth:sign-out-others]", error.status, error.code);
        return { status: "error", message: "We couldn't sign out your other devices. Please try again." };
    }
    return { status: "success", message: "Signed out of all other devices." };
}
