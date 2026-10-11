import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingNav } from "@/components/landing/landing-nav";
import { MemoPreview } from "@/components/landing/memo-preview";
import { Features, FinalCta, HowItWorks, LandingFooter, Limits, Measured, StackStrip } from "@/components/landing/landing-sections";
import { HERO } from "@/components/landing/content";
import { rise } from "@/components/landing/landing-ui";
import { safeExternalUrl } from "@/lib/safe-url";

export const metadata: Metadata = {
    title: "Veritas Research: equity research memos with citations",
    description: HERO.body,
};

export default function Home() {
    // Optional: set NEXT_PUBLIC_REPO_URL (https only) to show a link to the source on the page.
    const repoUrl = safeExternalUrl(process.env.NEXT_PUBLIC_REPO_URL);

    return (
        <>
            {/* Reveal-on-scroll hides content until JS runs; without JS, show everything. */}
            <noscript>
                <style>{"[data-reveal]{opacity:1!important;transform:none!important}"}</style>
            </noscript>

            <LandingNav />

            <main>
                <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 lg:grid-cols-[1fr_1.05fr] lg:pt-24">
                    <div className="flex flex-col items-start gap-6">
                        <span
                            className="fx-rise label-mono inline-flex items-center gap-2 text-foreground/80"
                            style={rise(0)}
                        >
                            <span className="relative flex size-2" aria-hidden>
                                <span className="absolute inline-flex size-full bg-primary/50 motion-safe:animate-ping" />
                                <span className="relative inline-flex size-2 bg-primary" />
                            </span>
                            {HERO.eyebrow}
                        </span>

                        <h1
                            className="fx-rise font-heading text-5xl font-medium leading-[1.02] tracking-[-0.025em] md:text-6xl lg:text-7xl"
                            style={rise(1)}
                        >
                            {HERO.titleLead}{" "}
                            <span className="italic text-primary">{HERO.titleAccent}</span>
                        </h1>

                        <p className="fx-rise max-w-xl text-lg leading-relaxed text-foreground/75" style={rise(2)}>
                            {HERO.body}
                        </p>

                        <div className="fx-rise flex flex-wrap items-center gap-3" style={rise(3)}>
                            <Button
                                size="lg"
                                nativeButton={false}
                                render={<Link href={HERO.primary.href} />}
                                className="group/btn"
                            >
                                {HERO.primary.label}
                                <ArrowRight className="ml-2 size-4 transition-transform group-hover/btn:translate-x-1" />
                            </Button>
                            <Button size="lg" variant="outline" nativeButton={false} render={<Link href={HERO.secondary.href} />}>
                                {HERO.secondary.label}
                            </Button>
                        </div>

                        <p className="fx-rise label-mono text-muted-foreground" style={rise(4)}>
                            {HERO.note}
                        </p>
                    </div>

                    <div className="fx-rise" style={rise(3)}>
                        <MemoPreview />
                    </div>
                </section>

                <HowItWorks />
                <Features />
                <Measured repoUrl={repoUrl} />
                <Limits />
                <StackStrip />
                <FinalCta />
            </main>

            <LandingFooter repoUrl={repoUrl} />
        </>
    );
}