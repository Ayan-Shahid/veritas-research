import type { LucideIcon } from "lucide-react";
import { GlassCard, GLASS } from "@/components/auth/register/glass-card";
import { cn } from "@/lib/utils";

/** The "V" mark + wordmark shown above every auth card. */
export function AuthBrand() {
    return (
        <div className="fx-rise flex items-center gap-3">
            <span className={cn(GLASS, "grid size-10 place-items-center rounded-xl font-sans text-lg font-bold text-primary")}>V</span>
            <div className="flex flex-col leading-none">
                <span className="font-sans text-lg font-bold uppercase tracking-tight">Veritas</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Research</span>
            </div>
        </div>
    );
}

/** Centered page + brand + frosted card. The shader background comes from app/(auth)/layout.tsx. */
export function AuthShell({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex min-h-screen items-center justify-center p-4 py-10">
            <div className="flex w-full max-w-md flex-col items-center gap-6">
                <AuthBrand />
                <GlassCard className="w-full">
                    <div className="flex flex-col gap-6 p-6 md:p-8">{children}</div>
                </GlassCard>
            </div>
        </main>
    );
}

export function AuthHeader({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-4 text-center">
            <div className="fx-pop relative grid size-14 place-items-center rounded-2xl border border-foreground/10 bg-gradient-to-br from-primary/25 to-cyan-400/15 text-primary shadow-[0_8px_24px_-8px_var(--primary)]">
                <span aria-hidden className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
                <Icon className="fx-float relative size-6" />
            </div>
            <div className="flex flex-col gap-1.5">
                <h1 className="font-heading text-2xl font-bold tracking-tight">{title}</h1>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
        </div>
    );
}