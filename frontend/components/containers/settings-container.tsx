"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { SettingsView } from "@/components/views/settings-view";

export function SettingsContainer() {
    const { user, isAnonymous } = useAuth();

    return <SettingsView email={user.email ?? null} isAnonymous={isAnonymous} createdAt={user.createdAt} />;
}
