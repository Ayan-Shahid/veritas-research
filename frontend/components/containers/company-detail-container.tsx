"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/hooks/use-companies";
import { useFilings, useFilingActions } from "@/hooks/use-filings";
import { useMemos, useMemoActions, useJob } from "@/hooks/use-memos";
import { CompanyDetailView } from "@/components/views/company-detail-view";

export function CompanyDetailContainer({ companyId }: { companyId: string }) {
    const router = useRouter();
    const queryClient = useQueryClient();

    // Tracks the current background job being polled
    const [activeJobId, setActiveJobId] = useState<string | null>(null);

    // 1. Fetch Data
    const { data: company, isLoading: isLoadingCompany } = useCompany(companyId);
    const { data: filings = [] } = useFilings(companyId);
    const { data: memos = [] } = useMemos(companyId);

    // 2. Setup Mutations & Polling
    const { sync: syncFilings, ingest: ingestFiling, purge: purgeFiling } = useFilingActions(companyId);
    const { generate: generateMemo } = useMemoActions(undefined, companyId);
    const { data: jobStatus } = useJob(activeJobId);

    // 3. Handle Job Completion Side-Effects (Routing & Alerts)
    useEffect(() => {
        if (jobStatus?.status === "succeeded") {
            queryClient.invalidateQueries({ queryKey: ['memos', companyId] });
            if (jobStatus.memo_id) {
                router.push(`/memos/${jobStatus.memo_id}`);
            }
        } else if (jobStatus?.status === "failed") {
            alert(`Generation failed: ${jobStatus.error}`);
        }
    }, [
        jobStatus?.status,
        jobStatus?.memo_id,
        jobStatus?.error,
        companyId,
        queryClient,
        router
    ]);

    // Handle Loading
    if (isLoadingCompany || !company) {
        return <div className="p-8 pt-24 text-center text-muted-foreground pl-64">Loading company details...</div>;
    }

    return (
        <CompanyDetailView
            company={company}
            filings={filings}
            memos={memos}
            activeJob={jobStatus}
            isSyncing={syncFilings.isPending}
            onSync={() => syncFilings.mutate()}
            onIngest={(filingId) => ingestFiling.mutate(filingId)}
            onPurge={(filingId) => {
                if(window.confirm("Purge all vectorized chunks for this filing?")) purgeFiling.mutate(filingId);
            }}
            onGenerateMemo={() => {
                generateMemo.mutate(undefined, {
                    onSuccess: (job) => setActiveJobId(job.id) // This seamlessly overrides any previous failed job ID
                });
            }}
            isIngestingId={ingestFiling.isPending ? ingestFiling.variables : null}
            isPurgingId={purgeFiling.isPending ? purgeFiling.variables : null}
        />
    );
}