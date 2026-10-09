"use client";

import {useState} from "react";
import Link from "next/link";
import {Search, Building2, FileText, ArrowRight, Star, Loader2, Plus} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {Label} from "@/components/ui/label";
import {Company} from "@/types";

interface CompaniesViewProps {
    companies: Company[];
    metrics: { totalCompanies: number; totalIngested: number };
    searchQuery: string;
    onSearchChange: (val: string) => void;
    isLoading: boolean;
    onCreateCompany: (data: { ticker: string; name: string; cik: string; sector: string }) => void;
    isCreating: boolean;
}

export function CompaniesView({
                                  companies,
                                  metrics,
                                  searchQuery,
                                  onSearchChange,
                                  isLoading,
                                  onCreateCompany,
                                  isCreating
                              }: CompaniesViewProps) {

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [formData, setFormData] = useState({ticker: "", name: "", cik: "", sector: ""});

    const glass = "rounded-xl text-card-foreground backdrop-saturate-150 border border-foreground/5 backdrop-blur-xl bg-gradient-to-br from-card/20 to-card/5 dark:from-card/20 dark:to-background/5";

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreateCompany(formData);
        setIsAddOpen(false);
        setFormData({ticker: "", name: "", cik: "", sector: ""});
    };

    return (
        <div className="w-full px-4 md:px-6 py-6 md:py-8 flex flex-col gap-6">

            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div className="flex flex-col">
                    <span className="font-sans text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Coverage Universe</span>
                    <h1 className="font-heading text-3xl text-foreground tracking-tight mt-1 font-bold">Companies</h1>
                    <p className="text-sm text-muted-foreground mt-1">Tracked portfolio universe, live SEC filing ingestion states, and generative intelligence models.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="relative w-full sm:w-64 flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                        <Input
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Filter universe..."
                            className="pl-9 bg-card border-border w-full"
                        />
                    </div>

                    {/* Add Company Modal */}
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger render={<Button className="bg-primary text-primary-foreground w-full sm:w-auto"/>}>
                            <Plus className="w-4 h-4 mr-2"/>
                            Add Company
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add New Company</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddSubmit} className="flex flex-col gap-4 mt-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="ticker">Ticker Symbol</Label>
                                    <Input id="ticker" value={formData.ticker} onChange={e => setFormData({...formData, ticker: e.target.value})} placeholder="e.g. AAPL" required/>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Company Name</Label>
                                    <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Apple Inc." required/>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="cik">CIK Number</Label>
                                    <Input id="cik" value={formData.cik} onChange={e => setFormData({...formData, cik: e.target.value})} placeholder="e.g. 0000320193" required/>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="sector">Sector</Label>
                                    <Input id="sector" value={formData.sector} onChange={e => setFormData({...formData, sector: e.target.value})} placeholder="e.g. Technology"/>
                                </div>
                                <Button type="submit" disabled={isCreating} className="mt-2">
                                    {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null}
                                    Track Company
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={glass}>
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Tracked Companies</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-heading font-bold">{metrics.totalCompanies}</span>
                                <span className="text-xs text-muted-foreground uppercase font-mono">Equities</span>
                            </div>
                        </div>
                        <Building2 className="w-8 h-8 text-primary/20"/>
                    </div>
                </div>
                <div className={glass}>
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Ingested Filings</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-heading font-bold">{metrics.totalIngested}</span>
                                <span className="text-xs text-muted-foreground uppercase font-mono">Documents</span>
                            </div>
                        </div>
                        <FileText className="w-8 h-8 text-primary/20"/>
                    </div>
                </div>
            </div>

            {/* Desktop Data Table */}
            <div className={`hidden md:block overflow-hidden ${glass}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/50 border-b border-border font-bold">
                        <tr>
                            <th className="px-6 py-4 w-12 text-center">Watch</th>
                            <th className="px-6 py-4">Ticker</th>
                            <th className="px-6 py-4">Company Name</th>
                            <th className="px-6 py-4">CIK</th>
                            <th className="px-6 py-4">Sector</th>
                            <th className="px-6 py-4">Filings Ingested</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                        {isLoading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2"/> Loading equities...
                                </td>
                            </tr>
                        ) : companies.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No companies found in coverage universe.</td>
                            </tr>
                        ) : (
                            companies.map((company) => (
                                <tr key={company.id} className="hover:bg-muted/30 transition-colors group">
                                    <td className="px-6 py-4 text-center">
                                        <button className="text-muted-foreground hover:text-primary transition-colors">
                                            <Star className="w-4 h-4"/>
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-primary font-bold">{company.ticker}</td>
                                    <td className="px-6 py-4 font-medium text-foreground">{company.name}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{company.cik}</td>
                                    <td className="px-6 py-4 text-muted-foreground">{company.sector || "—"}</td>
                                    <td className="px-6 py-4 font-mono font-medium">{company.filings_count || 0}</td>
                                    <td className="px-6 py-4 text-right">
                                        <Button nativeButton={false} variant="ghost" size="sm" render={<Link href={`/companies/${company.id}`}/>} className="text-primary hover:bg-primary/10 transition-colors">
                                            View Company <ArrowRight className="w-3 h-3 ml-1"/>
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Data Cards */}
            <div className="flex flex-col gap-4 md:hidden">
                {isLoading ? (
                    <div className={glass}>
                        <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin mb-2"/>
                            <span className="text-sm">Loading equities...</span>
                        </div>
                    </div>
                ) : companies.length === 0 ? (
                    <div className={glass}>
                        <div className="p-8 text-center text-muted-foreground">
                            <span className="text-sm">No companies found in coverage universe.</span>
                        </div>
                    </div>
                ) : (
                    companies.map((company) => (
                        <div key={company.id} className={glass}>
                            <div className="p-5 flex flex-col gap-4">
                                <div className="flex items-center justify-between border-b border-border pb-4">
                                    <div className="flex items-center gap-3">
                                        <button className="text-muted-foreground hover:text-primary transition-colors shrink-0">
                                            <Star className="w-4 h-4"/>
                                        </button>
                                        <span className="font-mono text-primary font-bold text-lg">{company.ticker}</span>
                                    </div>
                                    <div className="bg-muted px-2.5 py-1 rounded-md flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="font-mono text-xs font-medium text-muted-foreground">{company.filings_count || 0}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className="font-medium text-foreground text-base">{company.name}</span>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{company.sector || "Sector N/A"}</span>
                                        <span className="font-mono text-xs text-muted-foreground">CIK: {company.cik}</span>
                                    </div>
                                </div>
                                <Button nativeButton={false} variant="outline" className="w-full mt-2 text-primary hover:bg-primary/10 transition-colors" render={<Link href={`/companies/${company.id}`}/>}>
                                    View Company <ArrowRight className="w-4 h-4 ml-2"/>
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

        </div>
    );
}