"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { SignOutButton } from "@/components/auth/sign-out-button";

export function AccountMenu() {
    const { user, isAnonymous } = useAuth();

    const glass = "rounded-xl px-3 py-1.5 text-card-foreground backdrop-saturate-150 border border-foreground/5 backdrop-blur-xl bg-gradient-to-br from-card/20 to-card/5 dark:from-card/20 dark:to-background/5 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)]";

    if (isAnonymous) {
        return (
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/register" />}>
                Save your work
            </Button>
        );
    }

    return (
        <div className={`flex items-center gap-3 ${glass}`}>
            <span className="hidden max-w-40 truncate text-xs font-medium md:inline">{user.email}</span>
            <SignOutButton />
        </div>
    );
}