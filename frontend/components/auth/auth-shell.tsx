import type { LucideIcon } from "lucide-react";
import { GlassCard } from "@/components/auth/register/glass-card";

/** The "V" mark + wordmark shown above every auth card. */
export function AuthBrand() {
    return (
        <div className="fx-rise flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xs border border-primary bg-primary font-heading text-xl font-semibold text-primary-foreground">V</span>
            <div className="flex flex-col leading-none">
                <span className="font-heading text-2xl font-medium tracking-[-0.01em]">Veritas Research</span>
                <span className="label-mono mt-1 text-[10px] text-muted-foreground">Equity intelligence</span>
            </div>
        </div>
    );
}

/** Centered page + brand + frosted card. The grid background comes from the root layout. */
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
            <div className="fx-pop grid size-12 place-items-center rounded-xs border border-border bg-background text-primary">
                <Icon className="size-5" />
            </div>
            <div className="flex flex-col gap-1.5">
                <h1 className="font-heading text-3xl font-medium tracking-[-0.01em]">{title}</h1>
                <p className="text-[15px] text-foreground/70">{subtitle}</p>
            </div>
        </div>
    );
}