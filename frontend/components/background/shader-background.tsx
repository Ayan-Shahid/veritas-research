"use client";

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const ShaderBackground = ({ isDarkMode }: { isDarkMode: boolean }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const { size } = useThree();

    // Initialize uniforms only once
    const uniforms = useMemo(
        () => ({
            u_time: { value: 0 },
            u_resolution: { value: new THREE.Vector2(size.width, size.height) },
            u_theme: { value: isDarkMode ? 1.0 : 0.0 },
        }),
        []
    );

    // Handle window resizing
    useEffect(() => {
        if (meshRef.current) {
            const material = meshRef.current.material as THREE.ShaderMaterial;
            material.uniforms.u_resolution.value.set(size.width, size.height);
        }
    }, [size]);

    // By capturing isDarkMode directly in the render scope,
    // R3F automatically updates the useFrame callback. No refs needed!
    const targetTheme = isDarkMode ? 1.0 : 0.0;

    useFrame((state) => {
        if (meshRef.current) {
            const material = meshRef.current.material as THREE.ShaderMaterial;
            material.uniforms.u_time.value = state.clock.elapsedTime * 0.2;

            // Interpolate towards the target theme instantly
            material.uniforms.u_theme.value = THREE.MathUtils.lerp(
                material.uniforms.u_theme.value,
                targetTheme,
                0.05
            );
        }
    });

    return (
        <mesh ref={meshRef}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `}
                fragmentShader={`
          uniform float u_time;
          uniform vec2 u_resolution;
          uniform float u_theme; 
          
          varying vec2 vUv;

          vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

          float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ;
            m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
          }

          void main() {
            vec2 uv = gl_FragCoord.xy / u_resolution.xy;
            uv.x *= u_resolution.x / u_resolution.y;

            vec3 lightBg = vec3(1.0, 1.0, 1.0);              
            vec3 lightPrimary = vec3(0.44, 0.25, 0.88);      
            vec3 lightAccent = vec3(0.18, 0.85, 0.88);       
            vec3 lightGrid = vec3(0.95, 0.95, 0.96);         

            vec3 darkBg = vec3(0.11, 0.12, 0.14);            
            vec3 darkPrimary = vec3(0.35, 0.18, 0.78);       
            vec3 darkAccent = vec3(0.18, 0.85, 0.88);        
            vec3 darkGrid = vec3(0.16, 0.17, 0.19);          

            vec3 bg = mix(lightBg, darkBg, u_theme);
            vec3 primary = mix(lightPrimary, darkPrimary, u_theme);
            vec3 accent = mix(lightAccent, darkAccent, u_theme);
            vec3 gridColor = mix(lightGrid, darkGrid, u_theme);

            vec2 pos = uv * 2.0;
            float noise1 = snoise(pos + u_time * 0.3);
            float noise2 = snoise(pos * 2.0 - u_time * 0.4);
            
            float combinedNoise = (noise1 + noise2 * 0.5) * 0.5 + 0.5;
            float lines = fract(combinedNoise * 12.0);
            float edge = smoothstep(0.0, 0.1, lines) - smoothstep(0.1, 0.2, lines);

            float washPrimary = smoothstep(0.3, 0.8, noise1) * 0.15; 
            float washAccent = smoothstep(0.4, 0.9, noise2) * 0.12;

            vec3 finalColor = bg;
            finalColor = mix(finalColor, primary, washPrimary);
            finalColor = mix(finalColor, accent, washAccent);
            finalColor = mix(finalColor, gridColor, edge * 0.4); 

            gl_FragColor = vec4(finalColor, 1.0);
          }
        `}
                uniforms={uniforms}
                depthWrite={false}
                depthTest={false}
            />
        </mesh>
    );
};

export function VeritasBackground() {
    // Initialize state directly from the DOM to satisfy ESLint's no-sync-setState rule
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof document !== 'undefined') {
            return document.documentElement.classList.contains('dark');
        }
        return true; // Fallback default
    });

    useEffect(() => {
        // Subscribe to external DOM mutations from next-themes
        const observer = new MutationObserver(() => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => observer.disconnect();
    }, []);

    return (
        <div className="fixed inset-0 -z-10 h-screen w-screen">
            <Canvas camera={{ position: [0, 0, 1] }}>
                <ShaderBackground isDarkMode={isDarkMode} />
            </Canvas>
        </div>
    );
}