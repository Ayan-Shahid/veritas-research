import type { Metadata } from "next";
import "./globals.css";
import { IBM_Plex_Mono, Inter, Newsreader } from "next/font/google";
import { headers } from "next/headers";
import { cn } from "@/lib/utils";
import { NuqsAdapter } from "nuqs/adapters/next";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toast";
import {ClientBackground} from "@/components/background/client-background.tsx";


// Paper & ink type system: a text serif for headlines and figures, a neutral grotesk for reading,
// and a mono for every label, code, id and action.
const heading = Newsreader({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-heading" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono" });

export const metadata: Metadata = {

    title: "Veritas Research",
    description: "AI research copilot for investment teams",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const nonce = (await headers()).get("x-nonce") ?? undefined;

    return (
        // suppressHydrationWarning is required for next-themes to work without errors
        <html lang="en" suppressHydrationWarning className={cn("font-sans", sans.variable, heading.variable, mono.variable)}>
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