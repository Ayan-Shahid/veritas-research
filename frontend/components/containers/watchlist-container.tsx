"use client";

import {useDefaultOrganization} from "@/hooks/use-organizations";
import {useWatchlist, useWatchlistActions} from "@/hooks/use-watchlist";
import {WatchlistView} from "@/components/views/watchlist-view";

export function WatchlistContainer() {
    // Determine context[cite: 11]
    const {data: defaultOrg, isLoading: isLoadingOrg} = useDefaultOrganization();

    // Fetch watchlist based on org[cite: 12]
    const {data: watchlist = [], isLoading: isLoadingWatchlist} = useWatchlist(defaultOrg?.id);
    const {remove, add} = useWatchlistActions(defaultOrg?.id);

    return (
        <WatchlistView
            organization={defaultOrg}
            watchlist={watchlist}
            isLoading={isLoadingOrg || isLoadingWatchlist}
            onRemove={(companyId) => remove.mutate(companyId)}
            isRemovingId={remove.isPending ? remove.variables : null}
            // Add handler included for testing via manual company ID entry if needed
            onAdd={(companyId) => add.mutate(companyId)}
            isAdding={add.isPending}
        />
    );
}