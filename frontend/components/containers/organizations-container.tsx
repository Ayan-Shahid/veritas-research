"use client";

import { useOrganizations, useCreateOrganization } from "@/hooks/use-organizations";
import { OrganizationsView } from "@/components/views/organizations-view";

export function OrganizationsContainer() {
    const { data: organizations = [], isLoading } = useOrganizations();
    const { mutate: createOrganization, isPending: isCreating } = useCreateOrganization();

    return (
        <OrganizationsView
            organizations={organizations}
            isLoading={isLoading}
            onCreateOrganization={(payload) => createOrganization(payload)}
            isCreating={isCreating}
        />
    );
}