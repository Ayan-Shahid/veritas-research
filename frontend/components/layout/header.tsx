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

    // Modified for a flush top bar (border-b, no rounded corners)
    const headerGlass = "backdrop-saturate-150 border-b border-foreground/5 backdrop-blur-xl bg-gradient-to-br from-background/40 to-background/10 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)]";

    // Standard component glass
    const inputGlass = "rounded-xl text-card-foreground backdrop-saturate-150 border border-foreground/5 backdrop-blur-xl bg-gradient-to-br from-card/20 to-card/5 dark:from-card/20 dark:to-background/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]";

    return (
        <header className={cn(
            "fixed top-0 right-0 h-16 z-30 flex items-center justify-between px-4 lg:px-6 transition-all duration-300 ease-in-out",
            headerGlass,
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
                        className={cn("w-full pl-9 focus-visible:ring-1 text-sm h-10", inputGlass)}
                        placeholder="Search tickers, filings, or memos..."
                    />
                </div>
            </div>
            <div className="flex items-center gap-1 lg:gap-2">
                <Button variant="ghost" size="icon" className="text-muted-foreground relative hover:bg-foreground/5">
                    <Bell className="w-5 h-5" />
                    {unread > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
                    )}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors mr-1"
                >
                    <Sun className="w-5 h-5 hidden dark:block" />
                    <Moon className="w-5 h-5 block dark:hidden" />
                </Button>

                <AccountMenu />
            </div>
        </header>
    );
}