import { cn } from "@/lib/utils";
import { PixelGrid } from "@/components/background/pixel-grid";

/** Frosted panel with one plain border: the `surface` utility in app/globals.css. */
export const GLASS = "surface";

export function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("fx-card-in", GLASS, className)}>
            <PixelGrid />
            {children}
        </div>
    );
}
