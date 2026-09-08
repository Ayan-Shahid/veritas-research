type Company = {
  id: string;
  ticker: string;
  name: string;
};

async function getCompanies(): Promise<Company[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/companies`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const companies = await getCompanies();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Watchlist</h1>

      {companies.length === 0 ? (
        <p className="text-slate-400">
          No companies yet. Add one via the API (
          <code className="rounded bg-slate-800 px-1">POST /companies</code>)
          to see it here.
        </p>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
          {companies.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3">
              <span className="font-medium">{c.ticker}</span>
              <span className="text-slate-400">{c.name}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
