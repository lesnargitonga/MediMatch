import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* A 3D, rotatable, zoomable model of Nairobi County's facilities. Surplus hubs
 * and facilities in need rise as pillars; supply transfers arc between them.
 * Drag to orbit, scroll (or the buttons) to zoom, click a pillar to inspect it.
 * Hand-rolled orbit controls (no drei) keep the dependency surface small. */

type N = { id: number; org_name: string; county: string; lat: number; lon: number; role: 'hub' | 'need' | 'mixed'; surplusUnits: number; needUnits: number; urgent: boolean };
type R = { id: number; urgent: boolean; from: { id: number }; to: { id: number } };

const COL = { hub: '#37c07e', need: '#f25555', mixed: '#f5c451', urgent: '#e8703c' };

type Ctrl = { theta: number; phi: number; radius: number; down: boolean; lx: number; ly: number; auto: boolean };

function Controls({ ctrl }: { ctrl: React.MutableRefObject<Ctrl> }) {
  const { camera, gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const c = ctrl.current;
    const down = (e: PointerEvent) => { c.down = true; c.auto = false; c.lx = e.clientX; c.ly = e.clientY; };
    const up = () => { c.down = false; };
    const move = (e: PointerEvent) => {
      if (!c.down) return;
      c.theta -= (e.clientX - c.lx) * 0.006;
      c.phi = Math.max(0.18, Math.min(Math.PI / 2 - 0.04, c.phi - (e.clientY - c.ly) * 0.006));
      c.lx = e.clientX; c.ly = e.clientY;
    };
    const wheel = (e: WheelEvent) => { e.preventDefault(); c.radius = Math.max(6, Math.min(30, c.radius + e.deltaY * 0.012)); };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointermove', move);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointermove', move);
      el.removeEventListener('wheel', wheel);
    };
  }, [gl, ctrl]);
  useFrame(() => {
    const c = ctrl.current;
    if (c.auto && !c.down) c.theta += 0.0016;
    const r = c.radius;
    camera.position.set(r * Math.sin(c.phi) * Math.sin(c.theta), r * Math.cos(c.phi), r * Math.sin(c.phi) * Math.cos(c.theta));
    camera.lookAt(0, 0.6, 0);
  });
  return null;
}

function Pillar({ p, selected, onSelect }: { p: any; selected: boolean; onSelect: (n: N) => void }) {
  const [hover, setHover] = useState(false);
  const top = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (top.current) {
      const k = selected ? 1.25 : hover ? 1.12 : 1;
      top.current.scale.setScalar(k + (selected ? Math.sin(s.clock.elapsedTime * 4) * 0.06 : 0));
    }
  });
  return (
    <group position={[p.x, 0, p.z]}>
      {/* generous invisible hit target so facilities are easy to click */}
      <mesh position={[0, (p.h + 0.5) / 2, 0]} onClick={(e) => { e.stopPropagation(); onSelect(p.node); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}>
        <cylinderGeometry args={[0.5, 0.5, p.h + 0.5, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, p.h / 2, 0]}>
        <cylinderGeometry args={[0.11, 0.14, p.h, 14]} />
        <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={selected ? 0.95 : hover ? 0.55 : 0.22} roughness={0.4} />
      </mesh>
      <mesh ref={top} position={[0, p.h + 0.16, 0]}>
        <sphereGeometry args={[0.18, 18, 18]} />
        <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.9} />
      </mesh>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.4, 0.5, 28]} />
          <meshBasicMaterial color={p.color} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function Flow({ a, b, color }: { a: any; b: any; color: string }) {
  const obj = useMemo(() => {
    const va = new THREE.Vector3(a.x, a.h + 0.16, a.z);
    const vb = new THREE.Vector3(b.x, b.h + 0.16, b.z);
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    mid.y += va.distanceTo(vb) * 0.35 + 0.8;
    const curve = new THREE.QuadraticBezierCurve3(va, mid, vb);
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(34));
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 });
    return { line: new THREE.Line(geo, mat), curve };
  }, [a, b, color]);
  const spark = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (spark.current) {
      const t = (s.clock.elapsedTime * 0.32) % 1;
      spark.current.position.copy(obj.curve.getPoint(t));
    }
  });
  return (
    <group>
      <primitive object={obj.line} />
      <mesh ref={spark}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
    </group>
  );
}

function Scene({ nodes, routes, selectedId, onSelect }: { nodes: N[]; routes: R[]; selectedId: number | null; onSelect: (n: N) => void }) {
  const pillars = useMemo(() => {
    const lons = nodes.map((n) => n.lon), lats = nodes.map((n) => n.lat);
    const cLon = (Math.min(...lons) + Math.max(...lons)) / 2;
    const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const span = Math.max(Math.max(...lons) - Math.min(...lons), Math.max(...lats) - Math.min(...lats)) || 0.1;
    const S = 9 / span;
    const maxU = Math.max(1, ...nodes.map((n) => Math.max(n.surplusUnits, n.needUnits)));
    const map = new Map<number, any>();
    const list = nodes.map((n) => {
      const units = Math.max(n.surplusUnits, n.needUnits);
      const color = n.role === 'hub' ? COL.hub : n.role === 'mixed' ? COL.mixed : n.urgent ? COL.urgent : COL.need;
      const p = { node: n, x: (n.lon - cLon) * S, z: -(n.lat - cLat) * S, h: 0.5 + (units / maxU) * 3.6, color };
      map.set(n.id, p);
      return p;
    });
    return { list, map };
  }, [nodes]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[6, 10, 4]} intensity={1.1} color="#ffe6b0" />
      <directionalLight position={[-6, 4, -4]} intensity={0.35} color="#37c07e" />
      {/* ground + grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[26, 26]} />
        <meshStandardMaterial color="#0d1830" roughness={1} />
      </mesh>
      <gridHelper args={[26, 26, '#21426b', '#15273f']} position={[0, 0.01, 0]} />
      {routes.map((r) => {
        const a = pillars.map.get(r.from.id), b = pillars.map.get(r.to.id);
        if (!a || !b) return null;
        return <Flow key={r.id} a={a} b={b} color={r.urgent ? COL.urgent : COL.hub} />;
      })}
      {pillars.list.map((p) => (
        <Pillar key={p.node.id} p={p} selected={p.node.id === selectedId} onSelect={onSelect} />
      ))}
    </>
  );
}

export default function Nairobi3D({ nodes, routes, selectedId, onSelect }: { nodes: N[]; routes: R[]; selectedId: number | null; onSelect: (n: N) => void }) {
  const ctrl = useRef<Ctrl>({ theta: Math.PI * 0.2, phi: Math.PI * 0.34, radius: 15, down: false, lx: 0, ly: 0, auto: true });
  const reset = () => { const c = ctrl.current; c.theta = Math.PI * 0.2; c.phi = Math.PI * 0.34; c.radius = 15; c.auto = true; };
  return (
    <div className="sv-n3d">
      <Canvas camera={{ position: [6, 8, 9], fov: 46 }} dpr={[1, 1.8]} gl={{ antialias: true, powerPreference: 'low-power' }}>
        <color attach="background" args={['#0a1426']} />
        <Scene nodes={nodes} routes={routes} selectedId={selectedId} onSelect={onSelect} />
        <Controls ctrl={ctrl} />
      </Canvas>
      <div className="sv-n3d-zoom">
        <button onClick={() => { ctrl.current.radius = Math.max(6, ctrl.current.radius - 3); ctrl.current.auto = false; }} aria-label="Zoom in">+</button>
        <button onClick={() => { ctrl.current.radius = Math.min(30, ctrl.current.radius + 3); ctrl.current.auto = false; }} aria-label="Zoom out">−</button>
        <button onClick={reset} aria-label="Reset view">⟳</button>
      </div>
      <div className="sv-n3d-hint">Drag to rotate · scroll to zoom · click a facility</div>
    </div>
  );
}
