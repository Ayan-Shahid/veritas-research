/** What the UI needs to know about the signed-in user. Safe to ship to the browser. */
export interface AuthUser {
    id: string;
    /** null for guests (anonymous users have no address until they register). */
    email: string | null;
    isAnonymous: boolean;
    /** ISO string */
    createdAt: string;
}

/** The fields we read from a Supabase Auth (GoTrue) user. */
interface RawUser {
    id: string;
    email?: string | null;
    is_anonymous?: boolean | null;
    created_at: string;
}

export function toAuthUser(u: RawUser): AuthUser {
    const isAnonymous = u.is_anonymous === true;
    return {
        id: u.id,
        // A guest mid-registration can carry an unconfirmed address in `new_email`, never in `email`.
        email: isAnonymous ? null : u.email || null,
        isAnonymous,
        createdAt: new Date(u.created_at).toISOString(),
    };
}
