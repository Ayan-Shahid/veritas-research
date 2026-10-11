"use client";

import { useState } from "react";
import { Edit2, History, ClipboardList, CheckCircle, XCircle, Trash2, Fingerprint, ExternalLink, FileCheck, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Memo, Company, MemoClaim, MemoGeneration } from "@/types";
import { AuditLog, MemoVersion, useCitation } from "@/hooks/use-memos";
import { memoStatusVariant } from "@/lib/memo-status";
import { PixelGrid } from "@/components/background/pixel-grid";

interface MemoViewProps {
    memo: Memo;
    company: Company;
    versions: MemoVersion[];
    auditLog: AuditLog[];
    onUpdate: (content: MemoGeneration) => void;
    onApprove: () => void;
    onReject: () => void;
    onDelete: () => void;
    isPending: boolean;
    isUpdating: boolean;
}

export function MemoView({ memo, company, versions, auditLog, onUpdate, onApprove, onReject, onDelete, isPending, isUpdating }: MemoViewProps) {
    // UI States
    const [selectedCitationId, setSelectedCitationId] = useState<string | null>(null);
    const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Edit Mode States
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState<MemoGeneration>(memo.content);
    const [prevMemoContent, setPrevMemoContent] = useState<MemoGeneration>(memo.content);

    const glass = "surface";

    const { data: citationData, isLoading: isCitationLoading, error: citationError } = useCitation(memo.id, selectedCitationId || undefined);

    if (memo.content !== prevMemoContent) {
        setPrevMemoContent(memo.content);
        setEditContent(memo.content);
        setIsEditing(false);
    }

    const handleSave = () => onUpdate(editContent);

    const handleClaimEdit = (field: 'financial_highlights' | 'risks', index: number, value: string) => {
        const newArray = [...editContent[field]];
        newArray[index] = { ...newArray[index], claim: value };
        setEditContent({ ...editContent, [field]: newArray });
    };

    // Citation ids are "sec-" + the first 8 hex chars of an md5 of the cited parent text, exactly
    // the keys of memo.citation_map. Keep the full id end to end (tag label, selection, API call).
    const citationTag = (citationId: string, key: string) => {
        const isSelected = selectedCitationId === citationId;
        return (
            <Badge
                key={key}
                render={<button type="button" />}
                onClick={() => setSelectedCitationId(citationId)}
                aria-pressed={isSelected}
                aria-label={`Show source for citation ${citationId}`}
                variant={isSelected ? "default" : "secondary"}
                className="font-mono text-[10px] cursor-pointer mx-1 shrink-0 align-middle hover:border-primary"
            >
                [{citationId}]
            </Badge>
        );
    };

    const renderClaimWithCitations = (claimText: string, chunkIds?: string[]) => {
        if (!claimText) return null;
        const parts = claimText.split(/(\[sec-[a-f0-9]+\])/gi);
        const hasInlineTags = parts.some((part) => /^\[sec-[a-f0-9]+\]$/i.test(part));

        const renderedText = parts.map((part, index) => {
            const match = part.match(/^\[sec-([a-f0-9]+)\]$/i);
            return match ? citationTag(`sec-${match[1].slice(0, 8).toLowerCase()}`, `inline-${index}`) : part;
        });

        if (!hasInlineTags && chunkIds && chunkIds.length > 0) {
            return (
                <span>
                    {renderedText}
                    {chunkIds.map((id, idx) => citationTag(id.toLowerCase(), `fallback-${idx}`))}
                </span>
            );
        }
        return renderedText;
    };

    return (
        <div className="w-full px-4 md:px-8 py-6 md:py-8 flex flex-col">

            {/* OVERLAYS */}
            {isAuditLogOpen && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className={`w-full max-w-2xl ${glass}`}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex flex-col gap-1"><span className="label-mono text-muted-foreground">Memo {memo.id.split("-")[0]}</span><h3 className="font-heading text-2xl font-medium">Audit log</h3></div>
                                <Button variant="ghost" size="icon" onClick={() => setIsAuditLogOpen(false)}><X className="w-5 h-5"/></Button>
                            </div>
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                {auditLog.length === 0 ? <p className="text-muted-foreground text-sm">No events found.</p> : auditLog.map(log => (
                                    <div key={log.id} className="flex flex-col items-start border-b border-border pb-3">
                                        <Badge variant="secondary" className="font-mono uppercase">{log.action.replace('_', ' ')}</Badge>
                                        <span className="font-mono text-xs text-muted-foreground mt-2">{new Date(log.created_at).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isHistoryOpen && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className={`w-full max-w-3xl ${glass}`}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex flex-col gap-1"><span className="label-mono text-muted-foreground">Memo {memo.id.split("-")[0]}</span><h3 className="font-heading text-2xl font-medium">Version history</h3></div>
                                <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(false)}><X className="w-5 h-5"/></Button>
                            </div>
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                {versions.length === 0 ? <p className="text-muted-foreground text-sm">No previous versions.</p> : versions.map(ver => (
                                    <div key={ver.id} className="flex flex-col bg-background/50 p-4 rounded-xs border border-border">
                                        <span className="label-mono text-foreground/80 mb-2">Snapshot · {new Date(ver.created_at).toLocaleString()}</span>
                                        <p className="text-sm text-muted-foreground line-clamp-2">{ver.content.thesis}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sticky Toolbar */}
            <div className="sticky top-16 z-30 -mx-4 md:-mx-8 -mt-6 md:-mt-8 mb-6 md:mb-8 px-4 md:px-8 py-3 bg-background/90 backdrop-blur-sm border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">

                <div className="flex items-center justify-between gap-4 w-full xl:w-auto min-w-0">
                    <div className="label-mono flex items-center gap-2 text-muted-foreground min-w-0">
                        <span aria-hidden className="size-2 shrink-0 bg-primary" />
                        <span className="hidden sm:inline shrink-0">Investment memos</span>
                        <span className="hidden sm:inline shrink-0">/</span>
                        <span className="text-foreground shrink-0">{company.ticker}</span>
                        <span className="shrink-0">/</span>
                        <span className="truncate min-w-0">{memo.id.split("-")[0]}</span>
                    </div>

                    <Badge variant={memoStatusVariant(memo.status)} className="xl:hidden uppercase shrink-0">
                        {memo.status}
                    </Badge>
                </div>

                {/* Stacked single column on mobile, row on desktop */}
                <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2 w-full xl:w-auto">
                    <Badge variant={memoStatusVariant(memo.status)} className="hidden xl:inline-flex mr-2 uppercase shrink-0">
                        {memo.status}
                    </Badge>

                    {isEditing ? (
                        <>
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="w-full xl:w-auto justify-center">Cancel</Button>
                            <Button size="sm" onClick={handleSave} disabled={isUpdating} className="w-full xl:w-auto justify-center">
                                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} disabled={isPending} className="w-full xl:w-auto justify-center"><Edit2 className="w-4 h-4" /> Edit</Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(true)} disabled={isPending} className="w-full xl:w-auto justify-center"><History className="w-4 h-4" /> History</Button>
                    <Button variant="outline" size="sm" onClick={() => setIsAuditLogOpen(true)} disabled={isPending} className="w-full xl:w-auto justify-center"><ClipboardList className="w-4 h-4" /> Audit Log</Button>
                    <Button variant="success" size="sm" onClick={onApprove} disabled={isPending} className="w-full xl:w-auto justify-center"><CheckCircle className="w-4 h-4" /> Approve</Button>
                    <Button variant="outline-destructive" size="sm" onClick={onReject} disabled={isPending} className="w-full xl:w-auto justify-center"><XCircle className="w-4 h-4" /> Reject</Button>
                    <Button variant="ghost" size="sm" onClick={onDelete} disabled={isPending} aria-label="Delete memo" className="w-full xl:w-auto justify-center text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /> <span className="xl:hidden">Delete</span></Button>
                </div>
            </div>

            <div className="w-full flex flex-col xl:flex-row gap-8 items-start">
                {/* Left Pane: Document */}
                <article className={`w-full xl:w-[65%] flex flex-col p-6 md:p-12 min-w-0 ${glass}`}>
                    <header className="mb-8 md:mb-10 pb-6 border-b border-border">
                        <span className="label-mono text-muted-foreground">Investment memorandum</span>
                        <h1 className="font-heading text-3xl md:text-5xl text-foreground font-medium tracking-[-0.02em] leading-[1.05] mt-3 mb-5 break-words">{company.name} <span className="text-muted-foreground">({company.ticker})</span></h1>
                        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground w-full">
                            <Fingerprint className="w-4 h-4 text-primary shrink-0" />
                            <span className="truncate block">Memo ID <span className="text-foreground">{memo.id}</span></span>
                        </div>
                    </header>

                    {/* Thesis */}
                    <section className="mb-10">
                        <h2 className="font-heading text-2xl md:text-3xl text-foreground font-medium tracking-[-0.01em] mb-4 flex items-center justify-between">
                            Thesis {isEditing && <Badge variant="warning" className="ml-2">Editing</Badge>}
                        </h2>
                        {isEditing ? (
                            <textarea
                                className="w-full min-h-[150px] p-4 bg-background/60 border border-border rounded-xs text-sm font-sans leading-relaxed focus:border-ring focus:ring-1 focus:ring-ring outline-none resize-y"
                                value={editContent.thesis}
                                onChange={(e) => setEditContent({...editContent, thesis: e.target.value})}
                            />
                        ) : (
                            <p className="font-heading text-base md:text-lg text-foreground leading-relaxed break-words">
                                {renderClaimWithCitations(memo.content?.thesis)}
                            </p>
                        )}
                    </section>

                    {/* Financial Highlights */}
                    <section className="mb-10">
                        <h2 className="font-heading text-2xl md:text-3xl text-foreground font-medium tracking-[-0.01em] mb-4">Financial highlights</h2>
                        <ul className="space-y-4 font-heading text-base md:text-lg text-foreground leading-relaxed list-disc pl-5">
                            {editContent.financial_highlights?.map((item: MemoClaim, i: number) => (
                                <li key={i} className="break-words">
                                    {isEditing ? (
                                        <textarea
                                            className="w-full min-h-[80px] mt-2 p-3 bg-background/60 border border-border rounded-xs text-sm font-sans leading-relaxed focus:border-ring focus:ring-1 focus:ring-ring outline-none resize-y"
                                            value={item.claim}
                                            onChange={(e) => handleClaimEdit('financial_highlights', i, e.target.value)}
                                        />
                                    ) : (
                                        renderClaimWithCitations(item.claim, item.citation_chunk_ids)
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* Risks */}
                    <section className="mb-6">
                        <h2 className="font-heading text-2xl md:text-3xl text-foreground font-medium tracking-[-0.01em] mb-4">Risks</h2>
                        <ul className="space-y-4 font-heading text-base md:text-lg text-foreground leading-relaxed list-disc pl-5">
                            {editContent.risks?.map((item: MemoClaim, i: number) => (
                                <li key={i} className="break-words">
                                    {isEditing ? (
                                        <textarea
                                            className="w-full min-h-[80px] mt-2 p-3 bg-background/60 border border-border rounded-xs text-sm font-sans leading-relaxed focus:border-ring focus:ring-1 focus:ring-ring outline-none resize-y"
                                            value={item.claim}
                                            onChange={(e) => handleClaimEdit('risks', i, e.target.value)}
                                        />
                                    ) : (
                                        renderClaimWithCitations(item.claim, item.citation_chunk_ids)
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                </article>

                {/* Right Pane: Interactive SEC Inspector */}
                <div className="w-full xl:w-[35%] flex flex-col xl:sticky xl:top-32 min-w-0">
                    <div className={glass}>
                        <PixelGrid />
                        <div className="p-5 md:p-6 flex flex-col">
                            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-border mb-6 gap-3">
                                <div className="label-mono flex items-center gap-2 text-foreground">
                                    <FileCheck className="size-4 text-primary shrink-0" />
                                    SEC verification
                                </div>
                                {citationData?.source_url && (
                                    <a href={citationData.source_url} target="_blank" rel="noopener noreferrer" className="label-mono flex items-center gap-1 text-primary hover:underline whitespace-nowrap shrink-0">
                                        View on EDGAR <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>

                            {!selectedCitationId ? (
                                <div className="py-8 text-muted-foreground font-mono text-xs leading-relaxed text-center">
                                    Click a citation tag in the memo to inspect its raw SEC source assertion.
                                </div>
                            ) : isCitationLoading ? (
                                <div className="py-8 flex items-center justify-center gap-2 text-muted-foreground text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" /> Resolving source...
                                </div>
                            ) : citationData ? (
                                <div className="flex flex-col gap-4">
                                    {/* Stacked single column on mobile, row on desktop */}
                                    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 w-full">
                                        <Badge className="font-mono max-w-full h-auto break-all whitespace-normal text-left">
                                            [{selectedCitationId}]
                                        </Badge>
                                        <Badge variant="success" className="uppercase shrink-0">
                                            SEC Verified
                                        </Badge>
                                    </div>
                                    <div className="font-heading text-xl text-foreground break-words">{company.name} filing record</div>
                                    <div className="label-mono text-primary break-words">{citationData.sec_item_label || "Disclosure Section"}</div>

                                    <div className="border border-border bg-background/50 rounded-xs p-3 md:p-4 mt-1">
                                        <div className="label-mono flex items-center justify-between text-muted-foreground text-[10px] mb-3">
                                            <span>Raw Excerpt</span>
                                            <span className="shrink-0">SEC ASCII</span>
                                        </div>
                                        <div className="font-heading text-xs md:text-sm text-foreground leading-relaxed bg-card p-3 md:p-4 rounded-xs border border-border border-l-2 border-l-primary max-h-64 overflow-y-auto break-words whitespace-pre-wrap">
                                            &#34;{citationData.content}&#34;
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div role="alert" className="py-8 flex flex-col items-center gap-2 text-center">
                                    <span className="label-mono text-destructive">Couldn&apos;t load [{selectedCitationId}]</span>
                                    <span className="font-mono text-xs leading-relaxed text-muted-foreground">
                                        {citationError?.message ?? "Failed to load citation source."}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}