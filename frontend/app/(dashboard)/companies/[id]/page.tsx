import { CompanyDetailContainer } from "@/components/containers/company-detail-container";

export default async function CompanyPage({ params }: { params: { id: string } }) {
    // Await params in Next.js 15+
    const resolvedParams = await params;
    return <CompanyDetailContainer companyId={resolvedParams.id} />;
}