import type { Metadata } from "next";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { AuthHeader, AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { safeRedirectPath } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
    const { next } = await searchParams;
    const safeNext = safeRedirectPath(Array.isArray(next) ? next[0] : next);

    return (
        <AuthShell>
            <AuthHeader icon={LogIn} title="Welcome back" subtitle="Sign in to pick up where you left off." />
            <LoginForm next={safeNext} />
            <div className="flex flex-col items-center gap-2 border-t border-foreground/5 pt-5 text-sm text-muted-foreground">
                <p>
                    New here?{" "}
                    <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
                        Create an account
                    </Link>
                </p>
                <p>
                    Just looking?{" "}
                    <Link href="/companies" className="font-medium text-foreground/80 underline-offset-4 hover:underline">
                        Continue as a guest
                    </Link>
                </p>
            </div>
        </AuthShell>
    );
}