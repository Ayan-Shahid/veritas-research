"use client";

import dynamic from "next/dynamic";

// The dynamic import with ssr: false is now safely inside a Client Component
export const ClientBackground = dynamic(
    () => import("@/components/background/shader-background").then(mod => mod.VeritasBackground),
    { ssr: false }
);