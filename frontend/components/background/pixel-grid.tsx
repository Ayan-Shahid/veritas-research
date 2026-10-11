"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/*
 * Pixel-grid card background.
 *
 * A dot-matrix of small square "pixels" that drift through a few brightness levels, densest in the
 * card's top-right corner and fading out within a couple of hundred pixels, with the odd cobalt pixel
 * blinking on. Every card shares ONE offscreen WebGL context (browsers cap live contexts at ~16):
 * each frame the shader is drawn once per visible card and copied into that card's own 2D canvas.
 * Runs at ~12 fps (the motion is stepped anyway), pauses for off-screen cards and hidden tabs, and
 * renders a single still frame under prefers-reduced-motion.
 */

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;

uniform vec2 u_size;    // card size in CSS px
uniform float u_dpr;
uniform float u_time;
uniform float u_seed;
uniform float u_theme;  // 0 = light, 1 = dark

const float CELL = 6.0;   // pitch, CSS px
const float DOT = 4.0;    // pixel size, CSS px (2px gutter)

float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
               mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
    // CSS px, origin top-left.
    vec2 p = vec2(gl_FragCoord.x, u_size.y * u_dpr - gl_FragCoord.y) / u_dpr;
    vec2 cell = floor(p / CELL);
    vec2 inCell = p - cell * CELL;
    float inside = step(inCell.x, DOT) * step(inCell.y, DOT);

    // Corner mask in absolute px: strongest at the top-right corner, gone within ~120-260px,
    // so wide cards don't get the pattern running under their text.
    float radius = clamp(min(u_size.x, u_size.y) * 0.9, 120.0, 260.0);
    float d = length(p - vec2(u_size.x, 0.0)) / radius;
    float mask = 1.0 - smoothstep(0.1, 1.0, d);

    // Drifting field quantised to 4 levels, so pixels step between brightnesses rather than fade.
    float t = u_time * 0.12;
    float n = noise(cell * 0.16 + vec2(u_seed * 13.1, u_seed * 7.7) + vec2(t, -t * 0.6));
    n = 0.65 * n + 0.35 * noise(cell * 0.42 - vec2(t * 1.7, u_seed));
    float level = floor(clamp(n * mask * 1.6, 0.0, 0.999) * 4.0) / 3.0;

    // Sparse cobalt pixels blinking on for a moment.
    float epoch = floor(u_time * 1.4 + hash21(cell + u_seed) * 6.0);
    float blink = step(0.985, hash21(cell * 1.37 + epoch * 3.1 + u_seed)) * step(0.25, mask);

    vec3 ink = mix(vec3(0.12, 0.12, 0.14), vec3(0.95, 0.94, 0.92), u_theme);
    vec3 cobalt = mix(vec3(0.11, 0.31, 0.85), vec3(0.32, 0.55, 1.0), u_theme);
    float inkA = level * mix(0.12, 0.1, u_theme);
    float cobA = blink * mix(0.55, 0.7, u_theme);

    // Premultiplied alpha output.
    float a = inside * max(inkA, cobA);
    vec3 c = cobA > inkA ? cobalt : ink;
    gl_FragColor = vec4(c * a, a);
}
`;

type Target = {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    seed: number;
    visible: boolean;
    w: number;
    h: number;
    dirty: boolean;
};

type Renderer = {
    gl: WebGLRenderingContext;
    glCanvas: HTMLCanvasElement;
    loc: {
        size: WebGLUniformLocation | null;
        dpr: WebGLUniformLocation | null;
        time: WebGLUniformLocation | null;
        seed: WebGLUniformLocation | null;
        theme: WebGLUniformLocation | null;
    };
};

const FRAME_MS = 1000 / 12;
const targets = new Set<Target>();
let renderer: Renderer | null | undefined; // undefined = not tried yet, null = unavailable
let raf = 0;
let last = 0;
const start = typeof performance !== "undefined" ? performance.now() : 0;

function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function createRenderer(): Renderer | null {
    const glCanvas = document.createElement("canvas");
    const gl = glCanvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
    if (!gl) return null;

    const compile = (type: number, src: string) => {
        const sh = gl.createShader(type)!;
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.error("pixel-grid shader:", gl.getShaderInfoLog(sh));
            return null;
        }
        return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.clearColor(0, 0, 0, 0);

    return {
        gl,
        glCanvas,
        loc: {
            size: gl.getUniformLocation(prog, "u_size"),
            dpr: gl.getUniformLocation(prog, "u_dpr"),
            time: gl.getUniformLocation(prog, "u_time"),
            seed: gl.getUniformLocation(prog, "u_seed"),
            theme: gl.getUniformLocation(prog, "u_theme"),
        },
    };
}

function draw(now: number, force: boolean) {
    if (!renderer) return;
    const { gl, glCanvas, loc } = renderer;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const theme = document.documentElement.classList.contains("dark") ? 1 : 0;
    const time = reducedMotion() ? 0 : (now - start) / 1000;

    for (const t of targets) {
        if (!t.visible || t.w === 0 || t.h === 0 || (!force && !t.dirty && reducedMotion())) continue;
        const pw = Math.round(t.w * dpr);
        const ph = Math.round(t.h * dpr);
        if (glCanvas.width < pw) glCanvas.width = pw;
        if (glCanvas.height < ph) glCanvas.height = ph;
        if (t.canvas.width !== pw || t.canvas.height !== ph) {
            t.canvas.width = pw;
            t.canvas.height = ph;
        }
        gl.viewport(0, 0, pw, ph);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(loc.size, t.w, t.h);
        gl.uniform1f(loc.dpr, dpr);
        gl.uniform1f(loc.time, time);
        gl.uniform1f(loc.seed, t.seed);
        gl.uniform1f(loc.theme, theme);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        // The viewport sits at the bottom-left of the (possibly larger) GL canvas.
        t.ctx.clearRect(0, 0, pw, ph);
        t.ctx.drawImage(glCanvas, 0, glCanvas.height - ph, pw, ph, 0, 0, pw, ph);
        t.dirty = false;
    }
}

function loop(now: number) {
    raf = requestAnimationFrame(loop);
    if (document.hidden || now - last < FRAME_MS) return;
    last = now;
    draw(now, false);
}

function ensureLoop() {
    if (raf || targets.size === 0) return;
    raf = requestAnimationFrame(loop);
}

function stopLoopIfIdle() {
    if (targets.size === 0 && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
    }
}

// Re-draw still frames when the theme flips (matters under reduced motion, where the loop skips).
if (typeof window !== "undefined") {
    new MutationObserver(() => {
        for (const t of targets) t.dirty = true;
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
}

/**
 * Drop inside any `.surface` (it is `position: relative; isolation: isolate`): the canvas sits behind
 * the card's content and above its fill.
 */
export function PixelGrid({ className }: { className?: string }) {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        if (renderer === undefined) renderer = createRenderer();
        if (!renderer) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const target: Target = { canvas, ctx, seed: Math.random() * 100, visible: false, w: 0, h: 0, dirty: true };
        targets.add(target);

        const ro = new ResizeObserver(([entry]) => {
            target.w = entry.contentRect.width;
            target.h = entry.contentRect.height;
            target.dirty = true;
        });
        ro.observe(canvas);
        const io = new IntersectionObserver(([entry]) => {
            target.visible = entry.isIntersecting;
            target.dirty = true;
        });
        io.observe(canvas);
        ensureLoop();

        return () => {
            ro.disconnect();
            io.disconnect();
            targets.delete(target);
            stopLoopIfIdle();
        };
    }, []);

    return <canvas ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 size-full", className)} />;
}
