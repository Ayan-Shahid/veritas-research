"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <Sidebar />
            <main
                className={cn(
                    "min-h-screen pt-16 transition-all duration-300 ease-in-out",
                    // Fix: Apply 64 padding ONLY on large screens (lg:pl-64)
                    isSidebarOpen ? "lg:pl-64 pl-0" : "pl-0"
                )}
            >
                {children}
            </main>
        </div>
    );
}