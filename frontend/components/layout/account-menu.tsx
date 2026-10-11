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
        <div className="flex items-center gap-2">
            <div className="hidden flex-col items-end text-right md:flex">
                <span className="label-mono max-w-48 truncate text-foreground">{user.email}</span>
                <span className="label-mono text-[10px] text-muted-foreground">Signed in</span>
            </div>
            <SignOutButton />
        </div>
    );
}
