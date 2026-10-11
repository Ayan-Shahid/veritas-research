import { PixelGrid } from "@/components/background/pixel-grid";
import { cn } from "@/lib/utils";

/** Ledger stat: mono caption pair, serif figure with a mono unit, a ruled mono footer. */
export function StatCard({
    label,
    meta,
    value,
    unit,
    aside,
    footer,
    className,
}: {
    label: string;
    meta?: string;
    value: React.ReactNode;
    unit?: string;
    aside?: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("surface flex flex-col p-6", className)}>
            <PixelGrid />
            <div className="label-mono flex items-center justify-between gap-4 text-muted-foreground">
                <span>{label}</span>
                {meta && <span className="text-foreground/80">{meta}</span>}
            </div>
            <div className="mt-6 flex items-end justify-between gap-4">
                <div className="flex items-baseline gap-2">
                    <span className="font-heading text-[40px] font-medium leading-none tracking-[-0.02em]">{value}</span>
                    {unit && <span className="font-mono text-sm text-foreground/80">{unit}</span>}
                </div>
                {aside}
            </div>
            {footer && (
                <div className="label-mono mt-6 flex items-center justify-between gap-4 border-t border-border pt-4 text-[10px] text-muted-foreground">
                    {footer}
                </div>
            )}
        </div>
    );
}
