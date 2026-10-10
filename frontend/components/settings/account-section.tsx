import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/settings/settings-card";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <dt className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{label}</dt>
            <dd className="text-sm break-all">{children}</dd>
        </div>
    );
}

interface AccountSectionProps {
    email: string | null;
    isAnonymous: boolean;
    createdAt: string;
}

export function AccountSection({ email, isAnonymous, createdAt }: AccountSectionProps) {
    const memberSince = new Date(createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <SettingsCard title="Account" description="How you're signed in to Veritas.">
            <dl className="grid gap-4 sm:grid-cols-2">
                <Row label="Email">{email ?? "None (guest)"}</Row>
                <Row label="Account type">
                    <Badge variant={isAnonymous ? "warning" : "success"}>{isAnonymous ? "Guest" : "Full account"}</Badge>
                </Row>
                <Row label="Member since">{memberSince}</Row>
            </dl>
            {isAnonymous && (
                <div className="flex flex-col gap-3 rounded-xs border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                        Guest workspaces live in this browser only. Add an email and password to keep your work and use it anywhere.
                    </p>
                    <Button size="sm" nativeButton={false} render={<Link href="/register" />}>
                        Save your work
                    </Button>
                </div>
            )}
        </SettingsCard>
    );
}