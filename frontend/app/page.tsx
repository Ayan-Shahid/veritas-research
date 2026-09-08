import Link from "next/link";
import { Button } from "@/components/ui/button";
import Aurora from "@/components/background/Aurora";
import Grainient from "@/components/background/Grainient"; // Adjust path as needed

export default function HomePage() {
    return (
        <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0F111A] px-4">

            {/* 1. Base Layer: WebGL Grainient */}
            <div className="absolute inset-0 z-0">
                <Grainient
                    color1="#22D3EE" // Teal (matches chart-1)
                    color2="#6D28D9" // Indigo (matches primary)
                    color3="#0F111A" // Dark Slate (matches background)
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
                    grainAmount={0.08} // Dialed in for a subtle matte finish
                    grainScale={1.5}
                    grainAnimated={true} // Set to true for subtle film-grain motion
                    contrast={1.2}
                    gamma={1}
                    saturation={0.8} // Slightly desaturated to maintain institutional feel
                    centerX={0}
                    centerY={0}
                    zoom={0.9}
                />
            </div>

            {/* 2. Middle Layer: Fluid Aurora */}
            <div className="pointer-events-none absolute inset-0 z-10 opacity-30 mix-blend-screen">
                <Aurora
                    colorStops={["#22D3EE", "#B497CF", "#6D28D9"]}
                    blend={0.6}
                    amplitude={0.8}
                    speed={0.8} // Slowed down slightly for ambient AI feel
                />
            </div>

            {/* 3. Foreground: Glassmorphism UI */}
            <div className="relative z-20 flex max-w-2xl flex-col items-center gap-6 rounded-2xl border border-white/10 bg-background/40 p-10 text-center shadow-2xl backdrop-blur-xl">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                    Veritas Research
                </h1>
                <p className="max-w-md text-lg text-muted-foreground">
                    AI-powered equity research copilot. Every generated claim is grounded
                    in a cited filing, transcript, or data source.
                </p>
                <Button size="lg" className="mt-4 w-40 shadow-lg">
                    <Link href="/login">Sign in</Link>
                </Button>
            </div>

        </main>
    );
}