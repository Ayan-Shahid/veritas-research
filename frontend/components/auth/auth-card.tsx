import { cn } from "@/lib/utils";
import { PixelGrid } from "@/components/background/pixel-grid";

const glass = "surface";

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
                <PixelGrid />
                <div className="flex flex-col space-y-1.5 p-6">
                    <h1 className="font-heading text-2xl font-medium leading-tight tracking-[-0.01em]">{title}</h1>
                    {description && <p className="text-sm text-muted-foreground">{description}</p>}
                </div>
                <div className="flex flex-col gap-4 p-6 pt-0">{children}</div>
            </div>
        </main>
    );
}