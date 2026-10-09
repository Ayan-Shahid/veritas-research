"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthProvider } from "@/components/providers/auth-provider";
import { NotificationToaster } from "@/components/providers/notification-toaster";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import {ClientBackground} from "@/components/background/client-background.tsx";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);

    return (
        <AuthProvider>
            <div className="min-h-screen">
                <ClientBackground />
                <Header />
                <Sidebar />
                <main
                    className={cn(
                        "min-h-screen pt-16 transition-all duration-300 ease-in-out",
                        isSidebarOpen ? "lg:pl-64 pl-0" : "pl-0"
                    )}
                >
                    {children}
                </main>
            </div>
            <NotificationToaster />
        </AuthProvider>
    );
}