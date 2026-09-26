const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetcher<T>(endpoint: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...init?.headers,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || `API error: ${res.status}`);
    }
    return res.json();
}