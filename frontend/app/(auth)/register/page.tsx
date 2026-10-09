import type { Metadata } from "next";
import { RegisterFlow } from "@/components/auth/register-flow";

export const metadata: Metadata = { title: "Save your work", robots: { index: false } };

export default function RegisterPage() {
    return (
        <main className="flex min-h-screen items-center justify-center p-4 py-10">
            <RegisterFlow />
        </main>
    );
}