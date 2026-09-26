import type { Metadata } from "next";
import "./globals.css";
import { Geist, Merriweather } from "next/font/google";
import { cn } from "@/lib/utils";
import {NuqsAdapter} from "nuqs/adapters/next";
import {QueryProvider} from "@/components/providers/query-provider";
import {ThemeProvider} from "next-themes";

const merriweatherHeading = Merriweather({subsets:['latin'],variable:'--font-heading'});

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Veritas Research",
  description: "AI research copilot for investment teams",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        // suppressHydrationWarning is required for next-themes to work without errors
        <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable, merriweatherHeading.variable)}>
        <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <QueryProvider>
                <NuqsAdapter>
                    {children}
                </NuqsAdapter>
            </QueryProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}
