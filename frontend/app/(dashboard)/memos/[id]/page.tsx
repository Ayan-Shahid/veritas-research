import { MemoContainer } from "@/components/containers/memo-container";

export default async function MemoPage({ params }: { params: Promise<{ id: string }> }) {
    // Await the params promise required by Next.js 15+
    const resolvedParams = await params;

    return <MemoContainer memoId={resolvedParams.id} />;
}