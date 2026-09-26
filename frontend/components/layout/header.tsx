"use client";

import { Search, Bell, Moon, Sun, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { useTheme } from "next-themes";

export function Header() {
    const { isSidebarOpen, toggleSidebar } = useUIStore();
    const { resolvedTheme, setTheme } = useTheme();

    return (
        <header className={cn(
            "fixed top-0 right-0 h-16 bg-background/85 backdrop-blur-xl border-b border-border z-30 flex items-center justify-between px-4 lg:px-6 transition-all duration-300 ease-in-out",
            isSidebarOpen ? "left-0 lg:left-64" : "left-0"
        )}>
            <div className="flex items-center gap-3 lg:gap-4 flex-1 max-w-2xl">
                {/* Desktop Toggle: Hidden on mobile */}
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="hidden lg:flex text-muted-foreground shrink-0">
                    <Menu className="w-5 h-5" />
                </Button>

                <div className="relative w-full flex items-center">
                    <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
                    <Input
                        className="w-full pl-9 bg-muted/50 border-none focus-visible:ring-1 text-sm"
                        placeholder="Search tickers, filings, or memos..."
                    />
                </div>
            </div>
            <div className="flex items-center gap-1 lg:gap-2">
                <Button variant="ghost" size="icon" className="text-muted-foreground relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary ring-2 ring-background"></span>
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Sun className="w-5 h-5 hidden dark:block" />
                    <Moon className="w-5 h-5 block dark:hidden" />
                </Button>
            </div>
        </header>
    );
}