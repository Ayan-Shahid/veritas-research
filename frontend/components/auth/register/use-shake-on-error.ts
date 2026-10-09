"use client";

import { useEffect, type RefObject } from "react";
import type { ActionState } from "@/lib/auth/state";

const KEYFRAMES = [
    { transform: "translateX(0)" },
    { transform: "translateX(-9px)" },
    { transform: "translateX(8px)" },
    { transform: "translateX(-5px)" },
    { transform: "translateX(3px)" },
    { transform: "translateX(0)" },
];

/** Shakes an element once. A no-op under prefers-reduced-motion. */
export function shakeElement(el: HTMLElement | null | undefined) {
    if (!el || typeof el.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.animate(KEYFRAMES, { duration: 420, easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)" });
}

/** Shakes the element whenever a server action comes back with an error. */
export function useShakeOnError(ref: RefObject<HTMLElement | null>, state: ActionState) {
    useEffect(() => {
        if (state.status === "error") shakeElement(ref.current);
    }, [ref, state]);
}