import React, { useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import API from '../services/api';

const GlobeIntro = lazy(() => import('./GlobeIntro'));

// The 3D globe is a progressive enhancement: if WebGL is unavailable or the
// scene throws, we silently fall back to the 2D intro + map (never break).
function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch { return false; }
}
class GlobeBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

/* ===========================================================================
 * MediMatch — Savannah Command
 * A bespoke, hand-built SVG map of Kenya (no Leaflet, no tiles). Topographic
 * contour art in a warm African palette; supply routes that draw themselves as
 * light with travelling pulses. All motion is declarative SVG/CSS — no per-frame
 * React, so it stays smooth by construction.
 * ========================================================================= */

type Node = { id: number; org_name: string; county: string; lat: number; lon: number; role: 'hub' | 'need' | 'mixed'; surplusUnits: number; needUnits: number; urgent: boolean };
type Route = {
  id: number; item: string; category: string; qty: number; urgent: boolean; distance_km: number;
  from: { id: number; org: string; county: string; lat: number; lon: number };
  to: { id: number; org: string; county: string; lat: number; lon: number };
  geometry: [number, number][];
};
type Impact = { demand_units: number; coverage_pct: number; facilities_in_need: number; urgent_total: number; hubs_engaged: number };
type Plan = { nodes: Node[]; routes: Route[]; impact: Impact };
type Stage = 'detect' | 'rank' | 'route' | 'impact';

const LON0 = 33.6, LON1 = 42.1, LAT0 = -4.9, LAT1 = 5.7;
const VW = 1000, VH = Math.round((VW * (LAT1 - LAT0)) / (LON1 - LON0)); // preserve aspect
const px = (lon: number) => ((lon - LON0) / (LON1 - LON0)) * VW;
const py = (lat: number) => ((LAT1 - lat) / (LAT1 - LAT0)) * VH;

const KENYA: [number, number][] = [
  [-4.67677, 39.20222], [-3.67712, 37.7669], [-3.09699, 37.69869], [-1.05982, 34.07262],
  [-0.95, 33.903711], [0.109814, 33.893569], [0.515, 34.18], [1.17694, 34.6721],
  [1.90584, 35.03599], [3.05374, 34.59607], [3.5556, 34.47913], [4.249885, 34.005],
  [4.847123, 34.620196], [5.506, 35.298007], [5.338232, 35.817448], [4.776966, 35.817448],
  [4.447864, 36.159079], [4.447864, 36.855093], [3.598605, 38.120915], [3.58851, 38.43697],
  [3.61607, 38.67114], [3.50074, 38.89251], [3.42206, 39.559384], [3.83879, 39.85494],
  [4.25702, 40.76848], [3.91909, 41.1718], [3.918912, 41.855083], [2.78452, 40.98105],
  [-0.85829, 40.993], [-1.68325, 41.58513], [-2.08255, 40.88477], [-2.49979, 40.63785],
  [-2.57309, 40.26304], [-3.27768, 40.12119], [-3.68116, 39.80006], [-4.34653, 39.60489],
  [-4.67677, 39.20222],
];
const CITIES = [
  { n: 'Nairobi', lat: -1.286, lon: 36.817 }, { n: 'Mombasa', lat: -4.043, lon: 39.668 },
  { n: 'Kisumu', lat: -0.092, lon: 34.768 }, { n: 'Eldoret', lat: 0.514, lon: 35.27 },
  { n: 'Nakuru', lat: -0.303, lon: 36.08 }, { n: 'Garissa', lat: -0.453, lon: 39.646 },
  { n: 'Wajir', lat: 1.747, lon: 40.058 }, { n: 'Marsabit', lat: 2.33, lon: 37.99 },
  { n: 'Lodwar', lat: 3.12, lon: 35.6 },
];

const C = { gold: '#f0b32e', gold2: '#f8d27a', acacia: '#37c07e', terra: '#e8703c', red: '#f25555', cream: '#f4ead6' };

function outlinePath(pts: [number, number][]) {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${px(p[1]).toFixed(1)} ${py(p[0]).toFixed(1)}`).join(' ') + ' Z';
}
function centroid(pts: [number, number][]) {
  const s = pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
  return [s[0] / pts.length, s[1] / pts.length] as [number, number];
}
function scaledOutline(pts: [number, number][], f: number) {
  const [cy, cx] = centroid(pts);
  return outlinePath(pts.map((p) => [cy + (p[0] - cy) * f, cx + (p[1] - cx) * f]));
}
function routePath(r: Route) {
  const g = r.geometry && r.geometry.length > 1 ? r.geometry : [[r.from.lat, r.from.lon], [r.to.lat, r.to.lon]] as [number, number][];
  return g.map((p, i) => `${i ? 'L' : 'M'}${px(p[1]).toFixed(1)} ${py(p[0]).toFixed(1)}`).join(' ');
}

function useCountUp(target: number, run: boolean, ms = 1600) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) { setV(0); return; }
    let raf = 0; const start = performance.now();
    const tick = (t: number) => { const p = Math.min(1, (t - start) / ms); setV(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return v;
}

export default function SavannahCommand() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runToken, setRunToken] = useState(0);
  const [stage, setStage] = useState<Stage>('detect');
  const [selId, setSelId] = useState<number | null>(null);
  const [auto, setAuto] = useState(true);
  const [intro, setIntro] = useState(true);
  const timers = useRef<number[]>([]);
  const started = useRef(false);
  const showGlobe = useMemo(() => webglAvailable(), []);

  useEffect(() => {
    let off = false;
    API.get('/redistribution/plan?roads=0').then(({ data }) => { if (!off) setPlan(data); }).catch(() => { if (!off) setError('Could not load redistribution plan.'); });
    return () => { off = true; };
  }, []);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  function run(routeId?: number) {
    if (!plan) return;
    clear();
    const pid = routeId ?? selId ?? plan.routes[0]?.id ?? null;
    setSelId(pid);
    setStage('detect');
    setRunToken((x) => x + 1);
    const total = 0.6 + plan.routes.length * 0.28 + 1.6;
    timers.current.push(window.setTimeout(() => setStage('rank'), 1100));
    timers.current.push(window.setTimeout(() => setStage('route'), 2200));
    timers.current.push(window.setTimeout(() => setStage('impact'), total * 1000));
    if (auto) timers.current.push(window.setTimeout(() => run(), total * 1000 + 6000));
  }

  useEffect(() => {
    if (!plan || started.current) return;
    started.current = true;
    setSelId(plan.routes[0]?.id ?? null);
    const t1 = window.setTimeout(() => setIntro(false), 4300);
    const t2 = window.setTimeout(() => run(plan.routes[0]?.id), 4600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);
  useEffect(() => () => clear(), []);

  const lead = plan?.routes.find((r) => r.id === selId) || plan?.routes[0];
  const scenarios = useMemo(() => (plan?.routes || []).filter((r) => r.urgent).slice(0, 4), [plan]);
  const running = runToken > 0;

  const cFac = useCountUp(plan ? new Set(plan.routes.map((r) => r.to.id)).size : 0, running);
  const cUnits = useCountUp(plan ? plan.routes.reduce((s, r) => s + r.qty, 0) : 0, running);
  const cKm = useCountUp(plan ? plan.routes.reduce((s, r) => s + r.distance_km, 0) : 0, running);
  const cUrg = useCountUp(plan ? plan.routes.filter((r) => r.urgent).length : 0, running);
  const coverage = plan?.impact.coverage_pct ?? 0;

  function selectScenario(r: Route) { setAuto(false); setIntro(false); run(r.id); }

  const story = useMemo(() => {
    if (!lead || !plan) return null;
    if (stage === 'detect') return { k: '01', e: 'Urgent signal detected', t: `${lead.to.county} supply gap`, b: `${lead.to.org} reports an urgent need for ${lead.qty} units of ${lead.item.toLowerCase()}.` };
    if (stage === 'rank') return { k: '02', e: 'Geospatial ranking', t: `Weighing ${plan.impact.hubs_engaged} supply hubs`, b: 'Category fit, quantity, urgency, verification and transfer distance — every factor explainable.' };
    if (stage === 'route') return { k: '03', e: 'Source selected', t: `${lead.from.county} → ${lead.to.county}`, b: `${lead.from.org} releases ${lead.qty} units across a ${lead.distance_km} km coordination route.` };
    return { k: '04', e: 'Equitable access restored', t: `${cFac} facilities reached`, b: `${cUnits.toLocaleString()} units routed across ${cKm.toLocaleString()} km — surplus moved to where shortfalls bite hardest. Every transfer stays subject to coordinator verification.` };
  }, [lead, plan, stage, cFac, cUnits, cKm]);

  const contours = useMemo(() => [0.9, 0.78, 0.64, 0.5, 0.36, 0.22].map((f) => scaledOutline(KENYA, f)), []);
  const kenyaD = useMemo(() => outlinePath(KENYA), []);

  return (
    <div className="sv">
      <div className="sv-grain" aria-hidden />
      <div className="sv-glow" aria-hidden />

      {/* ===== Bespoke SVG map ===== */}
      <svg className="sv-map" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
        <defs>
          <radialGradient id="svLand" cx="42%" cy="38%" r="75%">
            <stop offset="0%" stopColor="#23304a" />
            <stop offset="60%" stopColor="#172138" />
            <stop offset="100%" stopColor="#101728" />
          </radialGradient>
          <linearGradient id="svRoute" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={C.gold} />
            <stop offset="100%" stopColor={C.terra} />
          </linearGradient>
          <filter id="svBlur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6" /></filter>
          <pattern id="svWeave" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 13 H26 M13 0 V26" stroke={C.gold} strokeOpacity="0.05" strokeWidth="1" />
          </pattern>
        </defs>

        {/* landmass + woven texture + topographic contours */}
        <path d={kenyaD} fill="url(#svLand)" stroke={C.gold} strokeOpacity="0.55" strokeWidth="1.6" />
        <path d={kenyaD} fill="url(#svWeave)" />
        {contours.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={C.gold} strokeOpacity={0.16 - i * 0.02} strokeWidth="1" strokeDasharray="2 6" />
        ))}

        {/* city ticks + labels for orientation */}
        {CITIES.map((c) => (
          <g key={c.n} transform={`translate(${px(c.lon).toFixed(1)} ${py(c.lat).toFixed(1)})`}>
            <circle r="1.8" fill={C.cream} fillOpacity="0.5" />
            <text x="5" y="3.5" className="sv-city">{c.n}</text>
          </g>
        ))}

        {/* routes — draw themselves, then a light pulse keeps travelling */}
        <g key={runToken}>
          {plan?.routes.map((r, i) => {
            const d = routePath(r);
            const delay = 0.6 + i * 0.28;
            const urgent = r.urgent;
            const col = urgent ? C.terra : C.acacia;
            const sel = r.id === lead?.id;
            return (
              <g key={r.id} className="sv-route-g">
                <path id={`rp-${r.id}`} d={d} fill="none" stroke="none" />
                <path d={d} className="sv-route" pathLength={1} fill="none"
                  stroke={sel ? 'url(#svRoute)' : col} strokeWidth={sel ? 2.6 : urgent ? 1.6 : 1.2}
                  strokeOpacity={sel ? 0.98 : 0.5} strokeLinecap="round" style={{ animationDelay: `${delay}s` }} />
                <circle r={sel ? 3 : 2.1} fill="#fff" className="sv-spark">
                  <animateMotion dur={`${urgent ? 1.5 : 2}s`} begin={`${delay + 0.2}s`} repeatCount="indefinite" rotate="auto">
                    <mpath href={`#rp-${r.id}`} />
                  </animateMotion>
                </circle>
                <circle cx={px(r.to.lon)} cy={py(r.to.lat)} r="3" className="sv-arrive" fill="none"
                  stroke={col} style={{ animationDelay: `${delay + 1.1}s` }} />
              </g>
            );
          })}
        </g>

        {/* facility dots */}
        {plan?.nodes.map((n) => {
          const col = n.role === 'hub' ? C.acacia : n.role === 'need' ? C.red : C.gold;
          const x = px(n.lon), y = py(n.lat);
          const emph = n.id === lead?.to.id || n.id === lead?.from.id;
          const traceable = plan.routes.some((r) => r.to.id === n.id || r.from.id === n.id);
          return (
            <g key={n.id} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`} className={traceable ? 'sv-node sv-clickable' : 'sv-node'}
              onClick={traceable ? () => { const r = plan.routes.find((x) => x.to.id === n.id) || plan.routes.find((x) => x.from.id === n.id); if (r) selectScenario(r); } : undefined}>
              {(emph || n.urgent) && <circle r="3.4" fill="none" stroke={col} className="sv-ping" />}
              <circle r={emph ? 4 : 2.8} fill={col} stroke="#0e1322" strokeWidth="0.8" />
              <title>{n.org_name} · {n.county}{n.needUnits > 0 ? ` — needs ${n.needUnits}` : n.surplusUnits > 0 ? ` — surplus ${n.surplusUnits}` : ''}</title>
            </g>
          );
        })}
      </svg>

      {/* ===== Intro: 3D globe dive + headline, then hands off to the map ===== */}
      {intro && plan && showGlobe && (
        <GlobeBoundary><Suspense fallback={null}><GlobeIntro /></Suspense></GlobeBoundary>
      )}
      {intro && plan && (
        <div className="sv-intro" onClick={() => { setIntro(false); run(plan.routes[0]?.id); }}>
          <div className="sv-intro-kicker"><span className="sv-mark" /> MEDIMATCH · SILICON SAVANNAH</div>
          <h1><span style={{ ['--d' as any]: '.05s' }}>See surplus.</span><span style={{ ['--d' as any]: '.2s' }}>Detect need.</span><span className="hl" style={{ ['--d' as any]: '.4s' }}>Close the gap.</span></h1>
          <p>Geospatial intelligence for <b>equitable</b> medical-supply redistribution — engineered in Nairobi, built for Africa.</p>
          <div className="sv-intro-go">Enter the command floor →</div>
        </div>
      )}

      {/* ===== Brand ===== */}
      <header className="sv-brand">
        <span className="sv-mark" />
        <div>
          <strong>MediMatch</strong>
          <em>National Redistribution Command</em>
        </div>
        <nav><a href="/about">Platform</a><a href="/listings">Listings</a><a href="/login">Coordinator</a></nav>
      </header>

      {/* ===== Narrative ===== */}
      {story && (
        <section className={`sv-story s-${stage}`} key={stage}>
          <span className="sv-step">{story.k}</span>
          <span className="sv-eyebrow">{story.e}</span>
          <h2>{story.t}</h2>
          <p>{story.b}</p>
          <div className="sv-steps">{(['detect', 'rank', 'route', 'impact'] as Stage[]).map((s) => <i key={s} className={s === stage ? 'on' : ''} />)}</div>
        </section>
      )}

      {/* ===== Impact + equity ===== */}
      <aside className="sv-panel">
        <div className="sv-panel-h">Live coordination impact</div>
        <div className="sv-stats">
          <div><b>{cFac}</b><span>Facilities served</span></div>
          <div><b>{cUnits.toLocaleString()}</b><span>Units routed</span></div>
          <div><b>{cKm.toLocaleString()}</b><span>Route km</span></div>
          <div className="urg"><b>{cUrg}</b><span>Urgent needs met</span></div>
        </div>
        {plan && (
          <div className="sv-equity">
            <div className="sv-equity-h"><span>Equity outcome</span><strong>{running ? coverage : 0}% demand coverage</strong></div>
            <div className="sv-gauge"><i style={{ width: `${running ? coverage : 0}%` }} /></div>
            <div className="sv-equity-row">
              <div><span>Facilities in shortfall</span><b><em className="was">{plan.impact.facilities_in_need}</em> → <em className="now">{stage === 'impact' ? 0 : plan.impact.facilities_in_need}</em></b></div>
              <div><span>Urgent gaps closed</span><b>{cUrg} / {plan.impact.urgent_total}</b></div>
            </div>
          </div>
        )}
        <div className="sv-controls">
          <button className="sv-btn" onClick={() => run()} disabled={!plan}>Run redistribution</button>
          <button className={`sv-btn ghost ${auto ? 'on' : ''}`} onClick={() => setAuto((a) => !a)}>{auto ? 'Auto-play on' : 'Auto-play off'}</button>
        </div>
        {scenarios.length > 0 && (
          <div className="sv-scen">
            <span>Urgent scenarios</span>
            <div>
              {scenarios.map((r) => (
                <button key={r.id} className={r.id === lead?.id ? 'on' : ''} onClick={() => selectScenario(r)}>
                  <i>{r.to.county.slice(0, 2).toUpperCase()}</i><small>{r.item}</small>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ===== Legend ===== */}
      <footer className="sv-legend">
        <span><i style={{ background: C.acacia }} /> Surplus hub</span>
        <span><i style={{ background: C.red }} /> Urgent need</span>
        <span><i style={{ background: C.gold }} /> Mixed</span>
        <em>Case study: Nairobi County · synthetic data, no patient records · coordinator verification required</em>
      </footer>

      {!plan && !error && <div className="sv-loading"><span /> Building national redistribution plan…</div>}
      {error && <div className="sv-error">{error}</div>}
    </div>
  );
}
