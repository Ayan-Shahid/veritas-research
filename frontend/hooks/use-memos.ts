import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '@/lib/api-client';
import { Memo, Job, MemoGeneration } from '@/types';

export function useMemos(companyId?: string) {
    return useQuery({
        queryKey: ['memos', companyId],
        queryFn: () => fetcher<Memo[]>(`/companies/${companyId}/memos`),
        enabled: !!companyId,
    });
}

export function useMemo(memoId?: string) {
    return useQuery({
        queryKey: ['memo', memoId],
        queryFn: () => fetcher<Memo>(`/memos/${memoId}`),
        enabled: !!memoId,
    });
}

export interface CitationResponse {
    citation_id: string;
    source_url?: string | null;
    sec_item_label?: string | null;
    content: string;
}

export interface MemoVersion {
    id: string;
    memo_id: string;
    content: MemoGeneration;
    created_at: string;
}

export interface AuditLog {
    id: string;
    action: string;
    target_type: string;
    target_id: string;
    company_id?: string | null;
    details?: Record<string, never> | null;
    created_at: string;
}

export function useCitation(memoId?: string, citationId?: string) {
    return useQuery({
        queryKey: ['memo', memoId, 'citation', citationId],
        queryFn: () => fetcher<CitationResponse>(`/memos/${memoId}/citations/${encodeURIComponent(citationId!)}`),
        retry: false,
        enabled: !!memoId && !!citationId,
    });
}

export function useMemoVersions(memoId?: string) {
    return useQuery({
        queryKey: ['memo', memoId, 'versions'],
        queryFn: () => fetcher<MemoVersion[]>(`/memos/${memoId}/versions`),
        enabled: !!memoId,
    });
}

export function useMemoAuditLog(memoId?: string) {
    return useQuery({
        queryKey: ['memo', memoId, 'audit-log'],
        queryFn: () => fetcher<AuditLog[]>(`/memos/${memoId}/audit-log`),
        enabled: !!memoId,
    });
}

export function useJob(jobId?: string | null) {
    return useQuery({
        queryKey: ['job', jobId],
        queryFn: () => fetcher<Job>(`/jobs/${jobId}`),
        enabled: !!jobId,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status === 'succeeded' || status === 'failed') return false;
            return 3000;
        },
    });
}

export function useMemoActions(memoId?: string, companyId?: string) {
    const queryClient = useQueryClient();

    const generate = useMutation({
        mutationFn: () => fetcher<Job>(`/companies/${companyId}/memos/generate`, { method: 'POST' }),
    });

    const update = useMutation({
        mutationFn: (payload: MemoGeneration) =>
            fetcher<Memo>(`/memos/${memoId}`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memo', memoId] }),
    });

    const approve = useMutation({
        mutationFn: () => fetcher<Memo>(`/memos/${memoId}/approve`, { method: 'POST' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memo', memoId] }),
    });

    const reject = useMutation({
        mutationFn: () => fetcher<Memo>(`/memos/${memoId}/reject`, { method: 'POST' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memo', memoId] }),
    });

    const remove = useMutation({
        mutationFn: () => fetcher(`/memos/${memoId}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['memos'] });
            queryClient.removeQueries({ queryKey: ['memo', memoId] });
        },
    });

    return { generate, update, approve, reject, remove };
}