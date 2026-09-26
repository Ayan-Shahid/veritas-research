"use client";

import { RefreshCw, Zap, Trash2, Sparkles, FileText, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Company, Filing, Memo, Job } from "@/types";

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

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <div className="p-4 md:p-6 flex flex-col gap-6">

                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-4 md:p-6 rounded-xl border border-border">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                <h1 className="font-heading text-2xl md:text-3xl text-foreground font-bold tracking-tight">{company.name}</h1>
                                <Badge variant="secondary" className="font-mono bg-muted text-foreground">{company.ticker}</Badge>
                                <span className="font-mono text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">CIK: {company.cik}</span>
                            </div>
                        </div>
                    </div>
                    <Button variant="outline" onClick={onSync} disabled={isSyncing} className="flex items-center gap-2 w-full lg:w-auto">
                        <RefreshCw className={`w-4 h-4 text-primary ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? "Syncing..." : "Sync Recent Filings"}
                    </Button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    {/* Filings Ledger */}
                    <section className="xl:col-span-7 flex flex-col gap-4">
                        <Card>
                            <CardHeader className="pb-4">
                                <div className="flex items-start md:items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5 md:mt-0" />
                                    <div className="flex flex-col">
                                        <CardTitle className="text-lg">SEC Filings & Ingestion Repository</CardTitle>
                                        <CardDescription className="font-mono text-xs mt-1 leading-relaxed">Continuous real-time ingestion, tabular extraction & semantic chunking</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>

                            {filings.length === 0 && (
                                <div className="p-6 text-center text-sm text-muted-foreground border-t border-border">
                                    No filings found. Click Sync Recent Filings.
                                </div>
                            )}

                            {/* Desktop View (CSS Grid) */}
                            <div className="hidden md:flex flex-col">
                                {filings.length > 0 && (
                                    <div className="grid grid-cols-12 px-6 py-2 bg-muted/50 font-sans text-[11px] text-muted-foreground font-bold uppercase tracking-wider border-y border-border">
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
                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />
                                                    Ingested & Vectorized
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground font-bold">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mr-2" />
                                                    Not Ingested
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="col-span-3 flex justify-end">
                                            {filing.ingested_at ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onPurge(filing.id)}
                                                    disabled={isPurgingId === filing.id}
                                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8"
                                                >
                                                    {isPurgingId === filing.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                                                    Purge
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => onIngest(filing.id)}
                                                    disabled={isIngestingId === filing.id}
                                                    className="bg-primary hover:bg-primary/90 h-8 text-primary-foreground"
                                                >
                                                    {isIngestingId === filing.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1 fill-current" />}
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
                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold shrink-0 text-[10px]">
                                                    <div className="w-1 h-1 rounded-full bg-emerald-500 mr-1.5" />
                                                    Ingested
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground font-bold shrink-0 text-[10px]">
                                                    <div className="w-1 h-1 rounded-full bg-muted-foreground/50 mr-1.5" />
                                                    Pending
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between mt-2">
                                            <span className="font-mono text-[10px] text-muted-foreground">Filed: {filing.filing_date}</span>
                                            {filing.ingested_at ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onPurge(filing.id)}
                                                    disabled={isPurgingId === filing.id}
                                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                                                >
                                                    {isPurgingId === filing.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                                                    Purge
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => onIngest(filing.id)}
                                                    disabled={isIngestingId === filing.id}
                                                    className="bg-primary hover:bg-primary/90 h-8 px-3 text-primary-foreground text-xs"
                                                >
                                                    {isIngestingId === filing.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1.5 fill-current" />}
                                                    Ingest
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </section>

                    {/* Right Column: Orchestrator & History */}
                    <section className="xl:col-span-5 flex flex-col gap-6">
                        <Card className="relative overflow-hidden border-primary/20 shadow-md">
                            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
                            <CardContent className="p-4 md:p-6 flex flex-col gap-6">
                                <div className="flex flex-col">
                                    <Badge variant="secondary" className="w-fit bg-primary/10 text-primary mb-3">
                                        <Sparkles className="w-3 h-3 mr-1" /> Veritas LLM Pipeline
                                    </Badge>
                                    <h2 className="font-heading text-lg md:text-xl font-bold">Generate Comprehensive Investment Memo</h2>
                                    <p className="text-sm text-muted-foreground mt-2">Synthesizes an institutional-grade investment memo automatically querying relevant vectorized 10-K and 10-Q disclosure chunks.</p>
                                </div>
                                <Button
                                    onClick={onGenerateMemo}
                                    disabled={isGenerating}
                                    className="w-full py-6 text-base font-bold bg-primary hover:bg-primary/90 shadow-md group text-primary-foreground"
                                >
                                    {isGenerating ? (
                                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing Job...</>
                                    ) : (
                                        <><Sparkles className="w-5 h-5 mr-2 text-primary-foreground group-hover:rotate-12 transition-transform" /> Generate Memo <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" /></>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3 border-b border-border">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-primary" /> Historical Memos
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 flex flex-col gap-2">
                                {memos.length === 0 && (
                                    <div className="text-sm text-muted-foreground text-center py-4">No memos generated yet.</div>
                                )}
                                {memos.map((memo) => (
                                    <div key={memo.id} className="p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors flex flex-col gap-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="font-semibold text-sm leading-snug">Investment Thesis</span>
                                            <Badge variant="outline" className={`text-[10px] uppercase shrink-0 ${
                                                memo.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                    memo.status === 'rejected' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                                                        'bg-muted text-muted-foreground'
                                            }`}>
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
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </div>
        </div>
    );
}