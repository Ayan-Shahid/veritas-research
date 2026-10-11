"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/store/preferences-store";
import { SettingsCard } from "@/components/settings/settings-card";

const THEMES = [
    { value: "system", label: "System", icon: Monitor },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
] as const;

export function PreferencesSection() {
    const { theme, setTheme } = useTheme();
    const toastNotifications = usePreferences((s) => s.toastNotifications);
    const setToastNotifications = usePreferences((s) => s.setToastNotifications);

    return (
        <SettingsCard title="Preferences" description="Stored in this browser.">
            <div className="flex flex-col gap-2">
                <span className="label-mono text-muted-foreground" id="theme-label">Theme</span>
                <div role="radiogroup" aria-labelledby="theme-label" className="grid grid-cols-3 gap-2">
                    {THEMES.map(({ value, label, icon: Icon }) => (
                        <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={theme === value}
                            onClick={() => setTheme(value)}
                            className={cn(
                                "label-mono flex items-center justify-center gap-2 rounded-xs border px-3 py-2.5 transition-colors",
                                theme === value
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-card text-foreground/80 hover:bg-muted hover:text-foreground",
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                <div>
                    <p className="text-sm font-medium" id="toast-label">Pop-up notifications</p>
                    <p className="text-xs text-muted-foreground">
                        Show a toast when a memo finishes or fails. The bell in the header still tracks them.
                    </p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={toastNotifications}
                    aria-labelledby="toast-label"
                    onClick={() => setToastNotifications(!toastNotifications)}
                    className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-xs border transition-colors",
                        toastNotifications ? "border-primary bg-primary" : "border-border bg-muted",
                    )}
                >
                    <span
                        className={cn(
                            "inline-block h-4 w-4 rounded-xs bg-background transition-transform",
                            toastNotifications ? "translate-x-6" : "translate-x-1",
                        )}
                    />
                </button>
            </div>
        </SettingsCard>
    );
}