"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import Aurora from "@/components/background/Aurora";
import Grainient from "@/components/background/Grainient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("login attempt", { email, password });
  }

  return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090b] px-4">

        {/* 1. Base Layer: Deep Dark WebGL Grainient */}
        <div className="absolute inset-0 z-0">
          <Grainient
              color1="#09090b"
              color2="#172554"
              color3="#042f2e"
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
              contrast={1.5}
              gamma={0.8}
              saturation={1}
              centerX={0}
              centerY={0}
              zoom={0.9}
          />
        </div>

        {/* 2. Middle Layer: Fluid Aurora Highlights */}
        <div className="pointer-events-none absolute inset-0 z-10 opacity-30 mix-blend-screen">
          <Aurora
              colorStops={["#2563eb", "#0d9488", "#1d4ed8"]}
              blend={0.6}
              amplitude={1}
              speed={0.8}
          />
        </div>

        {/* 3. Foreground: Zinc Glassmorphism Card */}
        <div className="relative z-20 w-full max-w-sm">
          {/* Foreground: High-Translucency Glassmorphism Card */}
          <div className="relative z-20 w-full max-w-sm">
            <Card className="border border-white/10 bg-zinc-950/20 shadow-2xl backdrop-blur-md ring-1 ring-white/5">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-zinc-50">Sign in</CardTitle>
                <CardDescription className="text-zinc-400">
                  Enter your credentials to access the research platform.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-zinc-300">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="analyst@fund.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border-white/10 bg-white/[0.03] text-zinc-50 placeholder:text-zinc-500 backdrop-blur-sm focus-visible:ring-blue-500/40"
                        required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-zinc-300">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border-white/10 bg-white/[0.03] text-zinc-50 backdrop-blur-sm focus-visible:ring-blue-500/40"
                        required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-blue-600 text-white shadow-md hover:bg-blue-500">
                    Sign in
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>

      </main>
  );
}