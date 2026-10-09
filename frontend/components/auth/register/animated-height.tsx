"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const PAD = 12; // px of breathing room so focus rings and glows aren't clipped

/** Smoothly animates its height to fit whatever it contains (steps differ in height). */
export function AnimatedHeight({ children, className }: { children: React.ReactNode; className?: string }) {
    const innerRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | null>(null);

    useEffect(() => {
        const el = innerRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            const box = entries[0]?.borderBoxSize?.[0];
            setHeight(box ? box.blockSize : el.offsetHeight);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            className={cn(
                "-mx-3 -my-3 overflow-hidden px-3 py-3 transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                className,
            )}
            style={height === null ? undefined : { height: height + PAD * 2 }}
        >
            <div ref={innerRef}>{children}</div>
        </div>
    );
}