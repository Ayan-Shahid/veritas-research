import { z } from "zod";

const email = z
    .string()
    .trim()
    .min(1, "Enter your email.")
    .max(254, "Email is too long.")
    .pipe(z.string().email("Enter a valid email address."));

const code = z.string().trim().regex(/^\d{6,10}$/, "Enter the numeric code from your email.");

export const loginSchema = z.object({
    email,
    // No complexity rules on login: they'd only help someone probing the policy.
    password: z.string().min(1, "Enter your password.").max(256),
    next: z.string().max(512).optional(),
});

export const startRegistrationSchema = z.object({ email });
export const codeOnlySchema = z.object({ code });
export const verifyCodeSchema = z.object({ email, code });

export const setPasswordSchema = z
    .object({
        // GoTrue hashes with bcrypt, which only uses the first 72 bytes.
        password: z.string().min(12, "Use at least 12 characters.").max(72, "Use at most 72 characters."),
        confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
        path: ["confirmPassword"],
        message: "Passwords don't match.",
    });

const newPassword = z
    .string()
    .min(12, "Use at least 12 characters.")
    .max(72, "Use at most 72 characters.");

const passwordsMatch = (d: { password: string; confirmPassword: string }) => d.password === d.confirmPassword;
const mismatch = { path: ["confirmPassword"], message: "Passwords don't match." };

export const forgotPasswordSchema = z.object({ email });

// The client form has no email field (it rides in a hidden input), so it gets its own schema.
export const resetPasswordFormSchema = z
    .object({ code, password: newPassword, confirmPassword: z.string() })
    .refine(passwordsMatch, mismatch);

export const resetPasswordSchema = z
    .object({ email, code, password: newPassword, confirmPassword: z.string() })
    .refine(passwordsMatch, mismatch);

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Enter your current password.").max(256),
        password: newPassword,
        confirmPassword: z.string(),
    })
    .refine(passwordsMatch, mismatch)
    .refine((d) => d.password !== d.currentPassword, {
        path: ["password"],
        message: "Choose a password different from your current one.",
    });