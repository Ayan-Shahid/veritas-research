import { cn } from "@/lib/utils";

/** Cobalt square + mono breadcrumb path, e.g. ■ COVERAGE UNIVERSE / COMPANIES */
export function Eyebrow({ path, className }: { path: readonly string[]; className?: string }) {
    return (
        <div className={cn("label-mono flex flex-wrap items-center gap-x-2 text-foreground/80", className)}>
            <span aria-hidden className="size-2 bg-primary" />
            {path.map((part, i) => (
                <span key={part} className="flex items-center gap-2">
                    {i > 0 && <span className="text-muted-foreground">/</span>}
                    <span className={i === path.length - 1 && path.length > 1 ? "text-muted-foreground" : undefined}>{part}</span>
                </span>
            ))}
        </div>
    );
}

/** Editorial page heading: eyebrow, large serif title, sans standfirst, actions on the right. */
export function PageHeader({
    eyebrow,
    title,
    description,
    actions,
}: {
    eyebrow: readonly string[];
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col gap-3">
                <Eyebrow path={eyebrow} />
                <h1 className="font-heading text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-foreground md:text-5xl">{title}</h1>
                {description && <p className="max-w-2xl text-[15px] leading-relaxed text-foreground/75">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">{actions}</div>}
        </div>
    );
}
