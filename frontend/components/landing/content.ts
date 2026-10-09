/**
 * Every claim on the landing page lives here, next to the code that backs it.
 * Rule for editing: if you can't point at a file or a test that proves a sentence, don't ship it.
 * No metrics, no customer names, no testimonials, because none exist to cite.
 */

export const HERO = {
    eyebrow: "Citation-first equity research",
    titleLead: "Equity research memos you can",
    titleAccent: "check against the filing.",
    // Backed by: memo schema (thesis / financial_highlights / risks, each claim with citation ids),
    // GET /memos/{id}/citations/{citation_id}, and the approve/reject/edit routes in routes/memos.py.
    body: "Veritas drafts a thesis, financial highlights and risks from SEC 10-K and 10-Q filings. Claims are written with citations you can click to read the original text. Then you edit, approve or reject.",
    primary: { label: "Try it as a guest", href: "/companies" },
    secondary: { label: "Sign in", href: "/login" },
    // Backed by: anonymous sign-in bootstrap (AuthProvider) + the register flow that upgrades the same user id.
    note: "No account needed to start. Add an email later to keep your work.",
} as const;

/** Illustration only: placeholder lines. Labels come from the real chunker output. */
export const PREVIEW = {
    caption: "Layout illustration with placeholder lines. Not real output.",
    claims: [
        // sec_item_label values below are exactly what services/chunking.py writes for 10-K filings.
        { section: "Thesis", chip: "sec-3f9a1c2e", item: "Item 1: Business", widths: [100, 94, 62] },
        { section: "Financial highlights", chip: "sec-b72d0e41", item: "Item 7: MD&A", widths: [96, 80] },
        { section: "Risks", chip: "sec-91c5a8d6", item: "Item 1A: Risk Factors", widths: [100, 72] },
    ],
} as const;

export const STEPS = [
    {
        title: "Sync filings",
        // Backed by: services/edgar.py (forms=("10-K","10-Q")), routes/filings.py (sync, recent filings).
        body: "Pull a company's recent 10-K and 10-Q filings straight from SEC EDGAR.",
    },
    {
        title: "Ingest",
        // Backed by: services/chunking.py (sec2md parsing, tables kept intact, child chunks with parent context),
        // services/embeddings.py, FilingChunk.embedding (pgvector).
        body: "Each filing is split into sections and tables, then embedded into Postgres with pgvector so the right passages can be retrieved.",
    },
    {
        title: "Generate",
        // Backed by: Celery generate_memo_task, Job status polling, Notification rows + NotificationToaster.
        body: "A background job drafts the memo and you're notified when it's ready. You can keep working in the meantime.",
    },
    {
        title: "Review",
        // Backed by: memo-view.tsx (citation panel, edit, version history, audit log, approve/reject).
        body: "Click any citation to read the filing text behind it. Edit the draft, approve or reject it, and see what changed.",
    },
] as const;

export const FEATURES = [
    {
        icon: "fingerprint",
        title: "Citations you can open",
        // Backed by: GET /memos/{id}/citations/{cid} returns source_url, sec_item_label, content;
        // memo-view.tsx renders the text and a "View on EDGAR" link.
        body: "Click a citation to read the exact filing passage it points to, with its SEC Item label and a link back to EDGAR.",
    },
    {
        icon: "filecheck",
        title: "Invalid citations are dropped",
        // Backed by: services/grounding.py strip_invalid_citations, called in tasks/memo_tasks.py before saving.
        body: "Before a memo is saved, any citation that doesn't match an excerpt the model was actually given is removed.",
    },
    {
        icon: "history",
        title: "Edits keep their history",
        // Backed by: PATCH /memos/{id} + GET /memos/{id}/versions (MemoVersion snapshots).
        body: "Rewrite any claim. Each edit snapshots the previous version so you can look back at what the draft said before.",
    },
    {
        icon: "clipboard",
        title: "A visible audit trail",
        // Backed by: AuditLog rows for memo_generated, memo_edited, memo_approved, memo_rejected, memo_deleted.
        body: "Generation, edits, approvals and rejections are logged against the memo, and the log is one click away.",
    },
    {
        icon: "bell",
        title: "Long jobs run in the background",
        // Backed by: Celery + Redis queue, Notification model, /notifications routes, NotificationToaster.
        body: "Drafting happens off the request path. A toast and the bell in the header tell you when it finishes or fails.",
    },
    {
        icon: "building",
        title: "Workspaces stay separate",
        // Backed by: organization_id on companies/filings/memos + get_owned_* dependencies returning 404 cross-org.
        body: "Companies, filings and memos belong to the workspace that created them. Another workspace's IDs simply return not found.",
    },
] as const;

export const MEASURED = {
    title: "Checked by scorers, not adjectives.",
    // Backed by: backend/app/eval/scorers.py and eval/data/baseline_eval_set.json (a handful of filings).
    intro: "There are no accuracy percentages on this page. They would be meaningless without a run you can inspect. What exists is a set of scorers that run against generated memos, and each one is upfront about what it can't tell you.",
    scorers: [
        {
            name: "Citation coverage",
            checks: "The share of highlight and risk claims that cite at least one excerpt.",
            limit: "It doesn't check that the cited excerpt actually supports the claim.",
        },
        {
            name: "Numeric agreement",
            checks: "For claims that contain numbers, whether those numbers appear in the text the claim cites. Deterministic, with no model involved.",
            limit: "It's a literal string match, so a figure formatted differently from the filing can be flagged, and it can't judge meaning.",
        },
        {
            name: "Faithfulness (model-judged)",
            checks: "A second model call judges whether each cited claim is fully supported by its cited excerpts.",
            limit: "It's a model grading a model. It runs on demand because it costs API calls, and claims with no citation count as unsupported.",
        },
    ],
    footer: "A small regression set guards the prompt: change the prompt, rerun the scorers, compare.",
} as const;

export const LIMITS = {
    title: "What it doesn't do.",
    items: [
        {
            title: "Filings only, and only parts of them",
            // Backed by: services/chunking.py target_items; services/edgar.py forms.
            body: "10-K and 10-Q filings from SEC EDGAR. It reads Business, Risk Factors and MD&A from 10-Ks, and Financial Statements, MD&A and Risk Factors from 10-Qs. There are no earnings transcripts or market data.",
        },
        {
            title: "It drafts, people decide",
            // Backed by: Memo.status default "draft"; approve/reject routes.
            body: "New memos start as drafts. Nothing counts as approved until an analyst approves it.",
        },
        {
            title: "Citation checks have gaps",
            // Backed by: grounding.py keeps the claim when it strips citations; MemoUpdate docstring says edits aren't re-validated.
            body: "Invalid citations are removed but the claim stays, so a claim can end up with no source. Manual edits are not re-checked against the filing.",
        },
        {
            title: "Not investment advice",
            body: "It's a research drafting tool. Verify anything that matters against the filing itself.",
        },
    ],
} as const;

export const STACK = [
    // Backed by: package.json, requirements.txt, docker-compose.yml.
    "Next.js",
    "FastAPI",
    "PostgreSQL + pgvector",
    "Celery + Redis",
    "Claude via LangChain",
    "Supabase Auth",
] as const;

export const FINAL_CTA = {
    title: "Open a memo and check the sources yourself.",
    body: "Guest workspaces live in this browser until you add an email.",
} as const;

export const FOOTER_NOTE =
    "Filing text comes from SEC EDGAR. Veritas Research is under active development and does not provide investment advice.";