"use client";

import { useMemo as useMemoQuery, useMemoActions, useMemoVersions, useMemoAuditLog } from "@/hooks/use-memos";
import { useCompany } from "@/hooks/use-companies";
import { MemoView } from "@/components/views/memo-view";

interface MemoContainerProps {
    memoId: string;
}

export function MemoContainer({ memoId }: MemoContainerProps) {
    // 1. Fetch primary data
    const { data: memo, isLoading: isMemoLoading, isError: isMemoError } = useMemoQuery(memoId);
    const { data: company, isLoading: isCompanyLoading, isError: isCompanyError } = useCompany(memo?.company_id);

    // 2. Fetch ancillary data (History & Audit Log)
    const { data: versions = [] } = useMemoVersions(memoId);
    const { data: auditLog = [] } = useMemoAuditLog(memoId);

    // 3. Fetch actions
    const { update, approve, reject, remove } = useMemoActions(memoId, memo?.company_id);

    // 4. Loading & Error States
    if (isMemoLoading) return <div className="p-8 pt-24 pl-64 text-center text-muted-foreground">Loading memo data...</div>;
    if (isMemoError || !memo) return <div className="p-8 pt-24 pl-64 text-center text-destructive">Memo not found or API error.</div>;
    if (isCompanyLoading || !company) return <div className="p-8 pt-24 pl-64 text-center text-muted-foreground">Loading company details...</div>;
    if (isCompanyError) return <div className="p-8 pt-24 pl-64 text-center text-destructive">Failed to load company details.</div>;

    // 5. Pass down to dumb component
    return (
        <MemoView
            memo={memo}
            company={company}
            versions={versions}
            auditLog={auditLog}
            onUpdate={(newContent) => update.mutate(newContent)}
            onApprove={() => approve.mutate()}
            onReject={() => reject.mutate()}
            onDelete={() => {
                if (window.confirm("Are you sure you want to delete this memo?")) {
                    remove.mutate();
                }
            }}
            isPending={approve.isPending || reject.isPending || remove.isPending}
            isUpdating={update.isPending}
        />
    );
}