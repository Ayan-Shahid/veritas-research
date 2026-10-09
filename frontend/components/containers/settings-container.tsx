"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useMe } from "@/hooks/use-me";
import { SettingsView } from "@/components/views/settings-view";

export function SettingsContainer() {
    const { user, isAnonymous } = useAuth();
    const { data: me, isLoading } = useMe();

    return (
        <SettingsView
            email={user.email ?? null}
            isAnonymous={isAnonymous}
            createdAt={user.createdAt}
            workspaceName={me?.organization.name}
            isLoadingWorkspace={isLoading}
        />
    );
}