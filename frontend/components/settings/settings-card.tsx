const glass =
    "rounded-xl text-card-foreground backdrop-saturate-150 border border-foreground/5 backdrop-blur-xl bg-gradient-to-br from-card/20 to-card/5 dark:from-card/20 dark:to-background/5 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)]";

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
        <section className={`${glass} flex flex-col gap-4 p-6`}>
            <div className="flex flex-col gap-1">
                <h2 className="font-semibold leading-none tracking-tight text-lg">{title}</h2>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {children}
        </section>
    );
}