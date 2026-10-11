import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
    { href: "#how-it-works", label: "How it works" },
    { href: "#features", label: "Features" },
    { href: "#measured", label: "How it's checked" },
    { href: "#limits", label: "Limits" },
] as const;

export function Brand() {
    return (
        <Link href="/" className="flex items-center gap-3" aria-label="Veritas Research home">
            <span className="grid size-8 place-items-center rounded-xs border border-primary bg-primary font-heading text-[17px] font-semibold text-primary-foreground">V</span>
            <span className="flex flex-col leading-none">
                <span className="font-heading text-[22px] font-medium tracking-[-0.01em]">Veritas Research</span>
                <span className="label-mono mt-1 text-[10px] text-muted-foreground">Equity intelligence</span>
            </span>
        </Link>
    );
}

export function LandingNav() {
    return (
        <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
                <Brand />
                <nav aria-label="Page sections" className="hidden items-center gap-1 md:flex">
                    {LINKS.map((l) => (
                        <a
                            key={l.href}
                            href={l.href}
                            className="label-mono rounded-xs px-3 py-1.5 text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                        >
                            {l.label}
                        </a>
                    ))}
                </nav>
                <div className="flex items-center gap-1.5">
                    <ThemeToggle />
                    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login" />} className="hidden sm:inline-flex">
                        Sign in
                    </Button>
                    <Button size="sm" nativeButton={false} render={<Link href="/companies" />}>
                        Try it
                    </Button>
                </div>
            </div>
        </header>
    );
}