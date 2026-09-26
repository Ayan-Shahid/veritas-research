import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '@/lib/api-client';
import { WatchlistCompany } from '@/types';

export function useWatchlist(orgId?: string) {
    return useQuery({
        queryKey: ['watchlist', orgId],
        queryFn: () => fetcher<WatchlistCompany[]>(`/organizations/${orgId}/watchlist`),
        enabled: !!orgId,
    });
}

export function useWatchlistActions(orgId?: string) {
    const queryClient = useQueryClient();

    const add = useMutation({
        mutationFn: (companyId: string) =>
            fetcher<WatchlistCompany>(`/organizations/${orgId}/watchlist`, {
                method: 'POST',
                body: JSON.stringify({ company_id: companyId })
            }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist', orgId] }),
    });

    const remove = useMutation({
        mutationFn: (companyId: string) =>
            fetcher(`/organizations/${orgId}/watchlist/${companyId}`, { method: 'DELETE' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist', orgId] }),
    });

    return { add, remove };
}