import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { GLASS } from "./landing-ui";
import { cn } from "@/lib/utils";

const LINKS = [
    { href: "#how-it-works", label: "How it works" },
    { href: "#features", label: "Features" },
    { href: "#measured", label: "How it's checked" },
    { href: "#limits", label: "Limits" },
] as const;

export function Brand() {
    return (
        <Link href="/" className="flex items-center gap-3" aria-label="Veritas Research home">
            <span className={cn(GLASS, "grid size-9 place-items-center rounded-xl font-sans text-base font-bold text-primary")}>V</span>
            <span className="flex flex-col leading-none">
                <span className="font-sans text-base font-bold uppercase tracking-tight">Veritas</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Research</span>
            </span>
        </Link>
    );
}

export function LandingNav() {
    return (
        <header className="sticky top-0 z-50 px-4 pt-4">
            <div className={cn(GLASS, "mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4")}>
                <Brand />
                <nav aria-label="Page sections" className="hidden items-center gap-1 md:flex">
                    {LINKS.map((l) => (
                        <a
                            key={l.href}
                            href={l.href}
                            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
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