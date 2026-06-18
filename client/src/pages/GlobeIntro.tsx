import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import LAND from '../data/land110m';
import KENYA from '../data/kenya';

/* A short, self-contained cinematic: a stylised Earth in the warm Savannah
 * palette — glowing continents over a deep ocean — spins East Africa to face
 * the camera and dives toward Kenya, then the parent unmounts it (freeing the
 * GPU) and hands off to the 2D map. */

const R = 1.5;
const GOLD = '#f5c451';
const TERRA = '#e8703c';
const CREAM = '#f4ead2';

function latlon(lat: number, lon: number, r = R): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

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

/* Continent coastlines drawn as glowing line segments on the sphere. */
function Continents({ r = R * 1.003, color = GOLD, opacity = 0.9 }: { r?: number; color?: string; opacity?: number }) {
  const obj = useMemo(() => {
    const pts: number[] = [];
    for (const ring of LAND) {
      for (let i = 0; i < ring.length - 1; i++) {
        const a = latlon(ring[i][1], ring[i][0], r);
        const b = latlon(ring[i + 1][1], ring[i + 1][0], r);
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    return new THREE.LineSegments(geo, mat);
  }, [r, color, opacity]);
  return <primitive object={obj} />;
}

// Cinematic beats, in seconds from first frame. Total ~6.4s on screen.
const SPIN_START = 0.55;
const SPIN_END = 3.5;    // hand has flicked it; globe decelerates onto Kenya here
const HILITE = 3.5;      // Kenya highlight fades in as it settles
const PRESS_START = 4.7; // finger taps Kenya — highlight flares
const PRESS_END = 6.2;   // globe eases back; the 2D Kenya map zooms out to take over

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// Build a filled, sphere-wrapped mesh + outline for Kenya from its lon/lat ring.
function kenyaGeometry() {
  const shape = new THREE.Shape();
  KENYA.forEach(([lon, lat], i) => (i ? shape.lineTo(lon, lat) : shape.moveTo(lon, lat)));
  const fill = new THREE.ShapeGeometry(shape);
  const pos = fill.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const v = latlon(pos.getY(i), pos.getX(i), R * 1.004);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  const linePts = KENYA.map(([lon, lat]) => latlon(lat, lon, R * 1.007));
  linePts.push(linePts[0]);
  const line = new THREE.BufferGeometry().setFromPoints(linePts);
  return { fill, line };
}

function GlobeRig() {
  const group = useRef<THREE.Group>(null);
  const fillRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<THREE.Line>(null);
  const { camera } = useThree();
  const start = useRef<number | null>(null);
  const { fill, line } = useMemo(kenyaGeometry, []);
  const lineObj = useMemo(() => new THREE.Line(line, new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0 })), [line]);

  // Final resting rotation: Kenya (~0.6N, 38E) faces the camera, framed in the
  // right third beside the headline. The flick spins it two full turns to here.
  const targetY = -2.1;
  const targetX = -0.12;
  const TURNS = 2;

  useFrame((state) => {
    if (start.current === null) start.current = state.clock.elapsedTime;
    const el = state.clock.elapsedTime - start.current;

    // --- rotation: a flick that decelerates onto Kenya ---
    const spin = easeOut(clamp01((el - SPIN_START) / (SPIN_END - SPIN_START)));
    if (group.current) {
      // start two turns back from target, ease (front-loaded) to target
      group.current.rotation.y = targetY - TURNS * Math.PI * 2 * (1 - spin);
      group.current.rotation.x = targetX * spin;
    }

    // --- camera: dive during the spin, then a gentle push on the press so
    // Kenya stays large and centred — matching the 2D map it hands off to. ---
    const dive = easeOut(clamp01((el - SPIN_START) / (SPIN_END - SPIN_START)));
    const press = easeOut(clamp01((el - PRESS_START) / (PRESS_END - PRESS_START)));
    camera.position.z = 4.6 - 1.65 * dive - 0.35 * press;
    camera.position.y = 0.18 * dive;
    camera.lookAt(0, 0, 0);

    // --- Kenya highlight: fades in as it settles, flares on the press ---
    const appear = clamp01((el - HILITE) / 0.7);
    const flare = clamp01((el - PRESS_START) / 0.35);
    const pulse = el >= PRESS_START ? 0.12 * Math.sin((el - PRESS_START) * 9) : 0;
    if (fillRef.current) {
      (fillRef.current.material as THREE.Material).opacity = appear * (0.22 + 0.28 * flare) + pulse * flare;
    }
    if (lineRef.current) {
      (lineRef.current.material as THREE.Material).opacity = appear * (0.7 + 0.3 * flare);
    }
  });

  return (
    <group ref={group}>
      {/* atmosphere halo */}
      <mesh scale={1.2}>
        <sphereGeometry args={[R, 32, 32]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.14} side={THREE.BackSide} />
      </mesh>
      <mesh scale={1.07}>
        <sphereGeometry args={[R, 32, 32]} />
        <meshBasicMaterial color={TERRA} transparent opacity={0.1} side={THREE.BackSide} />
      </mesh>
      {/* ocean body */}
      <mesh>
        <sphereGeometry args={[R, 64, 48]} />
        <meshStandardMaterial color="#16314f" emissive="#0d2138" emissiveIntensity={0.95} roughness={0.85} metalness={0.1} />
      </mesh>
      {/* glowing continents (no graticule — clean) */}
      <Continents color={CREAM} opacity={0.95} />
      <Continents r={R * 1.012} color={GOLD} opacity={0.3} />{/* soft bloom halo */}
      {/* Kenya highlighted on the African map: gold fill + glowing border */}
      <mesh ref={fillRef} geometry={fill}>
        <meshBasicMaterial color={GOLD} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <primitive ref={lineRef} object={lineObj} />
    </group>
  );
}

export default function GlobeIntro() {
  return (
    <div className="sv-globe">
      <Canvas
        camera={{ position: [0, 0, 4.4], fov: 42 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: false }}
      >
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
