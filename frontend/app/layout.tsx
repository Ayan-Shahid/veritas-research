import type { Metadata } from "next";
import "./globals.css";
import { Geist, Merriweather } from "next/font/google";
import { headers } from "next/headers";
import { cn } from "@/lib/utils";
import { NuqsAdapter } from "nuqs/adapters/next";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toast";
import dynamic from "next/dynamic";
import {ClientBackground} from "@/components/background/client-background.tsx";


const merriweatherHeading = Merriweather({ subsets: ["latin"], weight: ["300", "400", "700", "900"], variable: "--font-heading" });
const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {

    title: "Veritas Research",
    description: "AI research copilot for investment teams",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const nonce = (await headers()).get("x-nonce") ?? undefined;

    return (
        // suppressHydrationWarning is required for next-themes to work without errors
        <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable, merriweatherHeading.variable)}>
        <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange nonce={nonce}>
            {/* Global Shader Background */}
            <ClientBackground />

            <QueryProvider>
                <NuqsAdapter>
                    <Toaster>{children}</Toaster>
                </NuqsAdapter>
            </QueryProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}