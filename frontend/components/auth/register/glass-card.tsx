import { cn } from "@/lib/utils";

/** Frosted panel with one plain border: the `surface` utility in app/globals.css. */
export const GLASS = "surface";

export function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn("relative fx-card-in", GLASS, className)}>{children}</div>;
}
