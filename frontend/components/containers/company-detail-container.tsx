"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/hooks/use-companies";
import { useFilings, useFilingActions } from "@/hooks/use-filings";
import { useMemos, useMemoActions, useJob } from "@/hooks/use-memos";
import { CompanyDetailView } from "@/components/views/company-detail-view";
import {toast} from "@/components/ui/toast";

export function CompanyDetailContainer({ companyId }: { companyId: string }) {
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

    // 3. Job completion: refresh data. Toasts come from <NotificationToaster/>,
    //    which reacts to the backend notification row this invalidation refetches.
    useEffect(() => {
        if (jobStatus?.status === "succeeded" || jobStatus?.status === "failed") {
            queryClient.invalidateQueries({ queryKey: ["memos", companyId] });
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
    }, [jobStatus?.status, companyId, queryClient]);

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
            onSync={() =>
                syncFilings.mutate(undefined, {
                    onError: (err) => toast.add({ title: "Couldn't sync filings", description: err.message, type: "error" }),
                })
            }
            onIngest={(filingId) =>
                ingestFiling.mutate(filingId, {
                    onError: (err) => toast.add({ title: "Couldn't ingest filing", description: err.message, type: "error" }),
                })
            }
            onPurge={(filingId) => {
                if (window.confirm("Purge all vectorized chunks for this filing?"))
                    purgeFiling.mutate(filingId, {
                        onError: (err) => toast.add({ title: "Couldn't purge filing", description: err.message, type: "error" }),
                    });
            }}
            onGenerateMemo={() => {
                generateMemo.mutate(undefined, {
                    onSuccess: (job) => {
                        setActiveJobId(job.id);
                        toast.add({
                            title: "Memo generation started",
                            description: `${company.ticker}: we'll notify you when it's ready. You can keep browsing.`,
                            type: "info",
                            timeout: 5000,
                        });
                    },
                    onError: (err) =>
                        toast.add({ title: "Couldn't start generation", description: err.message, type: "error" }),
                });
            }}
            isIngestingId={ingestFiling.isPending ? ingestFiling.variables : null}
            isPurgingId={purgeFiling.isPending ? purgeFiling.variables : null}
        />
    );
}