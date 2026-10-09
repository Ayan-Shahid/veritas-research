"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Fades and lifts its children in the first time they scroll into view.
 * Under prefers-reduced-motion the content is simply visible (see the motion-reduce classes),
 * and <noscript> in app/page.tsx un-hides everything when JavaScript is off.
 */
export function Reveal({
                           children,
                           delay = 0,
                           className,
                       }: {
    children: React.ReactNode;
    delay?: number;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setShown(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            data-reveal
            style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
            className={cn(
                "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
                "motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none",
                className,
            )}
        >
            {children}
        </div>
    );
}