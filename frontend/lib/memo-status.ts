import type { Memo } from "@/types";

/** Badge variant for a memo's review status. */
export function memoStatusVariant(status: Memo["status"]): "success" | "destructive" | "warning" {
    if (status === "approved") return "success";
    if (status === "rejected") return "destructive";
    return "warning";
}
