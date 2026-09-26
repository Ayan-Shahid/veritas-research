import Link from "next/link";
import {Button} from "@/components/ui/button";
import {ArrowRight} from "lucide-react";
import Aurora from "@/components/background/Aurora";
import Grainient from "@/components/background/Grainient";

export default function HomePage() {
    return (
        <main
            className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">

            {/* 1. Base Layer: WebGL Grainient */}
            <div className="absolute inset-0 z-0">
                <Grainient
                    color1="#2dd4bf" // Teal (Mapping to chart-2/accent)
                    color2="#7c3aed" // Indigo (Mapping to deep primary purple)
                    color3="#020617" // Dark Slate (Mapping to background)
                    timeSpeed={0.25}
                    colorBalance={0}
                    warpStrength={1.5}
                    warpFrequency={4}
                    warpSpeed={1.5}
                    warpAmplitude={40}
                    blendAngle={0}
                    blendSoftness={0.1}
                    rotationAmount={500}
                    noiseScale={2}
                    grainAmount={0.08}
                    grainScale={1.5}
                    grainAnimated={true}
                    contrast={1.2}
                    gamma={1}
                    saturation={0.8}
                    centerX={0}
                    centerY={0}
                    zoom={0.9}
                />
            </div>

            {/* 2. Middle Layer: Fluid Aurora */}
            <div className="pointer-events-none absolute inset-0 z-10 opacity-30 mix-blend-screen">
                <Aurora
                    colorStops={["#2dd4bf", "#c084fc", "#7c3aed"]}
                    blend={0.6}
                    amplitude={0.8}
                    speed={0.8}
                />
            </div>

            {/* 3. Foreground: Glassmorphism UI */}
            <div
                className="relative z-20 flex max-w-2xl flex-col items-center gap-6 rounded-2xl border border-border/40 bg-card/30 p-10 text-center shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col gap-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
                        Institutional Research Engine
                    </span>
                    <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                        Equity Insights
                    </h1>
                </div>

                <p className="max-w-md font-sans text-lg text-muted-foreground leading-relaxed">
                    AI-powered equity research copilot. Every generated claim is strictly grounded
                    in vectorized SEC filings to eliminate hallucinations and ensure institutional accuracy.
                </p>

                {/* Authentication bypassed; routing directly to workspace */}
                <Button nativeButton={false} render={<Link href="/companies"/>} size="lg"
                        className="mt-4 shadow-lg group bg-primary hover:bg-primary/90 text-primary-foreground">

                    Enter Workspace
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"/>
                </Button>
            </div>
        </main>
    );
}