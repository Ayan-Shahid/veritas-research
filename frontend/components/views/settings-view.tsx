import { PageHeader } from "@/components/layout/page-header";
import { AccountSection } from "@/components/settings/account-section";
import { SecuritySection } from "@/components/settings/security-section";
import { PreferencesSection } from "@/components/settings/preferences-section";

interface SettingsViewProps {
    email: string | null;
    isAnonymous: boolean;
    createdAt: string;
}

export function SettingsView({ email, isAnonymous, createdAt }: SettingsViewProps) {
    return (
        <div className="w-full px-4 md:px-8 py-8 flex flex-col gap-8">
            <PageHeader
                eyebrow={["Account", "Settings"]}
                title="Settings"
                description="Manage your account, security and how Veritas behaves for you."
            />
            <div className="grid max-w-3xl gap-6">
                <AccountSection email={email} isAnonymous={isAnonymous} createdAt={createdAt} />
                <SecuritySection isAnonymous={isAnonymous} />
                <PreferencesSection />
            </div>
        </div>
    );
}