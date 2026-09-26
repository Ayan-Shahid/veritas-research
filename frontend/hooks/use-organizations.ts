import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '@/lib/api-client';
import { Organization } from '@/types';

export function useOrganizations() {
    return useQuery({
        queryKey: ['organizations'],
        queryFn: () => fetcher<Organization[]>('/organizations'),
    });
}

export function useDefaultOrganization() {
    return useQuery({
        queryKey: ['organizations', 'default'],
        queryFn: () => fetcher<Organization>('/organizations/default'),
    });
}

export function useCreateOrganization() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: { name: string; slug: string }) =>
            fetcher<Organization>('/organizations', {
                method: 'POST',
                body: JSON.stringify(payload)
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
        },
    });
}