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
        <div className="w-full px-4 md:px-6 py-6 md:py-8 flex flex-col gap-6">
            <div className="flex flex-col">
                <span className="font-sans text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Preferences</span>
                <h1 className="font-heading text-3xl text-foreground tracking-tight mt-1 font-bold">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your account, security and how Veritas behaves for you.</p>
            </div>
            <div className="grid max-w-3xl gap-6">
                <AccountSection email={email} isAnonymous={isAnonymous} createdAt={createdAt} />
                <SecuritySection isAnonymous={isAnonymous} />
                <PreferencesSection />
            </div>
        </div>
    );
}