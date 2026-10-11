"use client";

import Link from "next/link";
import { Search, Moon, Sun, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/ui-store";
import { useTheme } from "next-themes";
import { NotificationMenu } from "@/components/layout/notification-menu";
import { AccountMenu } from "@/components/layout/account-menu";

/** Square cobalt monogram + serif wordmark with a mono strapline. */
export function Wordmark({ href = "/companies" }: { href?: string }) {
    return (
        <Link href={href} className="flex items-center gap-3" aria-label="Veritas Research home">
            <span className="grid size-8 shrink-0 place-items-center rounded-xs border border-primary bg-primary font-heading text-[17px] font-semibold text-primary-foreground">
                V
            </span>
            <span className="hidden flex-col sm:flex">
                <span className="font-heading text-[22px] font-medium leading-none tracking-[-0.01em] text-foreground">Veritas Research</span>
                <span className="label-mono mt-1 text-[10px] text-muted-foreground">Equity intelligence</span>
            </span>
        </Link>
    );
}

export function Header() {
    const toggleSidebar = useUIStore((s) => s.toggleSidebar);
    const { resolvedTheme, setTheme } = useTheme();

    return (
        <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center gap-4 border-b border-border bg-background/90 px-4 backdrop-blur-sm lg:px-6">
            <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} aria-label="Toggle sidebar" className="hidden text-muted-foreground lg:inline-flex">
                <PanelLeft />
            </Button>
            <Wordmark />

            <div className="mx-auto hidden w-full max-w-md md:block">
                <label className="relative flex items-center">
                    <span className="sr-only">Search</span>
                    <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
                    <input
                        className="h-9 w-full rounded-xs border border-input bg-card pl-9 pr-3 font-mono text-xs tracking-[0.06em] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Search tickers, SEC filings, memos…"
                    />
                </label>
            </div>

            <div className="ml-auto flex items-center gap-1 md:ml-0">
                <NotificationMenu />
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    aria-label="Toggle theme"
                    className="text-muted-foreground"
                >
                    <Sun className="hidden dark:block" />
                    <Moon className="block dark:hidden" />
                </Button>
                <div className="mx-2 hidden h-8 w-px bg-border md:block" aria-hidden />
                <AccountMenu />
            </div>
        </header>
    );
}
