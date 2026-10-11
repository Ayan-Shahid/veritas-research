"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Popover } from "@base-ui/react/popover";
import { ArrowRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    useMarkAllNotificationsRead,
    useMarkNotificationRead,
    useNotifications,
    type AppNotification,
} from "@/hooks/use-notifications";

const KIND: Record<AppNotification["kind"], { label: string; variant: "success" | "destructive" | "secondary" }> = {
    job_succeeded: { label: "Memo ready", variant: "success" },
    job_failed: { label: "Failed", variant: "destructive" },
    job_started: { label: "Started", variant: "secondary" },
};

function timeAgo(iso: string): string {
    const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return "just now";
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(iso).toLocaleDateString();
}

/** Bell in the header: the same /notifications feed the toasts come from, kept after they fade. */
export function NotificationMenu() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const { data: notifications = [], isLoading, isError } = useNotifications();
    const { mutate: markRead } = useMarkNotificationRead();
    const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllNotificationsRead();
    const unread = notifications.filter((n) => !n.read_at).length;

    const openNotification = (n: AppNotification) => {
        if (!n.read_at) markRead(n.id);
        if (n.memo_id) {
            setOpen(false);
            router.push(`/memos/${n.memo_id}`);
        }
    };

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
                        className="relative text-muted-foreground"
                    />
                }
            >
                <Bell />
                {unread > 0 && <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-destructive" />}
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Positioner side="bottom" align="end" sideOffset={8} className="z-[60]">
                    <Popover.Popup className="flex max-h-[min(32rem,calc(100vh-6rem))] w-[min(24rem,calc(100vw-2rem))] flex-col rounded-xs border border-border bg-popover text-popover-foreground outline-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 transition-opacity duration-150">
                        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
                            <div className="flex flex-col">
                                <Popover.Title className="font-heading text-xl font-medium leading-tight">Notifications</Popover.Title>
                                <span className="label-mono text-[10px] text-muted-foreground">{unread > 0 ? `${unread} unread` : "All caught up"}</span>
                            </div>
                            <Button variant="action" disabled={unread === 0 || isMarkingAll} onClick={() => markAllRead()} className="text-[10px]">
                                Mark all read
                            </Button>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto">
                            {isLoading ? (
                                <p className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">Loading…</p>
                            ) : isError ? (
                                <p className="px-4 py-8 text-center font-mono text-xs text-destructive">Couldn&apos;t load notifications.</p>
                            ) : notifications.length === 0 ? (
                                <p className="px-4 py-8 text-center font-mono text-xs leading-relaxed text-muted-foreground">
                                    Nothing yet. You&apos;ll see memo jobs here when they finish or fail.
                                </p>
                            ) : (
                                <ul>
                                    {notifications.map((n) => {
                                        const kind = KIND[n.kind] ?? { label: n.kind, variant: "secondary" as const };
                                        const isUnread = !n.read_at;
                                        return (
                                            <li key={n.id} className="border-b border-border last:border-b-0">
                                                <button
                                                    type="button"
                                                    onClick={() => openNotification(n)}
                                                    className={cn(
                                                        "relative flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                                                        isUnread && "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary",
                                                    )}
                                                >
                                                    <span className="flex items-center justify-between gap-3">
                                                        <Badge variant={kind.variant}>{kind.label}</Badge>
                                                        <span className="label-mono text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                                                    </span>
                                                    <span className={cn("text-sm leading-snug", isUnread ? "text-foreground" : "text-foreground/70")}>{n.message}</span>
                                                    {n.memo_id && (
                                                        <span className="label-mono flex items-center gap-1 text-[10px] text-primary">
                                                            Open memo <ArrowRight className="size-3" />
                                                        </span>
                                                    )}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}
