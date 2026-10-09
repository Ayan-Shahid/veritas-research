"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { IDLE, type ActionState } from "@/lib/auth/state";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;
type Success = Extract<ActionState, { status: "success" }>;

const NETWORK_ERROR: ActionState = {
    status: "error",
    message: "We couldn't reach the server. Check your connection and try again.",
};

export function useServerAction<T extends FieldValues>({
                                                           action,
                                                           setError,
                                                           onSuccess,
                                                       }: {
    action: Action;
    setError: UseFormSetError<T>;
    onSuccess?: (state: Success) => void;
}) {
    // If the request itself fails (offline, server down) the action throws. Left alone, that
    // reaches the nearest error boundary and replaces the whole page. Turn it into form state.
    // Our actions return states instead of calling redirect(), so catching here can't swallow a redirect.
    const safeAction: Action = async (prev, formData) => {
        try {
            return await action(prev, formData);
        } catch {
            return NETWORK_ERROR;
        }
    };

    const [state, formAction, isPending] = useActionState(safeAction, IDLE);
    const formRef = useRef<HTMLFormElement>(null);
    const onSuccessRef = useRef(onSuccess);
    const pendingRef = useRef(false);

    useEffect(() => {
        onSuccessRef.current = onSuccess;
        pendingRef.current = isPending;
    });

    useEffect(() => {
        if (state.status === "error" && state.fieldErrors) {
            for (const [name, messages] of Object.entries(state.fieldErrors)) {
                if (messages[0]) setError(name as Path<T>, { type: "server", message: messages[0] });
            }
        }
        if (state.status === "success") onSuccessRef.current?.(state);
    }, [state, setError]);

    /** Call only after client-side validation passed (i.e. from handleSubmit). */
    const submit = () => {
        // A second submit while one is in flight (Enter key, double click) is ignored.
        if (!formRef.current || pendingRef.current) return;
        const data = new FormData(formRef.current);
        startTransition(() => formAction(data));
    };

    return { state, formAction, formRef, isPending, submit };
}