"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { SignOutButton } from "@/components/auth/sign-out-button";

export function AccountMenu() {
    const { user, isAnonymous } = useAuth();

    if (isAnonymous) {
        return (
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/register" />}>
                Save your work
            </Button>
        );
    }

    return (
        <div className="flex items-center gap-3 rounded-xs border border-border bg-background/60 py-1 pl-3 pr-1">
            <span className="hidden max-w-40 truncate text-xs font-medium md:inline">{user.email}</span>
            <SignOutButton />
        </div>
    );
}