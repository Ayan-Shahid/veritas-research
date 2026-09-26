import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/api-client';
import { FilingChunk } from '@/types';

export function useChunk(chunkId?: string) {
    return useQuery({
        queryKey: ['chunk', chunkId],
        queryFn: () => fetcher<FilingChunk>(`/chunks/${chunkId}`),
        enabled: !!chunkId,
    });
}