import { cn } from "@/lib/utils";

const glass =
    "rounded-xl text-card-foreground backdrop-saturate-150 border border-foreground/5 backdrop-blur-xl bg-gradient-to-br from-card/20 to-card/5 dark:from-card/20 dark:to-background/5 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)]";

export function AuthCard({
                             title,
                             description,
                             children,
                         }: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <div className={cn("w-full max-w-sm", glass)}>
                <div className="flex flex-col space-y-1.5 p-6">
                    <h1 className="font-semibold leading-none tracking-tight text-xl">{title}</h1>
                    {description && <p className="text-sm text-muted-foreground">{description}</p>}
                </div>
                <div className="flex flex-col gap-4 p-6 pt-0">{children}</div>
            </div>
        </main>
    );
}