import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '@/lib/api-client';
import { Filing, FilingChunk, IngestResult } from '@/types';

export function useFilings(companyId?: string) {
    return useQuery({
        queryKey: ['filings', companyId],
        queryFn: () => fetcher<Filing[]>(`/companies/${companyId}/filings`),
        enabled: !!companyId,
    });
}

export function useFilingChunks(filingId?: string) {
    return useQuery({
        queryKey: ['filings', filingId, 'chunks'],
        queryFn: () => fetcher<FilingChunk[]>(`/filings/${filingId}/chunks`),
        enabled: !!filingId,
    });
}

export function useFilingActions(companyId?: string) {
    const queryClient = useQueryClient();

    const sync = useMutation({
        mutationFn: () => fetcher<Filing[]>(`/companies/${companyId}/filings/sync`, { method: 'POST' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['filings', companyId] }),
    });

    const ingest = useMutation({
        mutationFn: (filingId: string) => fetcher<IngestResult>(`/filings/${filingId}/ingest`, { method: 'POST' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['filings', companyId] }),
    });

    const purge = useMutation({
        mutationFn: (filingId: string) => fetcher(`/filings/${filingId}/ingest`, { method: 'DELETE' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['filings', companyId] }),
    });

    const purgeAll = useMutation({
        mutationFn: () => fetcher('/filings/ingest/all', { method: 'DELETE' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['filings'] }),
    });

    return { sync, ingest, purge, purgeAll };
}