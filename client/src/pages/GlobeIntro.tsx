import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* A short, self-contained cinematic: a stylised wireframe Earth in the warm
 * Savannah palette spins East Africa to face the camera and dives toward Kenya,
 * then the parent unmounts it (freeing the GPU) and hands off to the 2D map. */

const R = 1.5;
const GOLD = '#f0b32e';
const TERRA = '#e8703c';

function latlon(lat: number, lon: number, r = R): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function Stars() {
  const geo = useMemo(() => {
    const n = 1100;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 14 + Math.random() * 26;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(p) * Math.cos(t);
      pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      pos[i * 3 + 2] = r * Math.cos(p);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.07} sizeAttenuation color="#d6def0" transparent opacity={0.85} />
    </points>
  );
}

function Arc({ a, b, lift = 0.45, color = GOLD }: { a: [number, number]; b: [number, number]; lift?: number; color?: string }) {
  const obj = useMemo(() => {
    const va = latlon(a[0], a[1]);
    const vb = latlon(b[0], b[1]);
    const mid = va.clone().add(vb).multiplyScalar(0.5).setLength(R * (1 + lift));
    const curve = new THREE.QuadraticBezierCurve3(va, mid, vb);
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
    return new THREE.Line(geo, mat);
  }, [a, b, lift, color]);
  return <primitive object={obj} />;
}

function GlobeRig() {
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const start = useRef<number | null>(null);

  // Rotation that brings Kenya (~1N, 38E) to face +Z (the camera).
  const targetY = 2.18;
  const targetX = -0.12;

  useFrame((state) => {
    if (start.current === null) start.current = state.clock.elapsedTime;
    const el = state.clock.elapsedTime - start.current;
    const t = Math.min(1, Math.max(0, (el - 0.15) / 3.0));
    const e = easeInOut(t);
    if (group.current) {
      group.current.rotation.y = (targetY - 2.4) + 2.4 * e + el * 0.02;
      group.current.rotation.x = targetX * e;
    }
    camera.position.z = 4.4 - 2.15 * e;
    camera.position.y = 0.25 * e;
    camera.lookAt(0, 0, 0);
  });

  const kenya = latlon(0.6, 38);

  return (
    <group ref={group}>
      {/* atmosphere halo */}
      <mesh scale={1.18}>
        <sphereGeometry args={[R, 32, 32]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.07} side={THREE.BackSide} />
      </mesh>
      <mesh scale={1.06}>
        <sphereGeometry args={[R, 32, 32]} />
        <meshBasicMaterial color={TERRA} transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>
      {/* solid body */}
      <mesh>
        <sphereGeometry args={[R, 64, 48]} />
        <meshStandardMaterial color="#16223c" emissive="#0c1426" emissiveIntensity={0.6} roughness={1} metalness={0} />
      </mesh>
      {/* graticule */}
      <mesh>
        <sphereGeometry args={[R * 1.001, 36, 24]} />
        <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.13} />
      </mesh>
      {/* supply-route arcs teasing the theme */}
      <Arc a={[0.6, 38]} b={[9.0, 38.7]} color={GOLD} />
      <Arc a={[0.6, 38]} b={[-1.95, 30.06]} color={TERRA} lift={0.35} />
      <Arc a={[0.6, 38]} b={[6.5, 3.4]} color={GOLD} lift={0.6} />
      {/* Kenya beacon */}
      <mesh position={kenya}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={kenya} scale={1}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color={TERRA} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

export default function GlobeIntro() {
  return (
    <div className="sv-globe">
      <Canvas camera={{ position: [0, 0, 4.4], fov: 42 }} dpr={[1, 1.6]} gl={{ antialias: true }}>
        <color attach="background" args={['#080d1a']} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} color="#ffe6b0" />
        <directionalLight position={[-5, -2, -3]} intensity={0.3} color="#e8703c" />
        <Stars />
        <GlobeRig />
      </Canvas>
    </div>
  );
}
