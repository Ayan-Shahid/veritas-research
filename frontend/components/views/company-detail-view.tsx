"use client";

import { RefreshCw, Zap, Trash2, Sparkles, FileText, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
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

export function CompanyDetailView({
                                      company, filings, memos, activeJob,
                                      isSyncing, onSync, onIngest, onPurge, onGenerateMemo,
                                      isIngestingId, isPurgingId
                                  }: CompanyDetailViewProps) {
    const isGenerating = !!activeJob && (activeJob.status === "pending" || activeJob.status === "processing");
    const glass = "surface";

    return (
        <div className="flex flex-col">
            <div className="p-4 md:p-6 flex flex-col gap-6">

                {/* Header */}
                <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 md:p-6 ${glass}`}>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                <h1 className="font-heading text-2xl md:text-3xl text-foreground font-bold tracking-tight">{company.name}</h1>
                                <Badge className="font-mono">{company.ticker}</Badge>
                                <Badge variant="secondary" className="font-mono">CIK {company.cik}</Badge>
                            </div>
                        </div>
                    </div>
                    <Button variant="outline" onClick={onSync} disabled={isSyncing} className="flex items-center gap-2 w-full lg:w-auto">
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? "Syncing..." : "Sync Recent Filings"}
                    </Button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    {/* Filings Ledger */}
                    <section className="xl:col-span-7 flex flex-col gap-4">
                        <div className={glass}>
                            <div className="p-6 pb-4 flex flex-col space-y-1.5">
                                <div className="flex items-start md:items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5 md:mt-0" />
                                    <div className="flex flex-col">
                                        <h3 className="font-heading font-bold leading-none tracking-tight text-lg">SEC Filings & Ingestion Repository</h3>
                                        <p className="text-sm text-muted-foreground font-mono text-xs mt-1 leading-relaxed">Continuous real-time ingestion, tabular extraction & semantic chunking</p>
                                    </div>
                                </div>
                            </div>

                            {filings.length === 0 && (
                                <div className="p-6 text-center text-sm text-muted-foreground border-t border-border">
                                    No filings found. Click Sync Recent Filings.
                                </div>
                            )}

                            {/* Desktop View (CSS Grid) */}
                            <div className="hidden md:flex flex-col">
                                {filings.length > 0 && (
                                    <div className="grid grid-cols-12 px-6 py-2 bg-muted/60 font-sans text-[11px] text-muted-foreground font-semibold uppercase tracking-wider border-y border-border">
                                        <div className="col-span-5">Filing Type & Period</div>
                                        <div className="col-span-4 text-left">Ingestion Status</div>
                                        <div className="col-span-3 text-right">Actions</div>
                                    </div>
                                )}

                                {filings.map((filing) => (
                                    <div key={`desktop-${filing.id}`} className={`grid grid-cols-12 items-center gap-2 p-4 border-b border-border hover:bg-muted/30 transition-colors ${!filing.ingested_at ? 'bg-muted/10' : ''}`}>
                                        <div className="col-span-5 flex flex-col pr-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm truncate">{filing.form_type} — Report</span>
                                            </div>
                                            <span className="font-mono text-xs text-muted-foreground truncate mt-1">
                                                Period Ended {filing.period_of_report} · Filed {filing.filing_date}
                                            </span>
                                        </div>

                                        <div className="col-span-4">
                                            {filing.ingested_at ? (
                                                <Badge variant="success">Ingested & Vectorized</Badge>
                                            ) : (
                                                <Badge variant="secondary">Not Ingested</Badge>
                                            )}
                                        </div>

                                        <div className="col-span-3 flex justify-end">
                                            {filing.ingested_at ? (
                                                <Button
                                                    variant="outline-destructive"
                                                    size="sm"
                                                    onClick={() => onPurge(filing.id)}
                                                    disabled={isPurgingId === filing.id}
                                                >
                                                    {isPurgingId === filing.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    Purge
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => onIngest(filing.id)}
                                                    disabled={isIngestingId === filing.id}
                                                >
                                                    {isIngestingId === filing.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                                    Ingest
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Mobile View (Stacked Flex Layout) */}
                            <div className="flex flex-col md:hidden border-t border-border divide-y divide-border">
                                {filings.map((filing) => (
                                    <div key={`mobile-${filing.id}`} className={`flex flex-col gap-3 p-4 ${!filing.ingested_at ? 'bg-muted/10' : ''}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm">{filing.form_type} — Report</span>
                                                <span className="font-mono text-[10px] text-muted-foreground mt-1">Period: {filing.period_of_report}</span>
                                            </div>
                                            {filing.ingested_at ? (
                                                <Badge variant="success" className="shrink-0">Ingested</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="shrink-0">Pending</Badge>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between mt-2">
                                            <span className="font-mono text-[10px] text-muted-foreground">Filed: {filing.filing_date}</span>
                                            {filing.ingested_at ? (
                                                <Button
                                                    variant="outline-destructive"
                                                    size="sm"
                                                    onClick={() => onPurge(filing.id)}
                                                    disabled={isPurgingId === filing.id}
                                                >
                                                    {isPurgingId === filing.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                    Purge
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => onIngest(filing.id)}
                                                    disabled={isIngestingId === filing.id}
                                                >
                                                    {isIngestingId === filing.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                                    Ingest
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Right Column: Orchestrator & History */}
                    <section className="xl:col-span-5 flex flex-col gap-6">
                        <div className={glass}>
                            <div className="p-4 md:p-6 flex flex-col gap-6">
                                <div className="flex flex-col">
                                    <Badge className="mb-3">
                                        <Sparkles /> Veritas LLM Pipeline
                                    </Badge>
                                    <h2 className="font-heading text-lg md:text-xl font-bold">Generate Comprehensive Investment Memo</h2>
                                    <p className="text-sm text-muted-foreground mt-2">Synthesizes an institutional-grade investment memo automatically querying relevant vectorized 10-K and 10-Q disclosure chunks.</p>
                                </div>
                                <Button
                                    onClick={onGenerateMemo}
                                    disabled={isGenerating}
                                    size="lg"
                                    className="w-full group"
                                >
                                    {isGenerating ? (
                                        <><Loader2 className="animate-spin" /> Processing Job...</>
                                    ) : (
                                        <><Sparkles /> Generate Memo <ArrowRight className="group-hover:translate-x-1 transition-transform" /></>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className={glass}>
                            <div className="p-6 pb-3 border-b border-border flex flex-col space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold leading-none text-xs uppercase tracking-wider flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-muted-foreground" /> Historical Memos
                                    </h3>
                                </div>
                            </div>
                            <div className="p-4 flex flex-col gap-2">
                                {memos.length === 0 && (
                                    <div className="text-sm text-muted-foreground text-center py-4">No memos generated yet.</div>
                                )}
                                {memos.map((memo) => (
                                    <div key={memo.id} className="p-3 rounded-xs border border-border bg-background/50 hover:border-foreground/30 transition-colors flex flex-col gap-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="font-semibold text-sm leading-snug">Investment Thesis</span>
                                            <Badge variant={memoStatusVariant(memo.status)} className="uppercase shrink-0">
                                                {memo.status}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-between font-mono text-[11px] text-muted-foreground gap-2">
                                            <span>{new Date(memo.created_at).toLocaleDateString()} • {memo.model_name}</span>
                                            <Link href={`/memos/${memo.id}`} className="text-primary font-bold hover:underline flex items-center shrink-0">
                                                Open <ArrowRight className="w-3 h-3 ml-1" />
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}