import Link from "next/link";
import { ArrowRight, Bell, Building2, ClipboardList, FileCheck, Fingerprint, History } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { Brand } from "./landing-nav";
import { GLASS } from "./landing-ui";
import { FEATURES, FINAL_CTA, FOOTER_NOTE, LIMITS, MEASURED, STACK, STEPS } from "./content";

const ICONS: Record<(typeof FEATURES)[number]["icon"], LucideIcon> = {
    fingerprint: Fingerprint,
    filecheck: FileCheck,
    history: History,
    clipboard: ClipboardList,
    bell: Bell,
    building: Building2,
};

function SectionHeading({ eyebrow, title, className }: { eyebrow: string; title: string; className?: string }) {
    return (
        <div className={cn("flex flex-col gap-3", className)}>
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-primary">{eyebrow}</span>
            <h2 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
        </div>
    );
}

export function HowItWorks() {
    return (
        <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-20">
            <Reveal>
                <SectionHeading eyebrow="How it works" title="From filing to reviewed memo in four steps." />
            </Reveal>
            <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {STEPS.map((step, i) => (
                    <li key={step.title}>
                        <Reveal delay={i * 90} className="h-full">
                            <div className={cn(GLASS, "flex h-full flex-col gap-4 p-6 transition-colors duration-200 hover:border-foreground/30")}>
                                <span className="font-mono text-sm font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>
                                <h3 className="font-heading text-xl font-semibold tracking-tight">{step.title}</h3>
                                <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                            </div>
                        </Reveal>
                    </li>
                ))}
            </ol>
        </section>
    );
}

export function Features() {
    return (
        <section id="features" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-20">
            <Reveal>
                <SectionHeading eyebrow="What's in it" title="Built so the review step is easy to do." />
            </Reveal>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((f, i) => {
                    const Icon = ICONS[f.icon];
                    return (
                        <Reveal key={f.title} delay={(i % 3) * 80} className="h-full">
                            <div className={cn(GLASS, "flex h-full flex-col gap-4 p-6 transition-colors duration-200 hover:border-foreground/30")}>
                                <span className="grid size-10 place-items-center rounded-xs border border-border bg-background text-primary">
                                    <Icon className="size-5" />
                                </span>
                                <h3 className="font-heading text-lg font-semibold tracking-tight">{f.title}</h3>
                                <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                            </div>
                        </Reveal>
                    );
                })}
            </div>
        </section>
    );
}

export function Measured({ repoUrl }: { repoUrl: string | null }) {
    return (
        <section id="measured" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-20">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
                <Reveal className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
                    <SectionHeading eyebrow="How it's checked" title={MEASURED.title} />
                    <p className="text-base leading-relaxed text-muted-foreground">{MEASURED.intro}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{MEASURED.footer}</p>
                    {repoUrl && (
                        <a
                            href={repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-fit font-mono text-sm font-semibold text-primary underline-offset-4 hover:underline"
                        >
                            Read the scorers in the repo ↗
                        </a>
                    )}
                </Reveal>
                <div className="flex flex-col gap-4">
                    {MEASURED.scorers.map((s, i) => (
                        <Reveal key={s.name} delay={i * 90}>
                            <div className={cn(GLASS, "flex flex-col gap-4 p-6")}>
                                <h3 className="font-heading text-lg font-semibold tracking-tight">{s.name}</h3>
                                <div className="flex flex-col gap-1">
                                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">Checks</span>
                                    <p className="text-sm leading-relaxed">{s.checks}</p>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                        Doesn&apos;t tell you
                                    </span>
                                    <p className="text-sm leading-relaxed text-muted-foreground">{s.limit}</p>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function Limits() {
    return (
        <section id="limits" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-20">
            <Reveal>
                <SectionHeading eyebrow="Limits" title={LIMITS.title} />
            </Reveal>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
                {LIMITS.items.map((item, i) => (
                    <Reveal key={item.title} delay={(i % 2) * 90} className="h-full">
                        <div className={cn(GLASS, "h-full border-l-2 border-l-warning p-6")}>
                            <h3 className="font-heading text-lg font-semibold tracking-tight">{item.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                        </div>
                    </Reveal>
                ))}
            </div>
        </section>
    );
}

export function StackStrip() {
    return (
        <section aria-label="Built with" className="mx-auto max-w-6xl px-4 py-10">
            <Reveal className="flex flex-col items-center gap-4">
                <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Built with</span>
                <ul className="flex flex-wrap justify-center gap-2.5">
                    {STACK.map((name) => (
                        <li
                            key={name}
                            className="tag rounded-xs px-3 py-1 text-sm [--tag-c:var(--secondary)] [--tag-fg:var(--secondary-foreground)]"
                        >
                            {name}
                        </li>
                    ))}
                </ul>
            </Reveal>
        </section>
    );
}

export function FinalCta() {
    return (
        <section className="mx-auto max-w-4xl px-4 py-20">
            <Reveal>
                <div className={cn(GLASS, "px-8 py-14 text-center")}>
                    <div className="flex flex-col items-center gap-6">
                        <h2 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">{FINAL_CTA.title}</h2>
                        <p className="max-w-md text-sm text-muted-foreground">{FINAL_CTA.body}</p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <Button size="lg" nativeButton={false} render={<Link href="/companies" />} className="group/btn">
                                Try it as a guest
                                <ArrowRight className="ml-2 size-4 transition-transform group-hover/btn:translate-x-1" />
                            </Button>
                            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/login" />}>
                                Sign in
                            </Button>
                        </div>
                    </div>
                </div>
            </Reveal>
        </section>
    );
}

export function LandingFooter({ repoUrl }: { repoUrl: string | null }) {
    return (
        <footer className="mx-auto max-w-6xl px-4 pb-10 pt-6">
            <div className="flex flex-col gap-6 border-t border-border pt-8 md:flex-row md:items-start md:justify-between">
                <div className="flex max-w-md flex-col gap-3">
                    <Brand />
                    <p className="text-xs leading-relaxed text-muted-foreground">{FOOTER_NOTE}</p>
                </div>
                <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <Link href="/login" className="transition-colors hover:text-foreground">Sign in</Link>
                    <Link href="/register" className="transition-colors hover:text-foreground">Create account</Link>
                    <Link href="/companies" className="transition-colors hover:text-foreground">Try as guest</Link>
                    {repoUrl && (
                        <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
                            Source ↗
                        </a>
                    )}
                </nav>
            </div>
        </footer>
    );
}