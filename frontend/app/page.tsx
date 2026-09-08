import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-semibold">Veritas Research</h1>
      <p className="max-w-md text-slate-400">
        AI-powered equity research copilot. Every generated claim is grounded
        in a cited filing, transcript, or data source.
      </p>
      <Link
        href="/login"
        className="rounded-md bg-emerald-500 px-5 py-2.5 font-medium text-slate-950 hover:bg-emerald-400"
      >
        Sign in
      </Link>
    </main>
  );
}
