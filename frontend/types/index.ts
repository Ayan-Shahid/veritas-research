// --- COMPANY ---
export interface Company {
    id: string; // uuid.UUID[cite: 37]
    ticker: string; //[cite: 37]
    name: string; //[cite: 37]
    cik: string; //[cite: 37]
    sic?: string | null; //[cite: 37]
    sector?: string | null; //[cite: 37]
    created_at: string; // datetime[cite: 37]
    filings_count?: number; // Optional frontend-only aggregation
}

// --- FILING ---
export interface Filing {
    id: string; // uuid.UUID[cite: 38]
    company_id: string; // uuid.UUID[cite: 38]
    accession_number: string; //[cite: 38]
    form_type: string; //[cite: 38]
    filing_date: string; // date[cite: 38]
    period_of_report?: string | null; // date | None[cite: 38]
    primary_document_url: string; //[cite: 38]
    ingested_at?: string | null; // datetime | None[cite: 38]
    created_at: string; // datetime[cite: 38]
}

// --- FILING CHUNK ---
export interface FilingChunk {
    id: string; // uuid.UUID[cite: 39]
    filing_id: string; // uuid.UUID[cite: 39]
    chunk_index: number; // int[cite: 39]
    content: string; //[cite: 39]
    chunk_metadata?: Record<string, never> | null; // dict | None[cite: 39]
    created_at: string; // datetime[cite: 39]
}

export interface IngestResult {
    filing_id: string; // uuid.UUID[cite: 39]
    chunks_created: number; // int[cite: 39]
    total_characters: number; // int[cite: 39]
}

// --- ORGANIZATION ---
export interface Organization {
    id: string; // uuid.UUID[cite: 40]
    name: string; //[cite: 40]
    slug: string; //[cite: 40]
    created_at: string; // datetime[cite: 40]
}

// --- WATCHLIST ---
export interface WatchlistCompany {
    watchlist_item_id: string; // uuid.UUID[cite: 41]
    company_id: string; // uuid.UUID[cite: 41]
    ticker: string; //[cite: 41]
    name: string; //[cite: 41]
    sector?: string | null; // str | None[cite: 41]
    added_at: string; // datetime[cite: 41]
}

// --- MEMO (Previously implemented, provided for completeness) ---
export interface MemoClaim {
    claim: string;
    citation_chunk_ids: string[];
}

export interface MemoGeneration {
    thesis: string;
    financial_highlights: MemoClaim[];
    risks: MemoClaim[];
}

export interface Memo {
    id: string;
    company_id: string;
    model_name: string;
    status: "draft" | "approved" | "rejected";
    content: MemoGeneration;
    source_chunk_ids: string[];
    created_at: string;
    updated_at: string;
}

export interface Job {
    id: string;
    job_type: string;
    company_id: string;
    status: "pending" | "processing" | "succeeded" | "failed";
    memo_id?: string;
    error?: string;
}