"use client";

import { Search, Bell, Moon, Sun, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { useTheme } from "next-themes";
import { useUnreadCount } from "@/hooks/use-notifications";
import { AccountMenu } from "@/components/layout/account-menu";

export function Header() {
    const { isSidebarOpen, toggleSidebar } = useUIStore();
    const { resolvedTheme, setTheme } = useTheme();
    const unread = useUnreadCount();


    return (
        <header className={cn(
            "fixed top-0 right-0 h-16 z-30 flex items-center justify-between px-4 lg:px-6 transition-all duration-300 ease-in-out",
            "border-b border-border bg-background/70 backdrop-blur-md",
            isSidebarOpen ? "left-0 lg:left-64" : "left-0"
        )}>
            <div className="flex items-center gap-3 lg:gap-4 flex-1 max-w-2xl">
                {/* Desktop Toggle: Hidden on mobile */}
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="hidden lg:flex text-muted-foreground shrink-0">
                    <Menu className="w-5 h-5" />
                </Button>

                <div className="relative w-full flex items-center">
                    <Search className="absolute left-3 w-4 h-4 text-muted-foreground z-10" />
                    <Input
                        className="h-9 w-full bg-background/60 pl-9 text-sm"
                        placeholder="Search tickers, filings, or memos..."
                    />
                </div>
            </div>
            <div className="flex items-center gap-1 lg:gap-2">
                <Button variant="ghost" size="icon" aria-label="Notifications" className="text-muted-foreground relative">
                    <Bell className="w-5 h-5" />
                    {unread > 0 && (
                        <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-xs border border-primary bg-primary text-primary-foreground text-[10px] font-semibold leading-[14px] text-center">{unread > 9 ? "9+" : unread}</span>
                    )}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    aria-label="Toggle theme"
                    className="text-muted-foreground mr-1"
                >
                    <Sun className="w-5 h-5 hidden dark:block" />
                    <Moon className="w-5 h-5 block dark:hidden" />
                </Button>

                <AccountMenu />
            </div>
        </header>
    );
}