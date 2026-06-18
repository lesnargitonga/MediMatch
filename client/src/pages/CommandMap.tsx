import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polygon, Polyline, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import API from '../services/api';

type Node = {
  id: number; org_name: string; county: string; lat: number; lon: number;
  role: 'hub' | 'need' | 'mixed'; surplusUnits: number; needUnits: number; urgent: boolean;
  offers: any[]; requests: any[];
};
type Route = {
  id: number; item: string; category: string; qty: number; urgent: boolean; routed: boolean;
  distance_km: number; eta_min: number | null;
  from: { id: number; org: string; county: string; lat: number; lon: number; title: string };
  to: { id: number; org: string; county: string; lat: number; lon: number; title: string };
  geometry: [number, number][];
};
type Impact = {
  routes: number; facilities_served: number; hubs_engaged: number;
  units_moved: number; total_km: number; urgent_closed: number; roads_used: boolean;
  demand_units: number; coverage_pct: number; facilities_in_need: number;
  facilities_unmet: number; urgent_total: number;
};
type Plan = {
  scenario: {
    geography: string;
    facility_data: string;
    inventory_data: string;
    advisory: string;
  };
  nodes: Node[];
  routes: Route[];
  impact: Impact;
};
type StoryStage = 'detect' | 'rank' | 'route' | 'impact';

const KENYA_BOUNDS: [[number, number], [number, number]] = [[-4.72, 33.82], [5.55, 41.92]];
const KENYA_OUTLINE: [number, number][] = [
  [-4.67677, 39.20222], [-3.67712, 37.7669], [-3.09699, 37.69869],
  [-1.05982, 34.07262], [-0.95, 33.903711], [0.109814, 33.893569],
  [0.515, 34.18], [1.17694, 34.6721], [1.90584, 35.03599],
  [3.05374, 34.59607], [3.5556, 34.47913], [4.249885, 34.005],
  [4.847123, 34.620196], [5.506, 35.298007], [5.338232, 35.817448],
  [4.776966, 35.817448], [4.447864, 36.159079], [4.447864, 36.855093],
  [3.598605, 38.120915], [3.58851, 38.43697], [3.61607, 38.67114],
  [3.50074, 38.89251], [3.42206, 39.559384], [3.83879, 39.85494],
  [4.25702, 40.76848], [3.91909, 41.1718], [3.918912, 41.855083],
  [2.78452, 40.98105], [-0.85829, 40.993], [-1.68325, 41.58513],
  [-2.08255, 40.88477], [-2.49979, 40.63785], [-2.57309, 40.26304],
  [-3.27768, 40.12119], [-3.68116, 39.80006], [-4.34653, 39.60489],
  [-4.67677, 39.20222],
];
const COLORS = { hub: '#22d39a', need: '#ff5d6c', mixed: '#ffb648', route: '#56e0c8', routeUrgent: '#ff7a8a' };

function FitKenya() {
  const map = useMap();
  useEffect(() => { map.fitBounds(KENYA_BOUNDS, { padding: [30, 30] }); }, [map]);
  return null;
}

function ZoomWatch({ set }: { set: (z: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const h = () => set(map.getZoom());
    h();
    map.on('zoomend', h);
    return () => { map.off('zoomend', h); };
  }, [map, set]);
  return null;
}

function MapDirector({ stage, route }: { stage: StoryStage; route?: Route }) {
  const map = useMap();

  useEffect(() => {
    if (!route) return;
    const mobile = window.innerWidth <= 760;

    if (stage === 'detect') {
      map.flyTo([route.to.lat, route.to.lon], mobile ? 5.8 : 7.1, { duration: 1.3 });
      return;
    }

    if (stage === 'route') {
      map.flyToBounds(
        [[Math.min(route.from.lat, route.to.lat), Math.min(route.from.lon, route.to.lon)],
         [Math.max(route.from.lat, route.to.lat), Math.max(route.from.lon, route.to.lon)]],
        {
          paddingTopLeft: mobile ? [28, 210] : [390, 110],
          paddingBottomRight: mobile ? [28, 270] : [365, 110],
          maxZoom: mobile ? 5.8 : 6.7,
          duration: 1.4,
        }
      );
      return;
    }

    map.flyToBounds(KENYA_BOUNDS, {
      paddingTopLeft: mobile ? [18, 180] : [350, 50],
      paddingBottomRight: mobile ? [18, 260] : [330, 50],
      maxZoom: mobile ? 5.2 : 6,
      duration: 1.35,
    });
  }, [map, route, stage]);

  return null;
}

function useCountUp(target: number, on: boolean, ms = 900) {
  const [v, setV] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    if (!on) { setV(0); ref.current = 0; return; }
    const from = ref.current; const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      const val = Math.round(from + (target - from) * e);
      setV(val); ref.current = val;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, on, ms]);
  return v;
}

export default function CommandMap() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [autoDemo, setAutoDemo] = useState(true);
  const [storyStage, setStoryStage] = useState<StoryStage>('detect');
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [showPrelude, setShowPrelude] = useState(true);
  const [zoom, setZoom] = useState(6);

  // per-route animation progress (0..1) and which routes are delivered
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [delivered, setDelivered] = useState<number[]>([]);
  const [activeIds, setActiveIds] = useState<number[]>([]);
  // transient arrival flourishes at delivery points
  const [bursts, setBursts] = useState<{ key: string; lat: number; lon: number; urgent: boolean; start: number }[]>([]);
  // monotonic frame clock — drives radius-based map flourishes (kept in map
  // coordinates so they scale with zoom instead of ghosting like CSS transforms)
  const [clock, setClock] = useState(0);

  const inflight = useRef<Map<number, { coords: [number, number][]; start: number; dur: number; onDone: () => void }>>(new Map());
  const rafRef = useRef<number>(0);
  const launchTimers = useRef<number[]>([]);
  const storyTimers = useRef<number[]>([]);
  const burstTimers = useRef<number[]>([]);
  const started = useRef(false);

  function spawnBurst(lat: number, lon: number, urgent: boolean) {
    const now = performance.now();
    const key = `${lat},${lon},${now}`;
    setBursts((b) => [...b, { key, lat, lon, urgent, start: now }]);
    const t = window.setTimeout(() => {
      setBursts((b) => b.filter((x) => x.key !== key));
    }, 1300);
    burstTimers.current.push(t);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await API.get('/redistribution/plan?roads=0');
        if (!cancelled) setPlan(data);
      } catch (e: any) {
        if (!cancelled) setError('Could not load redistribution plan.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // single rAF loop driving all in-flight travelers
  function ensureLoop() {
    if (rafRef.current) return;
    const loop = (t: number) => {
      const m = inflight.current;
      if (m.size === 0) { rafRef.current = 0; return; }
      const next: Record<number, number> = {};
      const finished: number[] = [];
      m.forEach((v, id) => {
        const p = Math.min(1, (t - v.start) / v.dur);
        next[id] = p;
        if (p >= 1) finished.push(id);
      });
      setProgress((prev) => ({ ...prev, ...next }));
      finished.forEach((id) => { const v = m.get(id); m.delete(id); v?.onDone(); });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }

  function reset() {
    inflight.current.clear();
    launchTimers.current.forEach((timer) => window.clearTimeout(timer));
    launchTimers.current = [];
    storyTimers.current.forEach((timer) => window.clearTimeout(timer));
    storyTimers.current = [];
    burstTimers.current.forEach((timer) => window.clearTimeout(timer));
    burstTimers.current = [];
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    setProgress({}); setDelivered([]); setActiveIds([]); setBursts([]); setPhase('idle'); setStoryStage('detect');
  }

  function run(routeIdOverride?: number) {
    if (!plan || phase === 'running') return;
    reset();
    setPhase('running');
    setStoryStage('detect');
    const preferredId = routeIdOverride ?? selectedRouteId ?? plan.routes[0]?.id;
    const routes = [...plan.routes].sort((a, b) => {
      if (a.id === preferredId) return -1;
      if (b.id === preferredId) return 1;
      return Number(b.urgent) - Number(a.urgent);
    });
    let completed = 0;
    storyTimers.current.push(window.setTimeout(() => setStoryStage('rank'), 850));
    storyTimers.current.push(window.setTimeout(() => setStoryStage('route'), 1850));
    routes.forEach((r, index) => {
      const timer = window.setTimeout(() => {
        const dur = Math.max(1350, Math.min(2800, 1300 + r.distance_km * 1.6));
        setActiveIds((active) => [...active, r.id]);
        inflight.current.set(r.id, {
          coords: r.geometry,
          start: performance.now(),
          dur,
          onDone: () => {
            completed += 1;
            setDelivered((current) => current.includes(r.id) ? current : [...current, r.id]);
            setProgress((current) => ({ ...current, [r.id]: 1 }));
            spawnBurst(r.to.lat, r.to.lon, r.urgent);
            if (completed === routes.length) {
              setStoryStage('impact');
              setPhase('done');
            }
          },
        });
        ensureLoop();
      }, 2150 + index * 320);
      launchTimers.current.push(timer);
    });
  }

  function toggleAuto() {
    setAutoDemo((current) => {
      const next = !current;
      if (next && phase !== 'running') window.setTimeout(run, 0);
      return next;
    });
  }

  useEffect(() => {
    if (phase === 'done' && autoDemo) {
      const t = setTimeout(() => { reset(); setTimeout(run, 400); }, 4500);
      return () => clearTimeout(t);
    }
  }, [phase, autoDemo]);

  useEffect(() => {
    if (!plan || started.current) return;
    started.current = true;
    setSelectedRouteId(plan.routes[0]?.id ?? null);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setShowPrelude(false);
      setAutoDemo(false);
      return;
    }
    const preludeTimer = window.setTimeout(() => setShowPrelude(false), 5700);
    const runTimer = window.setTimeout(() => run(plan.routes[0]?.id), 6100);
    return () => {
      window.clearTimeout(preludeTimer);
      window.clearTimeout(runTimer);
    };
  }, [plan]);

  useEffect(() => () => {
    launchTimers.current.forEach((timer) => window.clearTimeout(timer));
    storyTimers.current.forEach((timer) => window.clearTimeout(timer));
    burstTimers.current.forEach((timer) => window.clearTimeout(timer));
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  // Frame clock — runs only while something on the map is animating.
  const needsClock = bursts.length > 0 || storyStage === 'detect' || phase === 'running';
  useEffect(() => {
    if (!needsClock) return;
    let raf = 0;
    const tick = () => { setClock(performance.now()); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [needsClock]);

  // live accumulators based on delivered routes
  const live = useMemo(() => {
    const dset = new Set(delivered);
    const rs = (plan?.routes || []).filter((r) => dset.has(r.id));
    return {
      facilities: new Set(rs.map((r) => r.to.id)).size,
      units: rs.reduce((s, r) => s + r.qty, 0),
      km: rs.reduce((s, r) => s + r.distance_km, 0),
      urgent: rs.filter((r) => r.urgent).length,
    };
  }, [delivered, plan]);

  const on = phase !== 'idle';
  const cFac = useCountUp(live.facilities, on);
  const cUnits = useCountUp(live.units, on);
  const cKm = useCountUp(live.km, on);
  const cUrg = useCountUp(live.urgent, on);

  const deliveredFeed = useMemo(() => {
    const map = new Map((plan?.routes || []).map((r) => [r.id, r]));
    return [...delivered].reverse().map((id) => map.get(id)!).filter(Boolean);
  }, [delivered, plan]);

  const leadRoute = plan?.routes.find((route) => route.id === selectedRouteId) || plan?.routes[0];
  const scenarioRoutes = useMemo(
    () => (plan?.routes || []).filter((route) => route.urgent).slice(0, 4),
    [plan]
  );

  function selectScenario(route: Route) {
    setAutoDemo(false);
    setSelectedRouteId(route.id);
    setShowPrelude(false);
    reset();
    window.setTimeout(() => run(route.id), 220);
  }

  // Click any facility on the map to trace the transfer that involves it.
  function selectNode(nodeId: number) {
    if (!plan) return;
    const route =
      plan.routes.find((r) => r.to.id === nodeId) ||
      plan.routes.find((r) => r.from.id === nodeId);
    if (route) selectScenario(route);
  }

  const story = useMemo(() => {
    if (!leadRoute || !plan) return null;
    if (storyStage === 'detect') {
      return {
        step: '01',
        eyebrow: 'Urgent signal detected',
        title: `${leadRoute.to.county} supply gap`,
        body: `${leadRoute.to.org} reports an urgent need for ${leadRoute.qty} units of ${leadRoute.item.toLowerCase()}.`,
      };
    }
    if (storyStage === 'rank') {
      return {
        step: '02',
        eyebrow: 'Geospatial ranking',
        title: `Evaluating ${plan.impact.hubs_engaged} supply hubs`,
        body: `MediMatch compares category fit, available quantity, urgency, verification, and transfer distance.`,
      };
    }
    if (storyStage === 'route') {
      return {
        step: '03',
        eyebrow: 'Source selected',
        title: `${leadRoute.from.county} to ${leadRoute.to.county}`,
        body: `${leadRoute.from.org} is ranked to release ${leadRoute.qty} units across a ${leadRoute.distance_km} km coordination route.`,
      };
    }
    return {
      step: '04',
      eyebrow: 'Equitable access restored',
      title: `${live.facilities} underserved facilities reached`,
      body: `${live.units.toLocaleString()} units routed across ${live.km.toLocaleString()} km — moving surplus to where shortfalls are most acute. Every transfer remains subject to coordinator verification.`,
    };
  }, [leadRoute, live.facilities, live.km, live.units, plan, storyStage]);

  function travelerPos(r: Route): [number, number] | null {
    const p = progress[r.id];
    if (p == null) return null;
    const g = r.geometry;
    const idx = Math.min(g.length - 1, Math.floor(p * (g.length - 1)));
    return g[idx];
  }
  function drawnLine(r: Route): [number, number][] {
    const p = progress[r.id] ?? 0;
    if (delivered.includes(r.id)) return r.geometry;
    const idx = Math.max(1, Math.min(r.geometry.length, Math.ceil(p * r.geometry.length)));
    return r.geometry.slice(0, idx);
  }

  return (
    <div className="command-map" style={S.wrap}>
      <MapContainer center={[0.2, 37.9]} zoom={6} zoomControl={false} preferCanvas={true} style={{ height: '100%', width: '100%' }} attributionControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="Map tiles by CARTO"
        />
        <FitKenya />
        <ZoomWatch set={setZoom} />
        <MapDirector stage={storyStage} route={leadRoute} />
        <Polygon
          positions={KENYA_OUTLINE}
          pathOptions={{
            color: '#4f8795',
            weight: 1.25,
            opacity: 0.78,
            fillColor: '#0b2530',
            fillOpacity: 0.12,
            dashArray: '4 5',
          }}
        />

        {/* Animated supply routes */}
        {plan?.routes.filter((r) => activeIds.includes(r.id)).map((r) => {
          const col = r.urgent ? COLORS.routeUrgent : COLORS.route;
          const tp = travelerPos(r);
          const done = delivered.includes(r.id);
          const selected = r.id === leadRoute?.id;
          return (
            <React.Fragment key={`route-${r.id}`}>
              <Polyline
                positions={drawnLine(r)}
                pathOptions={{
                  color: col,
                  weight: selected ? (done ? 2.4 : 3.2) : (done ? 1.15 : 1.7),
                  opacity: selected ? 0.96 : done ? 0.34 : 0.62,
                  className: selected ? 'mm-primary-route' : undefined,
                }}
              />
              {tp && !done && (() => {
                const pulse = 0.5 + 0.5 * Math.sin(clock / 170);
                const haloR = (selected ? 11 : 8) + pulse * (selected ? 4 : 3);
                return (
                  <>
                    <CircleMarker center={tp} radius={haloR} pathOptions={{ stroke: false, fillColor: col, fillOpacity: 0.10 + pulse * 0.14 }} />
                    <CircleMarker center={tp} radius={selected ? 4.5 : 3.6} pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: col, fillOpacity: 1, className: 'mm-traveler' }} />
                  </>
                );
              })()}
            </React.Fragment>
          );
        })}

        {/* Arrival flourishes — a ripple where supply lands (radius-driven so it
            scales with the map and never leaves ghosts during zoom) */}
        {bursts.map((b) => {
          const e = Math.min(1, Math.max(0, (clock - b.start) / 1250));
          const ringEase = 1 - Math.pow(1 - e, 2.4);
          const col = b.urgent ? COLORS.routeUrgent : COLORS.route;
          return (
            <React.Fragment key={b.key}>
              <CircleMarker center={[b.lat, b.lon]} radius={5 + ringEase * 30} pathOptions={{ color: col, weight: 2.5 * (1 - e) + 0.4, fill: false, opacity: (1 - e) * 0.95 }} />
              <CircleMarker center={[b.lat, b.lon]} radius={7 * (1 - e * 0.55)} pathOptions={{ stroke: false, fillColor: '#ffffff', fillOpacity: Math.max(0, 1 - e * 1.7) * 0.95 }} />
            </React.Fragment>
          );
        })}

        {leadRoute && (
          <>
            {storyStage === 'detect' && [0, 0.5].map((offset, i) => {
              const ph = (((clock / 2100) + offset) % 1 + 1) % 1;
              return (
                <CircleMarker
                  key={`sonar-${i}`}
                  center={[leadRoute.to.lat, leadRoute.to.lon]}
                  radius={6 + ph * 30}
                  pathOptions={{ color: COLORS.need, weight: 2, fill: false, opacity: (1 - ph) * 0.85 }}
                />
              );
            })}
            <CircleMarker
              center={[leadRoute.to.lat, leadRoute.to.lon]}
              radius={storyStage === 'detect' ? 12 : 10}
              pathOptions={{ color: COLORS.need, weight: 1.5, fillOpacity: 0, opacity: 0.9, dashArray: '3 4', className: 'mm-focus-ring' }}
            />
            {storyStage !== 'detect' && (
              <CircleMarker
                center={[leadRoute.from.lat, leadRoute.from.lon]}
                radius={10}
                pathOptions={{ color: COLORS.hub, weight: 1.5, fillOpacity: 0, opacity: 0.9, dashArray: '3 4', className: 'mm-focus-ring' }}
              />
            )}
          </>
        )}

        {/* Facility nodes — radius scales with zoom so dense national views stay
            legible (smaller dots when zoomed out, larger when inspecting a county) */}
        {plan?.nodes.map((n) => {
          const color = n.role === 'hub' ? COLORS.hub : n.role === 'need' ? COLORS.need : COLORS.mixed;
          const units = Math.max(n.surplusUnits, n.needUnits);
          const zoomScale = Math.max(0.62, Math.min(1.25, 0.62 + (zoom - 5) * 0.17));
          const radius = (Math.min(8.5, (n.urgent ? 6.4 : 5.2) + Math.log10(units + 1) * 0.7)) * zoomScale;
          const served = delivered.some((id) => plan.routes.find((r) => r.id === id)?.to.id === n.id);
          const isLeadNeed = n.id === leadRoute?.to.id;
          const isLeadSource = n.id === leadRoute?.from.id;
          const visibility = storyStage === 'detect'
            ? isLeadNeed ? 1 : 0.16
            : storyStage === 'rank'
              ? (isLeadNeed || n.role === 'hub') ? 0.92 : 0.18
              : storyStage === 'route'
                ? (isLeadNeed || isLeadSource) ? 1 : 0.34
                : 0.76;
          const traceable = plan.routes.some((r) => r.to.id === n.id || r.from.id === n.id);
          return (
            <CircleMarker
              key={`node-${n.id}`}
              center={[n.lat, n.lon]}
              radius={radius}
              eventHandlers={traceable ? { click: () => selectNode(n.id) } : undefined}
              pathOptions={{
                color: served ? '#ffffff' : color,
                weight: served ? 2.5 : 1.5,
                fillColor: color,
                fillOpacity: visibility,
                opacity: Math.min(1, visibility + 0.12),
                className: `${isLeadNeed ? 'mm-critical-node' : n.urgent && n.role !== 'hub' ? 'mm-pulse' : ''}${traceable ? ' mm-clickable' : ''}`.trim() || undefined,
              }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                <div style={{ minWidth: 180 }}>
                  <strong>{n.org_name}</strong>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>{n.county} County</div>
                  {n.surplusUnits > 0 && <div style={{ color: '#0a8f63', fontSize: 12 }}>▲ {n.surplusUnits} units surplus</div>}
                  {n.needUnits > 0 && <div style={{ color: '#c8324a', fontSize: 12 }}>▼ {n.needUnits} units needed{n.urgent ? ' · URGENT' : ''}</div>}
                  {traceable && <div style={{ marginTop: 4, color: '#0e9f6e', fontSize: 11, fontWeight: 700 }}>Click to trace transfer →</div>}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Cinematic ambience */}
      <div className="command-ambient" aria-hidden="true" />
      <div className="command-vignette" aria-hidden="true" />

      {showPrelude && plan && (
        <section
          className="command-prelude"
          onClick={() => { setShowPrelude(false); if (phase === 'idle') window.setTimeout(() => run(plan.routes[0]?.id), 120); }}
        >
          <div className="prelude-brand"><i /> MediMatch by Lesnar AI</div>
          <h1>
            <span className="pl-line" style={{ ['--d' as any]: '0.05s' }}>See surplus.</span>
            <span className="pl-line" style={{ ['--d' as any]: '0.22s' }}>Detect need.</span>
            <span className="pl-line pl-accent" style={{ ['--d' as any]: '0.42s' }}><em>Close the gap.</em></span>
          </h1>
          <p style={{ ['--d' as any]: '0.62s' }} className="pl-fade">Geospatial intelligence for <strong>equitable</strong> medical-supply redistribution — so surplus reaches the facilities that need it most.</p>
          <div className="prelude-arc">
            <span>Studied in Nairobi</span>
            <i />
            <span>Built for Kenya</span>
            <i />
            <span>Designed for Africa</span>
          </div>
          <div className="prelude-signal">
            <span>{plan.nodes.length} facilities connected</span>
            <span>{plan.routes.length} transfers ready to rank</span>
          </div>
          <div className="prelude-enter">Enter the command center <i>→</i></div>
        </section>
      )}

      {/* Title — slim brand bar */}
      <div className="command-title" style={S.titleBar}>
        <div style={S.titleRow}>
          <span style={S.dot} />
          <span style={S.brand}>MediMatch</span>
          <span style={S.sub}>National Redistribution Command</span>
        </div>
        <div className="command-links">
          <a href="/about">Platform</a>
          <a href="/listings">Listings</a>
          <a href="/login">Coordinator login</a>
        </div>
      </div>

      {story && (
        <section key={storyStage} className={`command-story story-${storyStage}`} aria-live="polite">
          <div className="story-index">{story.step}</div>
          <div>
            <span>{story.eyebrow}</span>
            <h1>{story.title}</h1>
            <p>{story.body}</p>
          </div>
          <div className="story-progress" aria-hidden="true">
            {(['detect', 'rank', 'route', 'impact'] as StoryStage[]).map((stage) => (
              <i key={stage} className={stage === storyStage ? 'active' : ''} />
            ))}
          </div>
        </section>
      )}

      {/* Impact HUD */}
      <div className="command-hud" style={S.hud}>
        <div className="command-hud-title" style={S.hudTitle}>LIVE COORDINATION IMPACT</div>
        <div className="command-metrics" style={S.metrics}>
          <Metric label="Facilities served" value={cFac} />
          <Metric label="Units routed" value={cUnits.toLocaleString()} />
          <Metric label="Route kilometres" value={cKm.toLocaleString()} />
          <Metric label="Urgent needs addressed" value={cUrg} accent={COLORS.need} />
        </div>

        {plan && plan.impact.demand_units > 0 && (() => {
          const coverage = Math.min(100, Math.round((cUnits / plan.impact.demand_units) * 100));
          const unmet = Math.max(0, plan.impact.facilities_in_need - cFac);
          return (
            <div className="command-equity">
              <div className="equity-head">
                <span>Equity outcome</span>
                <strong>{coverage}% demand coverage</strong>
              </div>
              <div className="equity-gauge"><i style={{ width: `${coverage}%` }} /></div>
              <div className="equity-stats">
                <div>
                  <b>Facilities in shortfall</b>
                  <span><em className="was">{plan.impact.facilities_in_need}</em> → <em className="now">{unmet}</em></span>
                </div>
                <div>
                  <b>Urgent gaps closed</b>
                  <span><em className="now">{cUrg}</em> / {plan.impact.urgent_total}</span>
                </div>
              </div>
            </div>
          );
        })()}
        <div className="command-controls" style={S.controls}>
          <button style={{ ...S.btn, ...(phase === 'running' ? S.btnBusy : {}) }} onClick={() => run()} disabled={phase === 'running' || !plan}>
            {phase === 'running' ? 'Routing supply...' : phase === 'done' ? 'Run again' : 'Run redistribution'}
          </button>
          <button style={{ ...S.btnGhost, ...(autoDemo ? S.btnGhostOn : {}) }} onClick={toggleAuto}>
            {autoDemo ? 'Auto-play on' : 'Auto-play off'}
          </button>
        </div>
        {scenarioRoutes.length > 0 && (
          <div className="scenario-switcher">
            <span>Urgent scenarios</span>
            <div>
              {scenarioRoutes.map((route) => (
                <button
                  key={route.id}
                  className={route.id === leadRoute?.id ? 'active' : ''}
                  onClick={() => selectScenario(route)}
                  title={`${route.item}: ${route.from.county} to ${route.to.county}`}
                >
                  <i>{route.to.county.slice(0, 2).toUpperCase()}</i>
                  <small>{route.item}</small>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="command-legend" style={S.legend}>
        <LegendItem color={COLORS.hub} label="Surplus hub" />
        <LegendItem color={COLORS.need} label="Urgent need" />
        <LegendItem color={COLORS.mixed} label="Mixed" />
      </div>

      {/* Delivery feed */}
      {deliveredFeed.length > 0 && (
        <div className="command-feed" style={S.feed}>
          <div style={S.feedTitle}>SUPPLY DELIVERED</div>
          <div style={S.feedList}>
            {deliveredFeed.slice(0, 8).map((r) => (
              <div key={r.id} style={S.feedRow}>
                <span style={{ color: r.urgent ? COLORS.need : COLORS.hub }}>✓</span>
                <span style={{ flex: 1 }}>
                  <strong>{r.qty}×</strong> {r.item}
                  <span style={S.feedArrow}> → {r.to.county}</span>
                </span>
                <span style={S.feedKm}>{r.distance_km} km</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`command-platform-strip ${storyStage === 'impact' ? 'revealed' : ''}`}>
        <strong>National deployment layer</strong>
        <div>
          <span><i /> Equity-driven matching</span>
          <span><i /> Explainable ranking</span>
          <span><i /> Human verification</span>
          <span><i /> Integration-ready</span>
        </div>
        <small>Case study: Nairobi County. Public facility names with approximate geocodes; synthetic inventory and need data — no patient records. Every transfer requires coordinator verification.</small>
      </div>

      {!plan && !error && (
        <div className="command-loading">
          <span />
          <strong>Building national redistribution plan</strong>
          <small>Ranking compatible surplus against urgent need</small>
        </div>
      )}

      {error && <div style={S.error}>{error}</div>}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div style={S.metric}>
      <div style={{ ...S.metricVal, color: accent || '#eafff8' }}>{value}</div>
      <div style={S.metricLabel}>{label}</div>
    </div>
  );
}
function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 11, height: 11, borderRadius: 999, background: color, display: 'inline-block' }} />
      <span style={{ fontSize: 12, opacity: 0.85 }}>{label}</span>
    </div>
  );
}

const glass: React.CSSProperties = {
  background: 'rgba(11,18,32,0.78)', backdropFilter: 'blur(10px)',
  border: '1px solid rgba(120,160,200,0.18)', borderRadius: 8, color: '#eaf2ff',
  boxShadow: '0 10px 40px rgba(0,0,0,0.45)',
};

const S: Record<string, React.CSSProperties> = {
  wrap: { position: 'fixed', inset: 0, top: 0, zIndex: 2000, background: '#06080f', overflow: 'hidden' },
  titleBar: { position: 'absolute', top: 18, left: 18, zIndex: 1000, ...glass, padding: '12px 16px', maxWidth: 460 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  dot: { width: 9, height: 9, borderRadius: 999, background: '#22d39a', boxShadow: '0 0 10px #22d39a', display: 'inline-block' },
  brand: { fontWeight: 800, fontSize: 18, letterSpacing: 0.3 },
  sub: { opacity: 0.7, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  tag: { marginTop: 4, fontSize: 12.5, opacity: 0.72, lineHeight: 1.35 },

  hud: { position: 'absolute', top: 18, right: 18, zIndex: 1000, ...glass, padding: '14px 16px', width: 304 },
  hudTitle: { fontSize: 11, letterSpacing: 2, opacity: 0.6, marginBottom: 10 },
  metrics: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  metric: {},
  metricVal: { fontSize: 26, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' },
  metricLabel: { fontSize: 11, opacity: 0.6, marginTop: 2 },
  controls: { display: 'flex', gap: 8, marginTop: 14 },
  btn: { flex: 1, padding: '10px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, color: '#04130d', background: 'linear-gradient(135deg,#34e0a8,#22b3c9)' },
  btnBusy: { opacity: 0.7, cursor: 'default' },
  btnGhost: { padding: '10px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12, color: '#cfe0ff', background: 'transparent', border: '1px solid rgba(120,160,200,0.3)' },
  btnGhostOn: { background: 'rgba(52,224,168,0.15)', border: '1px solid rgba(52,224,168,0.5)', color: '#9ff5d6' },
  summary: { marginTop: 10, fontSize: 11.5, opacity: 0.55 },

  legend: { position: 'absolute', bottom: 18, left: 18, zIndex: 1000, ...glass, padding: '10px 14px', display: 'flex', gap: 16 },

  feed: { position: 'absolute', bottom: 18, right: 18, zIndex: 1000, ...glass, padding: '12px 14px', width: 300, maxHeight: '46vh', overflow: 'hidden' },
  feedTitle: { fontSize: 11, letterSpacing: 2, opacity: 0.6, marginBottom: 8 },
  feedList: { display: 'flex', flexDirection: 'column', gap: 7 },
  feedRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 },
  feedArrow: { opacity: 0.6 },
  feedKm: { opacity: 0.6, fontVariantNumeric: 'tabular-nums', fontSize: 11.5 },

  error: { position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, ...glass, padding: '10px 16px', color: '#ffb4bd' },
};
