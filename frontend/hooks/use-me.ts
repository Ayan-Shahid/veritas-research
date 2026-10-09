import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api-client";
import type { Organization } from "@/types";

export interface Me {
    id: string;
    email: string | null;
    is_anonymous: boolean;
    organization: Organization;
}

export function useMe() {
    return useQuery({ queryKey: ["me"], queryFn: () => fetcher<Me>("/users/me") });
}