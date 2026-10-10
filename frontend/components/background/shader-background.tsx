"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/*
 * Tech-grid background: a 1px minor/major grid drawn in CSS-pixel space (crisp at any DPR),
 * crosshair marks on major intersections, sparse "data" pulses running along major lines,
 * a few minor cells blinking on and off, and a vignette that keeps the centre calm for content.
 */

const vertexShader = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
    }
`;

const fragmentShader = /* glsl */ `
    precision highp float;

    uniform float u_time;
    uniform vec2 u_size;    // canvas size in CSS pixels
    uniform float u_dpr;
    uniform float u_theme;  // 0 = light, 1 = dark

    const float MINOR = 28.0;           // CSS px between minor lines
    const float MAJOR = MINOR * 5.0;    // CSS px between major lines

    float hash11(float p) {
        p = fract(p * 0.1031);
        p *= p + 33.33;
        p *= p + p;
        return fract(p);
    }

    float hash21(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
    }

    // Coverage of a 1-CSS-px line at distance d (CSS px) from its centre, antialiased over one device px.
    float line(float d) {
        float halfWidth = 0.5;
        float aa = 1.0 / u_dpr;
        return 1.0 - smoothstep(halfWidth - aa * 0.5, halfWidth + aa * 0.5, d);
    }

    // Distance (CSS px) from p to the nearest grid line of spacing s, per axis.
    vec2 gridDist(vec2 p, float s) {
        return abs(mod(p + 0.5 * s, s) - 0.5 * s);
    }

    // A bright head with a fading tail travelling along +axis. Returns 0..1.
    float pulse(float along, float lane, float span, float seed) {
        float laneOn = step(0.62, hash11(lane * 7.13 + seed));
        float speed = mix(70.0, 160.0, hash11(lane * 3.71 + seed));
        float period = span + 600.0;
        float head = mod(u_time * speed + hash11(lane * 1.93 + seed) * period, period) - 300.0;
        float behind = head - along;                 // > 0 means this pixel is behind the head
        float tail = exp(-max(behind, 0.0) / 90.0) * step(0.0, behind);
        return tail * laneOn;
    }

    void main() {
        // CSS-pixel coordinates, origin top-left (so the grid stays anchored to the top of the page).
        vec2 p = vec2(gl_FragCoord.x, u_size.y * u_dpr - gl_FragCoord.y) / u_dpr;

        vec3 bg      = mix(vec3(0.972, 0.974, 0.980), vec3(0.047, 0.051, 0.063), u_theme);
        vec3 minorC  = mix(vec3(0.905, 0.910, 0.925), vec3(0.090, 0.098, 0.118), u_theme);
        vec3 majorC  = mix(vec3(0.835, 0.842, 0.865), vec3(0.135, 0.145, 0.175), u_theme);
        vec3 markC   = mix(vec3(0.640, 0.650, 0.690), vec3(0.300, 0.320, 0.380), u_theme);
        vec3 signalC = mix(vec3(0.255, 0.330, 0.880), vec3(0.380, 0.520, 1.000), u_theme);

        vec2 dMinor = gridDist(p, MINOR);
        vec2 dMajor = gridDist(p, MAJOR);

        float minorLine = max(line(dMinor.x), line(dMinor.y));
        float majorLine = max(line(dMajor.x), line(dMajor.y));

        // Crosshair "+" (9 px arms) on every major intersection.
        float arm = 4.5;
        float mark = max(
            line(dMajor.x) * step(dMajor.y, arm),
            line(dMajor.y) * step(dMajor.x, arm)
        );

        // Vignette: fade the grid towards the edges, keep it strongest near the top-centre.
        vec2 uv = p / u_size;
        float vignette = 1.0 - smoothstep(0.35, 1.05, length((uv - vec2(0.5, 0.25)) * vec2(1.1, 1.0)));
        float gridAlpha = mix(0.45, 1.0, vignette);

        vec3 color = bg;

        // Blinking minor cells: a handful light up for a few seconds at a time.
        vec2 cell = floor(p / MINOR);
        float epoch = floor(u_time * 0.35 + hash21(cell) * 8.0);
        float lit = step(0.992, hash21(cell + epoch * 17.0));
        vec2 inCell = mod(p, MINOR);
        float inset = step(3.0, inCell.x) * step(3.0, inCell.y) * step(inCell.x, MINOR - 3.0) * step(inCell.y, MINOR - 3.0);
        color = mix(color, signalC, lit * inset * mix(0.06, 0.10, u_theme) * vignette);

        color = mix(color, minorC, minorLine * gridAlpha);
        color = mix(color, majorC, majorLine * gridAlpha);
        color = mix(color, markC, mark * gridAlpha);

        // Data pulses along major lines (horizontal lanes run right, vertical lanes run down).
        float laneY = floor((p.y + 0.5 * MAJOR) / MAJOR);
        float laneX = floor((p.x + 0.5 * MAJOR) / MAJOR);
        float h = pulse(p.x, laneY, u_size.x, 0.0) * line(dMajor.y);
        float v = pulse(p.y, laneX, u_size.y, 11.0) * line(dMajor.x);
        float signal = clamp(h + v, 0.0, 1.0);
        color = mix(color, signalC, signal * mix(0.75, 0.9, u_theme));

        gl_FragColor = vec4(color, 1.0);
    }
`;

function GridPlane({ isDark, animate }: { isDark: boolean; animate: boolean }) {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const { size, viewport } = useThree();

    const uniforms = useMemo(
        () => ({
            u_time: { value: 0 },
            u_size: { value: new THREE.Vector2(1, 1) },
            u_dpr: { value: 1 },
            u_theme: { value: isDark ? 1 : 0 },
        }),
        // Created once; the theme is eased towards its target in useFrame.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    useEffect(() => {
        const material = materialRef.current;
        if (!material) return;
        material.uniforms.u_size.value.set(size.width, size.height);
        material.uniforms.u_dpr.value = viewport.dpr;
    }, [size, viewport.dpr]);

    const targetTheme = isDark ? 1 : 0;

    useFrame((state, delta) => {
        const material = materialRef.current;
        if (!material) return;
        if (animate) material.uniforms.u_time.value += Math.min(delta, 0.1);
        material.uniforms.u_theme.value = THREE.MathUtils.lerp(material.uniforms.u_theme.value, targetTheme, 0.12);
    });

    return (
        <mesh>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                depthWrite={false}
                depthTest={false}
            />
        </mesh>
    );
}

function useIsDark() {
    const [isDark, setIsDark] = useState(() =>
        typeof document === "undefined" ? true : document.documentElement.classList.contains("dark"),
    );
    useEffect(() => {
        const root = document.documentElement;
        const observer = new MutationObserver(() => setIsDark(root.classList.contains("dark")));
        observer.observe(root, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);
    return isDark;
}

function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(
        () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const onChange = () => setReduced(mq.matches);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);
    return reduced;
}

export function VeritasBackground() {
    const isDark = useIsDark();
    const reducedMotion = usePrefersReducedMotion();

    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-screen w-screen bg-background">
            <Canvas dpr={[1, 2]} gl={{ antialias: false, alpha: false }} camera={{ position: [0, 0, 1] }}>
                <GridPlane isDark={isDark} animate={!reducedMotion} />
            </Canvas>
        </div>
    );
}
