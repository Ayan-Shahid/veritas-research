"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, Trash2, ArrowRight, Loader2, Building, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Organization, WatchlistCompany } from "@/types";

interface WatchlistViewProps {
    organization?: Organization;
    watchlist: WatchlistCompany[];
    isLoading: boolean;
    onRemove: (companyId: string) => void;
    isRemovingId: string | null;
    onAdd: (companyId: string) => void;
    isAdding: boolean;
}

export function WatchlistView({ organization, watchlist, isLoading, onRemove, isRemovingId, onAdd, isAdding }: WatchlistViewProps) {
    const [newCompanyId, setNewCompanyId] = useState("");

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCompanyId) {
            onAdd(newCompanyId);
            setNewCompanyId("");
        }
    };

    return (
        <div className="w-full px-4 md:px-6 py-6 md:py-8 flex flex-col gap-6 bg-background">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div className="flex flex-col">
                    <span className="font-sans text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Portfolio</span>
                    <h1 className="font-heading text-3xl text-foreground tracking-tight mt-1 font-bold flex items-center gap-3">
                        Watchlist
                        {organization && (
                            <Badge variant="secondary" className="font-mono text-[10px] uppercase bg-primary/10 text-primary border-primary/20">
                                <Building className="w-3 h-3 mr-1" /> {organization.name}
                            </Badge>
                        )}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Priority equities flagged for continuous monitoring and automated memo generation.</p>
                </div>

                <form onSubmit={handleAdd} className="flex items-center gap-2 w-full lg:w-auto">
                    <Input
                        value={newCompanyId}
                        onChange={(e) => setNewCompanyId(e.target.value)}
                        placeholder="Enter Company ID..."
                        className="w-full lg:w-64 bg-card"
                    />
                    <Button type="submit" disabled={isAdding || !newCompanyId} className="shrink-0">
                        {isAdding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        Add
                    </Button>
                </form>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mb-4" />
                    <span>Loading watchlist...</span>
                </div>
            ) : watchlist.length === 0 ? (
                <Card className="border-border">
                    <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center">
                        <Bookmark className="w-8 h-8 mb-4 opacity-20" />
                        <span>Your watchlist is currently empty.</span>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {watchlist.map((entry) => (
                        <Card key={entry.company_id} className="border-border shadow-sm flex flex-col group">
                            <CardContent className="p-5 flex flex-col gap-4 flex-1">
                                <div className="flex items-start justify-between border-b border-border pb-4">
                                    <div className="flex flex-col gap-1">
                                        <Badge variant="outline" className="w-fit bg-muted">Target ID: {entry.company_id.slice(0, 8)}</Badge>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onRemove(entry.company_id)}
                                        disabled={isRemovingId === entry.company_id}
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-1 -mr-1"
                                    >
                                        {isRemovingId === entry.company_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between mt-auto pt-2">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">
                                        Added {new Date().toLocaleDateString()}
                                    </span>
                                    <Button render={<Link href={`/companies/${entry.company_id}`} />} variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                                            Analyze <ArrowRight className="w-3 h-3 ml-1" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}