"use client";

import Link from "next/link";
import { ArrowRight, Loader2, RefreshCw, Sparkles, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { PixelGrid } from "@/components/background/pixel-grid";
import { Company, Filing, Memo, Job } from "@/types";
import { memoStatusVariant } from "@/lib/memo-status";

interface CompanyDetailViewProps {
    company: Company;
    filings: Filing[];
    memos: Memo[];
    activeJob: Job | undefined;
    isSyncing: boolean;
    onSync: () => void;
    onIngest: (filingId: string) => void;
    onPurge: (filingId: string) => void;
    onGenerateMemo: () => void;
    isIngestingId: string | null;
    isPurgingId: string | null;
}

/** Card heading row: mono caption on the left, optional mono meta on the right, ruled underneath. */
function PanelHead({ title, meta }: { title: string; meta?: React.ReactNode }) {
    return (
        <div className="label-mono flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <span className="text-foreground">{title}</span>
            {meta && <span className="text-muted-foreground">{meta}</span>}
        </div>
    );
}

export function CompanyDetailView({
    company,
    filings,
    memos,
    activeJob,
    isSyncing,
    onSync,
    onIngest,
    onPurge,
    onGenerateMemo,
    isIngestingId,
    isPurgingId,
}: CompanyDetailViewProps) {
    const isGenerating = !!activeJob && (activeJob.status === "pending" || activeJob.status === "processing");
    const ingested = filings.filter((f) => f.ingested_at).length;

    const filingAction = (filing: Filing) =>
        filing.ingested_at ? (
            <Button variant="outline-destructive" size="sm" onClick={() => onPurge(filing.id)} disabled={isPurgingId === filing.id}>
                {isPurgingId === filing.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                Purge
            </Button>
        ) : (
            <Button size="sm" onClick={() => onIngest(filing.id)} disabled={isIngestingId === filing.id}>
                {isIngestingId === filing.id ? <Loader2 className="animate-spin" /> : <Zap />}
                Ingest
            </Button>
        );

    const status = (filing: Filing) =>
        filing.ingested_at ? <Badge variant="success">Ingested &amp; vectorized</Badge> : <Badge variant="secondary">Not ingested</Badge>;

    return (
        <div className="flex w-full flex-col gap-8 px-4 py-8 md:px-8">
            <PageHeader
                eyebrow={["Coverage universe", company.ticker]}
                title={company.name}
                description={
                    <span className="flex flex-wrap items-center gap-2">
                        <Badge variant="ticker" className="h-6 px-2 text-xs">
                            {company.ticker}
                        </Badge>
                        <Badge variant="secondary" className="h-6 px-2">
                            CIK {company.cik}
                        </Badge>
                        {company.sector && (
                            <Badge variant="secondary" className="h-6 px-2 font-normal">
                                {company.sector}
                            </Badge>
                        )}
                    </span>
                }
                actions={
                    <Button variant="outline" size="lg" onClick={onSync} disabled={isSyncing} className="w-full sm:w-auto">
                        <RefreshCw className={isSyncing ? "animate-spin" : undefined} />
                        {isSyncing ? "Syncing…" : "Sync recent filings"}
                    </Button>
                }
            />

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
                {/* Filings ledger */}
                <section className="surface xl:col-span-7">
                    <PanelHead title="SEC filings // ingestion" meta={`${ingested} / ${filings.length} indexed`} />

                    {filings.length === 0 ? (
                        <p className="px-5 py-10 text-center font-mono text-xs text-muted-foreground">No filings yet. Sync recent filings from EDGAR.</p>
                    ) : (
                        <>
                            {/* Desktop */}
                            <div className="hidden md:block">
                                <div className="label-mono grid grid-cols-12 border-b border-border-strong px-5 py-3 text-foreground/80">
                                    <span className="col-span-5">Filing &amp; period</span>
                                    <span className="col-span-4">Ingestion status</span>
                                    <span className="col-span-3 text-right">Actions</span>
                                </div>
                                {filings.map((filing) => (
                                    <div
                                        key={`desktop-${filing.id}`}
                                        className="grid grid-cols-12 items-center gap-2 border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-muted/50"
                                    >
                                        <div className="col-span-5 flex min-w-0 flex-col gap-1 pr-2">
                                            <span className="truncate text-[15px]">{filing.form_type} report</span>
                                            <span className="truncate font-mono text-[11px] text-muted-foreground">
                                                Period {filing.period_of_report ?? "—"} · Filed {filing.filing_date}
                                            </span>
                                        </div>
                                        <div className="col-span-4">{status(filing)}</div>
                                        <div className="col-span-3 flex justify-end">{filingAction(filing)}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Mobile */}
                            <div className="flex flex-col md:hidden">
                                {filings.map((filing) => (
                                    <div key={`mobile-${filing.id}`} className="flex flex-col gap-3 border-b border-border p-5 last:border-b-0">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[15px]">{filing.form_type} report</span>
                                                <span className="font-mono text-[11px] text-muted-foreground">Period {filing.period_of_report ?? "—"}</span>
                                            </div>
                                            {status(filing)}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-[11px] text-muted-foreground">Filed {filing.filing_date}</span>
                                            {filingAction(filing)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </section>

                <div className="flex flex-col gap-6 xl:col-span-5">
                    {/* Memo generation */}
                    <section className="surface flex flex-col gap-5 p-6">
                        <PixelGrid />
                        <span className="label-mono flex items-center gap-2 text-muted-foreground">
                            <Sparkles className="size-3.5 text-primary" /> Memo pipeline
                        </span>
                        <div className="flex flex-col gap-2">
                            <h2 className="font-heading text-3xl font-medium leading-tight tracking-[-0.01em]">Draft an investment memo</h2>
                            <p className="text-[15px] leading-relaxed text-foreground/75">
                                Retrieves the most relevant vectorized 10-K and 10-Q passages and drafts a thesis, financial highlights and risks, each
                                cited to its source.
                            </p>
                        </div>
                        <Button onClick={onGenerateMemo} disabled={isGenerating} size="lg" className="group w-full">
                            {isGenerating ? (
                                <>
                                    <Loader2 className="animate-spin" /> Processing job…
                                </>
                            ) : (
                                <>
                                    Generate memo <ArrowRight className="transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </Button>
                    </section>

                    {/* Memo history */}
                    <section className="surface">
                        <PanelHead title="Investment memos" meta={`${memos.length} total`} />
                        {memos.length === 0 ? (
                            <p className="px-5 py-8 text-center font-mono text-xs text-muted-foreground">No memos generated yet.</p>
                        ) : (
                            memos.map((memo) => (
                                <div key={memo.id} className="flex flex-col gap-2 border-b border-border px-5 py-4 last:border-b-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="font-heading text-lg leading-snug">Investment thesis</span>
                                        <Badge variant={memoStatusVariant(memo.status)} className="shrink-0 uppercase">
                                            {memo.status}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
                                        <span>
                                            {new Date(memo.created_at).toLocaleDateString()} · {memo.model_name}
                                        </span>
                                        <Button nativeButton={false} variant="action" render={<Link href={`/memos/${memo.id}`} />}>
                                            Open <ArrowRight />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
