export type ActionState =
    | { status: "idle" }
    | { status: "error"; message: string; fieldErrors?: Record<string, string[]> }
    | { status: "success"; message?: string; redirectTo?: string };

export const IDLE: ActionState = { status: "idle" };