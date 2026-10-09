"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { useNotifications, useMarkNotificationRead } from "@/hooks/use-notifications";
import {usePreferences} from "@/store/preferences-store.ts";

export function NotificationToaster() {
    const router = useRouter();
    const { data } = useNotifications();
    const { mutate: markRead } = useMarkNotificationRead();
    const seen = useRef<Set<string> | null>(null);

    useEffect(() => {
        if (!data) return;
        if (seen.current === null) {
            seen.current = new Set(data.map((n) => n.id));
            return;
        }
        for (const n of data) {
            if (seen.current.has(n.id)) continue;
            seen.current.add(n.id);
            if (!usePreferences.getState().toastNotifications) continue;

            if (n.kind === "job_succeeded" && n.memo_id) {
                const memoId = n.memo_id;
                const id = toast.add({
                    title: "Memo ready",
                    description: n.message,
                    type: "success",
                    timeout: 12000,
                    actionProps: {
                        children: "View memo",
                        onClick: () => {
                            markRead(n.id);
                            toast.close(id);
                            router.push(`/memos/${memoId}`);
                        },
                    },
                });
            } else if (n.kind === "job_failed") {
                toast.add({ title: "Memo generation failed", description: n.message, type: "error", timeout: 15000 });
            }
        }
    }, [data, router, markRead]);

    return null;
}