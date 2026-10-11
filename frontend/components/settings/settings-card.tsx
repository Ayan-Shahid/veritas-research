import { PixelGrid } from "@/components/background/pixel-grid";

export function SettingsCard({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="surface flex flex-col">
            <PixelGrid />
            <div className="flex flex-col gap-1 border-b border-border px-6 py-5">
                <h2 className="font-heading text-2xl font-medium leading-tight tracking-[-0.01em]">{title}</h2>
                {description && <p className="label-mono text-muted-foreground">{description}</p>}
            </div>
            <div className="flex flex-col gap-4 p-6">{children}</div>
        </section>
    );
}
