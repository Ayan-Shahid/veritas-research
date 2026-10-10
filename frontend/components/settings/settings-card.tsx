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
        <section className="surface flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-1">
                <h2 className="font-heading font-bold leading-none tracking-tight text-lg">{title}</h2>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {children}
        </section>
    );
}