import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordFlow } from "@/components/auth/forgot-password-flow";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPasswordPage() {
    return (
        <AuthCard title="Reset your password">
            <ForgotPasswordFlow />
            <p className="text-sm text-muted-foreground">
                Remembered it?{" "}
                <Link href="/login" className="text-primary underline">
                    Sign in
                </Link>
            </p>
        </AuthCard>
    );
}