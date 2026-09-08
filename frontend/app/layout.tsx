import type { Metadata } from "next";
import "./globals.css";
import { Geist, Merriweather } from "next/font/google";
import { cn } from "@/lib/utils";

const merriweatherHeading = Merriweather({subsets:['latin'],variable:'--font-heading'});

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Veritas Research",
  description: "AI research copilot for investment teams",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans dark", geist.variable, merriweatherHeading.variable)}>
      <body>{children}</body>
    </html>
  );
}
