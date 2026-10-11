"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const SECTIONS = [
    { title: "Research ledgers", items: [{ href: "/companies", label: "Companies" }] },
    { title: "Account", items: [{ href: "/settings", label: "Settings" }] },
] as const;

function NavLink({ href, label }: { href: string; label: string }) {
    const pathname = usePathname();
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
        <Link
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
                "relative flex items-center justify-between px-5 py-3 transition-colors",
                active
                    ? "bg-sidebar-accent font-sans text-[15px] font-semibold uppercase tracking-[0.02em] text-foreground before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary"
                    : "label-mono text-[12px] text-foreground/80 hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
        >
            {label}
        </Link>
    );
}

const NavContent = () => (
    <nav aria-label="Main" className="flex h-full flex-col bg-sidebar">
        {SECTIONS.map((section) => (
            <div key={section.title} className="flex flex-col border-b border-sidebar-border py-3">
                <span className="label-mono px-5 pb-3 pt-2 text-muted-foreground">{section.title}</span>
                {section.items.map((item) => (
                    <NavLink key={item.href} {...item} />
                ))}
            </div>
        ))}
    </nav>
);

export function Sidebar() {
    const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);

    return (
        <>
            {/* Desktop: sits under the full-width header. */}
            <aside
                className={cn(
                    "hidden lg:flex fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-sidebar-border z-40 flex-col transition-transform duration-300 ease-in-out",
                    !isSidebarOpen && "-translate-x-full",
                )}
            >
                <NavContent />
            </aside>

            {/* Mobile: sheet opened from a floating button. */}
            <div className="lg:hidden">
                <Sheet>
                    <SheetTrigger render={<Button size="icon" aria-label="Open navigation" className="fixed bottom-6 right-6 z-50 size-12" />}>
                        <Menu className="size-5" />
                    </SheetTrigger>
                    <SheetContent side="left" className="w-72 border-r border-sidebar-border p-0 pt-6">
                        <SheetTitle className="sr-only">Navigation</SheetTitle>
                        <NavContent />
                    </SheetContent>
                </Sheet>
            </div>
        </>
    );
}
