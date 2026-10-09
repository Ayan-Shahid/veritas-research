"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Bookmark, Database, Menu, Settings } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const TERMINAL_NAV = [
    { href: "/companies", label: "Companies", icon: Building2 },
    { href: "/watchlist", label: "Watchlist", icon: Bookmark },
    { href: "/organizations", label: "Organizations", icon: Database },
] as const;

const ACCOUNT_NAV = [{ href: "/settings", label: "Settings", icon: Settings }] as const;

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
    const pathname = usePathname();
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
        <Link
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
        >
            <Icon className="w-4 h-4" />
            <span className="text-sm">{label}</span>
        </Link>
    );
}

const NavContent = () => (
    <div className="flex flex-col h-full backdrop-saturate-150 backdrop-blur-lg">
        <div className="h-16 px-6 flex items-center bg-muted/50 border-b border-border shrink-0">
            <div className="flex flex-col">
                <span className="font-sans text-lg tracking-tight text-foreground uppercase font-bold leading-none">Veritas</span>
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Institutional</span>
            </div>
        </div>

        <div className="px-6 pt-6 pb-2">
            <span className="font-sans text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Terminal Navigation</span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
            {TERMINAL_NAV.map((item) => (
                <NavLink key={item.href} {...item} />
            ))}
        </nav>

        <div className="px-6 pt-6 pb-2">
            <span className="font-sans text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Account</span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
            {ACCOUNT_NAV.map((item) => (
                <NavLink key={item.href} {...item} />
            ))}
        </nav>
    </div>
);

export function Sidebar() {
    const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);

    return (
        <>
            {/* 2. Desktop Sidebar: Hidden on mobile (lg:flex) */}
            <aside
                className={cn(
                    "hidden lg:flex fixed left-0 top-0 h-screen w-64 border-r border-border z-40 flex-col justify-between transition-transform duration-300 ease-in-out",
                    !isSidebarOpen && "-translate-x-full"
                )}
            >
                <NavContent/>
            </aside>

            {/* 3. Mobile Sidebar: Sheet overlay triggered by a Floating Action Button */}
            <div className="lg:hidden">
                <Sheet>
                    <SheetTrigger render={<Button
                        size="icon"
                        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl bg-primary text-primary-foreground hover:scale-105 transition-transform"
                    />}>

                        <Menu className="w-6 h-6"/>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-72 border-r border-border">
                        <SheetTitle className="sr-only">Mobile Navigation</SheetTitle>
                        <NavContent/>
                    </SheetContent>
                </Sheet>
            </div>
        </>
    );
}