"use client";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, ContactShadows } from "@react-three/drei";
import { Avatar } from "./Avatar";

/** Escena 3D: luz de estudio suave (clave cálida, relleno, contraluz) y sombra de contacto. */
export default function Escena() {
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 2]}
      shadows
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 28, near: 0.1, far: 50, position: [0, 1.35, 2.6] }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <hemisphereLight args={["#fff6ea", "#c9b293", 1.1]} />
      <directionalLight
        position={[1.6, 2.6, 2.4]}
        intensity={2.2}
        color="#fff1de"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-2, 1.6, 1.5]} intensity={0.8} color="#ffe9d2" />
      <directionalLight position={[0, 2.2, -2.5]} intensity={1.6} color="#ffd9b0" />
      <Suspense fallback={null}>
        <Avatar />
      </Suspense>
      <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={4} blur={2.6} far={2} />
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
