import {useQuery, useMutation, useQueryClient, useQueries} from '@tanstack/react-query';
import { fetcher } from '@/lib/api-client';
import {Company, Filing} from '@/types';

export function useCompanies() {
    return useQuery({
        queryKey: ['companies'],
        queryFn: () => fetcher<Company[]>('/companies'),
    });
}

export function useCompany(companyId?: string) {
    return useQuery({
        queryKey: ['company', companyId],
        queryFn: () => fetcher<Company>(`/companies/${companyId}`),
        enabled: !!companyId,
    });
}


export function useCreateCompany() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: { ticker: string; name: string; cik: string; sic?: string; sector?: string }) =>
            fetcher<Company>('/companies', {
                method: 'POST',
                body: JSON.stringify(payload)
            }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
    });
}


export function useFilteredCompanies(searchQuery: string) {
    const { data: companies = [], isLoading: isCompaniesLoading } = useCompanies();

    // Parallel fetch filings for all loaded companies to calculate ingestion counts
    const filingQueries = useQueries({
        queries: companies.map((company) => ({
            queryKey: ['filings', company.id],
            queryFn: () => fetcher<Filing[]>(`/companies/${company.id}/filings`),
            enabled: !!company.id,
        })),
    });

    const isFilingsLoading = filingQueries.some(q => q.isLoading);

    // Stitch filings data into the company objects
    const companiesWithCounts = companies.map((company, index) => {
        const companyFilings = filingQueries[index]?.data || [];
        // Count only the filings that have successfully been vectorized
        const ingestedCount = companyFilings.filter(f => f.ingested_at !== null).length;
        return {
            ...company,
            filings_count: ingestedCount
        };
    });

    // Apply search filter
    const filteredCompanies = companiesWithCounts.filter((company) => {
        if (!searchQuery) return true;
        const lowerQuery = searchQuery.toLowerCase();
        return (
            company.name.toLowerCase().includes(lowerQuery) ||
            company.ticker.toLowerCase().includes(lowerQuery) ||
            (company.sector && company.sector.toLowerCase().includes(lowerQuery))
        );
    });

    const totalCompanies = filteredCompanies.length;
    const totalIngested = filteredCompanies.reduce((acc, curr) => acc + (curr.filings_count || 0), 0);

    return {
        companies: filteredCompanies,
        metrics: {
            totalCompanies,
            totalIngested,
        },
        isLoading: isCompaniesLoading || isFilingsLoading,
    };
}