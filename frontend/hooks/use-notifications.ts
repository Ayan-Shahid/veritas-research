// hooks/use-notifications.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetcher } from '@/lib/api-client'

export interface AppNotification {
    id: string
    kind: 'job_started' | 'job_succeeded' | 'job_failed'
    memo_id?: string | null
    message: string
    read_at?: string | null
    created_at: string
}

export function useNotifications() {
    return useQuery({
        queryKey: ['notifications'],
        queryFn: () => fetcher<AppNotification[]>('/notifications'),
        refetchInterval: 10000, // separate, coarser cadence than active-job polling
    })
}

export function useUnreadCount() {
    const { data } = useNotifications()
    return data?.filter((n) => !n.read_at).length ?? 0
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => fetcher(`/notifications/${id}/read`, { method: 'POST' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    })
}