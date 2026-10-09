"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";

export function SignOutButton() {
    const [pending, start] = useTransition();
    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            disabled={pending}
            className="text-muted-foreground"
            onClick={() =>
                start(async () => {
                    await signOutAction(); // POST server action: Origin-checked, never a GET link
                    window.location.assign("/"); // full reload also drops the React Query cache
                })
            }
        >
            <LogOut className="h-4 w-4" />
        </Button>
    );
}