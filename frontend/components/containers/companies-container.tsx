"use client";

import { useQueryState } from "nuqs";
import { useFilteredCompanies, useCreateCompany } from "@/hooks/use-companies";
import { CompaniesView } from "@/components/views/companies-view";

export function CompaniesContainer() {
    const [searchQuery, setSearchQuery] = useQueryState("q", { defaultValue: "" });
    const { companies, metrics, isLoading } = useFilteredCompanies(searchQuery);

    // Hook up the creation mutation
    const { mutate: createCompany, isPending: isCreating } = useCreateCompany();

    return (
        <CompaniesView
            companies={companies}
            metrics={metrics}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isLoading={isLoading}
            onCreateCompany={(data) => createCompany(data)}
            isCreating={isCreating}
        />
    );
}