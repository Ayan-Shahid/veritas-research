"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Company } from "@/types";

interface CompaniesViewProps {
    companies: Company[];
    metrics: { totalCompanies: number; totalIngested: number };
    searchQuery: string;
    onSearchChange: (val: string) => void;
    isLoading: boolean;
    onCreateCompany: (data: { ticker: string; name: string; cik: string; sector: string }) => Promise<void>;
    isCreating: boolean;
}

const TH = "label-mono px-5 py-4 text-left align-bottom font-medium text-foreground/80";
const TD = "px-5 py-4 align-middle";

export function CompaniesView({
    companies,
    metrics,
    searchQuery,
    onSearchChange,
    isLoading,
    onCreateCompany,
    isCreating,
}: CompaniesViewProps) {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [formData, setFormData] = useState({ ticker: "", name: "", cik: "", sector: "" });
    const [formError, setFormError] = useState<string | null>(null);

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        try {
            await onCreateCompany(formData);
            setIsAddOpen(false);
            setFormData({ ticker: "", name: "", cik: "", sector: "" });
        } catch (err) {
            // Keep the dialog and what was typed; show why the API refused it (e.g. duplicate CIK).
            setFormError(err instanceof Error ? err.message : "Couldn't add this company.");
        }
    };

    const emptyOrLoading = isLoading ? (
        <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Loading coverage…
        </span>
    ) : (
        "No companies in your coverage universe yet."
    );

    return (
        <div className="flex w-full flex-col gap-8 px-4 py-8 md:px-8">
            <PageHeader
                eyebrow={["Coverage universe", "Companies"]}
                title="Coverage Universe"
                description="Companies you track, the SEC filings ingested for each, and the memos drafted from them."
                actions={
                    <Dialog
                        open={isAddOpen}
                        onOpenChange={(open) => {
                            setIsAddOpen(open);
                            if (!open) setFormError(null);
                        }}
                    >
                        <DialogTrigger render={<Button size="lg" className="w-full sm:w-auto" />}>
                            <Plus /> Add company
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[440px]">
                            <DialogHeader>
                                <span className="label-mono text-muted-foreground">New coverage</span>
                                <DialogTitle className="font-heading text-2xl font-medium">Add a company</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddSubmit} className="mt-2 flex flex-col gap-4">
                                {(
                                    [
                                        // Limits mirror CompanyCreate in backend/app/schemas/company.py.
                                        ["ticker", "Ticker symbol", "e.g. AAPL", true, 10, "[A-Za-z0-9][A-Za-z0-9.\\-]{0,9}", "1-10 letters, digits, . or -"],
                                        ["name", "Company name", "e.g. Apple Inc.", true, 255, undefined, undefined],
                                        ["cik", "CIK number", "e.g. 0000320193", true, 10, "\\d{1,10}", "1-10 digits"],
                                        ["sector", "Sector", "e.g. Technology", false, 100, undefined, undefined],
                                    ] as const
                                ).map(([key, label, placeholder, required, maxLength, pattern, title]) => (
                                    <div key={key} className="grid gap-2">
                                        <Label htmlFor={key} className="label-mono text-muted-foreground">
                                            {label}
                                        </Label>
                                        <Input
                                            id={key}
                                            value={formData[key]}
                                            onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                                            placeholder={placeholder}
                                            required={required}
                                            maxLength={maxLength}
                                            pattern={pattern}
                                            title={title}
                                            inputMode={key === "cik" ? "numeric" : undefined}
                                            className={key === "ticker" || key === "cik" ? "font-mono" : undefined}
                                        />
                                    </div>
                                ))}
                                {formError && (
                                    <p role="alert" className="rounded-xs border border-destructive bg-destructive px-3 py-2 text-sm text-destructive-foreground">
                                        {formError}
                                    </p>
                                )}
                                <Button type="submit" disabled={isCreating} size="lg" className="mt-2">
                                    {isCreating && <Loader2 className="animate-spin" />}
                                    Track company
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                }
            />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <StatCard
                    label="Tracked companies"
                    meta="US equities"
                    value={metrics.totalCompanies}
                    unit="Equities"
                    footer={<><span>Coverage universe</span><span>Per account</span></>}
                />
                <StatCard
                    label="Filings ingested"
                    meta="EDGAR · 10-K / 10-Q"
                    value={metrics.totalIngested}
                    unit="Documents"
                    footer={
                        <>
                            <span className="flex items-center gap-2">
                                <span aria-hidden className="size-1.5 bg-primary" /> Chunked &amp; vector indexed
                            </span>
                            <span>Semantic search</span>
                        </>
                    }
                />
            </div>

            <section className="flex flex-col">
                {/* Toolbar */}
                <div className="surface flex flex-col gap-3 rounded-b-none border-b-0 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex w-full items-center gap-3 sm:max-w-sm">
                        <span className="label-mono shrink-0 text-muted-foreground">Filter:</span>
                        <span className="relative w-full">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="Ticker or company"
                                className="h-8 bg-card pl-8 font-mono text-xs"
                            />
                        </span>
                    </label>
                    <span className="label-mono text-muted-foreground">
                        {companies.length} {companies.length === 1 ? "company" : "companies"}
                    </span>
                </div>

                {/* Desktop table */}
                <div className="surface hidden overflow-x-auto rounded-t-none md:block">
                    <table className="w-full border-collapse text-sm">
                        <thead className="border-b border-border-strong">
                            <tr className="[&>th+th]:border-l [&>th+th]:border-border">
                                <th className={TH}>Ticker</th>
                                <th className={TH}>Company name</th>
                                <th className={TH}>CIK identifier</th>
                                <th className={TH}>Sector</th>
                                <th className={TH}>Filings ingested</th>
                                <th className={`${TH} text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading || companies.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center font-mono text-xs text-muted-foreground">
                                        {emptyOrLoading}
                                    </td>
                                </tr>
                            ) : (
                                companies.map((company) => (
                                    <tr
                                        key={company.id}
                                        className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/50 [&>td+td]:border-l [&>td+td]:border-border"
                                    >
                                        <td className={TD}>
                                            <Badge variant="ticker" className="h-6 px-2 text-xs">
                                                {company.ticker}
                                            </Badge>
                                        </td>
                                        <td className={`${TD} text-[15px] text-foreground`}>{company.name}</td>
                                        <td className={`${TD} font-mono text-xs leading-5 text-foreground/80`}>
                                            <span className="block text-muted-foreground">CIK</span>
                                            {company.cik}
                                        </td>
                                        <td className={TD}>
                                            {company.sector ? (
                                                <Badge variant="secondary" className="h-6 px-2 font-normal">
                                                    {company.sector}
                                                </Badge>
                                            ) : (
                                                <span className="font-mono text-xs text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className={`${TD} font-mono text-[13px]`}>
                                            {company.filings_count || 0} {company.filings_count === 1 ? "Filing" : "Filings"}
                                        </td>
                                        <td className={`${TD} text-right`}>
                                            <Button nativeButton={false} variant="action" render={<Link href={`/companies/${company.id}`} />}>
                                                View company <ArrowRight />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <div className="label-mono border-t border-border bg-muted/50 px-5 py-4 text-foreground/80">
                        Showing {companies.length} of {metrics.totalCompanies} coverage assets
                    </div>
                </div>

                {/* Mobile cards */}
                <div className="surface flex flex-col rounded-t-none md:hidden">
                    {isLoading || companies.length === 0 ? (
                        <div className="px-5 py-10 text-center font-mono text-xs text-muted-foreground">{emptyOrLoading}</div>
                    ) : (
                        companies.map((company) => (
                            <div key={company.id} className="flex flex-col gap-3 border-b border-border p-5 last:border-b-0">
                                <div className="flex items-center justify-between gap-3">
                                    <Badge variant="ticker" className="h-6 px-2 text-xs">
                                        {company.ticker}
                                    </Badge>
                                    <span className="font-mono text-xs text-foreground/80">
                                        {company.filings_count || 0} {company.filings_count === 1 ? "Filing" : "Filings"}
                                    </span>
                                </div>
                                <span className="text-[15px]">{company.name}</span>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    {company.sector ? (
                                        <Badge variant="secondary" className="font-normal">
                                            {company.sector}
                                        </Badge>
                                    ) : (
                                        <span />
                                    )}
                                    <span className="font-mono text-xs text-muted-foreground">CIK {company.cik}</span>
                                </div>
                                <Button nativeButton={false} variant="outline" className="mt-1 w-full" render={<Link href={`/companies/${company.id}`} />}>
                                    View company <ArrowRight />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
