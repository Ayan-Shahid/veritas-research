"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EXIT_MS, type Direction, type Phase } from "./motion";

export function useStepTransition<S extends string>(initial: S, order: readonly S[]) {
    const [step, setStep] = useState<S>(initial);
    const [phase, setPhase] = useState<Phase>("in");
    const [direction, setDirection] = useState<Direction>(1);
    const current = useRef<S>(initial);
    const timer = useRef<number | null>(null);

    useEffect(
        () => () => {
            if (timer.current !== null) window.clearTimeout(timer.current);
        },
        [],
    );

    const go = useCallback(
        (next: S) => {
            if (timer.current !== null) window.clearTimeout(timer.current);
            setDirection(order.indexOf(next) >= order.indexOf(current.current) ? 1 : -1);
            setPhase("out");
            const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            timer.current = window.setTimeout(
                () => {
                    current.current = next;
                    setStep(next);
                    setPhase("in");
                    timer.current = null;
                },
                reduce ? 0 : EXIT_MS,
            );
        },
        [order],
    );

    return { step, phase, direction, go };
}