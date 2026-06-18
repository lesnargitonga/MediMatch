import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type NodeRole = 'hub' | 'need';
type StoryStage = 'detect' | 'rank' | 'route' | 'impact';

type FacilityNode = {
  id: number;
  org_name: string;
  county: string;
  lat: number;
  lon: number;
  role: NodeRole;
  surplusUnits: number;
  needUnits: number;
  urgent: boolean;
};

type Route = {
  id: number;
  item: string;
  category: string;
  qty: number;
  urgent: boolean;
  distance_km: number;
  eta_hr: number;
  from: FacilityNode;
  to: FacilityNode;
  geometry: [number, number][];
};

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

const COLORS = {
  hub: '#34e0a8',
  need: '#ff6677',
  route: '#62e8d0',
  routeUrgent: '#ff8794',
};

const FACILITIES: FacilityNode[] = [
  { id: 2, org_name: 'Kenyatta National Hospital', county: 'Nairobi', lat: -1.3013, lon: 36.8064, role: 'hub', surplusUnits: 264, needUnits: 0, urgent: false },
  { id: 3, org_name: 'Moi Teaching & Referral Hospital', county: 'Uasin Gishu', lat: 0.5143, lon: 35.2698, role: 'hub', surplusUnits: 309, needUnits: 0, urgent: false },
  { id: 4, org_name: 'Coast General Teaching & Referral Hospital', county: 'Mombasa', lat: -4.0506, lon: 39.6669, role: 'hub', surplusUnits: 860, needUnits: 0, urgent: false },
  { id: 5, org_name: 'JOOTRH Kisumu', county: 'Kisumu', lat: -0.0917, lon: 34.768, role: 'hub', surplusUnits: 850, needUnits: 0, urgent: false },
  { id: 6, org_name: 'Nakuru Level 5 Hospital', county: 'Nakuru', lat: -0.2916, lon: 36.0664, role: 'hub', surplusUnits: 260, needUnits: 0, urgent: false },
  { id: 7, org_name: 'Nyeri County Referral Hospital', county: 'Nyeri', lat: -0.4197, lon: 36.9489, role: 'hub', surplusUnits: 400, needUnits: 0, urgent: false },
  { id: 8, org_name: 'Lodwar County Referral Hospital', county: 'Turkana', lat: 3.1191, lon: 35.5973, role: 'need', surplusUnits: 0, needUnits: 86, urgent: true },
  { id: 9, org_name: 'Mandera County Referral Hospital', county: 'Mandera', lat: 3.9366, lon: 41.867, role: 'need', surplusUnits: 0, needUnits: 120, urgent: true },
  { id: 10, org_name: 'Wajir County Referral Hospital', county: 'Wajir', lat: 1.7471, lon: 40.0573, role: 'need', surplusUnits: 0, needUnits: 4, urgent: true },
  { id: 11, org_name: 'Marsabit County Referral Hospital', county: 'Marsabit', lat: 2.3344, lon: 37.9899, role: 'need', surplusUnits: 0, needUnits: 2, urgent: true },
  { id: 12, org_name: 'Garissa County Referral Hospital', county: 'Garissa', lat: -0.4569, lon: 39.6583, role: 'need', surplusUnits: 0, needUnits: 340, urgent: true },
  { id: 13, org_name: 'Kapenguria County Referral Hospital', county: 'West Pokot', lat: 1.2389, lon: 35.1119, role: 'need', surplusUnits: 0, needUnits: 15, urgent: true },
  { id: 14, org_name: 'Narok County Referral Hospital', county: 'Narok', lat: -1.0833, lon: 35.8667, role: 'need', surplusUnits: 0, needUnits: 200, urgent: true },
  { id: 15, org_name: 'Homa Bay County Referral Hospital', county: 'Homa Bay', lat: -0.5273, lon: 34.4571, role: 'need', surplusUnits: 0, needUnits: 150, urgent: false },
  { id: 16, org_name: 'Machakos Level 5 Hospital', county: 'Machakos', lat: -1.5167, lon: 37.2634, role: 'need', surplusUnits: 0, needUnits: 120, urgent: false },
  { id: 17, org_name: 'Malindi Sub-County Hospital', county: 'Kilifi', lat: -3.2175, lon: 40.1191, role: 'need', surplusUnits: 0, needUnits: 100, urgent: false },
];

const byId = new Map(FACILITIES.map((facility) => [facility.id, facility]));

function arc(from: FacilityNode, to: FacilityNode, steps = 64): [number, number][] {
  const dx = to.lon - from.lon;
  const dy = to.lat - from.lat;
  const control = {
    lat: (from.lat + to.lat) / 2 - dx * 0.14,
    lon: (from.lon + to.lon) / 2 + dy * 0.14,
  };
  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const lat = (1 - t) ** 2 * from.lat + 2 * (1 - t) * t * control.lat + t ** 2 * to.lat;
    const lon = (1 - t) ** 2 * from.lon + 2 * (1 - t) * t * control.lon + t ** 2 * to.lon;
    return [lat, lon];
  });
}

const ROUTE_SPECS = [
  [1, 3, 8, 'Oxygen concentrators', 'equipment', 6, true, 327, 7.4],
  [2, 3, 8, 'Sterile surgical kits', 'supplies', 80, true, 327, 7.4],
  [3, 2, 9, 'Cold-chain insulin', 'medication', 120, true, 1007, 17.2],
  [4, 3, 10, 'Oxygen concentrators', 'equipment', 4, true, 641, 11.8],
  [5, 2, 11, 'Portable ventilators', 'equipment', 2, true, 526, 10.1],
  [6, 4, 12, 'O-negative blood bags', 'supplies', 40, true, 409, 8.2],
  [7, 4, 12, 'IV fluids', 'supplies', 300, true, 409, 8.2],
  [8, 6, 13, 'Vaccine cold-chain carriers', 'equipment', 15, true, 245, 5.6],
  [9, 5, 14, 'Antimalarials', 'medication', 200, true, 316, 7.1],
  [10, 5, 15, 'Amoxicillin 500mg', 'medication', 150, false, 78, 2.1],
  [11, 6, 17, 'Surgical masks', 'supplies', 100, false, 682, 12.4],
  [12, 7, 16, 'Normal saline', 'supplies', 120, false, 151, 3.7],
] as const;

const ROUTES: Route[] = ROUTE_SPECS.map(([id, fromId, toId, item, category, qty, urgent, distance, eta]) => {
  const from = byId.get(fromId)!;
  const to = byId.get(toId)!;
  return {
    id,
    item,
    category,
    qty,
    urgent,
    distance_km: distance,
    eta_hr: eta,
    from,
    to,
    geometry: arc(from, to),
  };
});

const IMPACT = {
  facilities: new Set(ROUTES.map((route) => route.to.id)).size,
  hubs: new Set(ROUTES.map((route) => route.from.id)).size,
  units: ROUTES.reduce((total, route) => total + route.qty, 0),
  km: ROUTES.reduce((total, route) => total + route.distance_km, 0),
  urgent: ROUTES.filter((route) => route.urgent).length,
};

function haversineKm(a: FacilityNode, b: FacilityNode) {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function FitKenya() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(KENYA_BOUNDS, { padding: [28, 28] });
  }, [map]);
  return null;
}

function MapDirector({ stage, route, candidates }: { stage: StoryStage; route: Route; candidates: FacilityNode[] }) {
  const map = useMap();

  useEffect(() => {
    const mobile = window.innerWidth <= 760;
    if (stage === 'detect') {
      map.flyTo([route.to.lat, route.to.lon], mobile ? 5.7 : 7, { duration: 1.8 });
      return;
    }
    if (stage === 'rank') {
      const points = [route.to, ...candidates].map((node) => [node.lat, node.lon] as [number, number]);
      map.flyToBounds(points, {
        paddingTopLeft: mobile ? [20, 180] : [360, 110],
        paddingBottomRight: mobile ? [20, 270] : [360, 100],
        maxZoom: mobile ? 5.4 : 6.4,
        duration: 1.8,
      });
      return;
    }
    if (stage === 'route') {
      map.flyToBounds([[route.from.lat, route.from.lon], [route.to.lat, route.to.lon]], {
        paddingTopLeft: mobile ? [24, 190] : [390, 100],
        paddingBottomRight: mobile ? [24, 280] : [370, 100],
        maxZoom: mobile ? 5.7 : 6.8,
        duration: 2,
      });
      return;
    }
    map.flyToBounds(KENYA_BOUNDS, {
      paddingTopLeft: mobile ? [20, 180] : [345, 50],
      paddingBottomRight: mobile ? [20, 275] : [335, 50],
      maxZoom: mobile ? 5.2 : 6,
      duration: 2,
    });
  }, [candidates, map, route, stage]);

  return null;
}

function useCountUp(target: number, enabled: boolean, duration = 900) {
  const [value, setValue] = useState(0);
  const previous = useRef(0);

  useEffect(() => {
    if (!enabled) {
      previous.current = 0;
      setValue(0);
      return;
    }
    const from = previous.current;
    const startedAt = performance.now();
    let animation = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const next = Math.round(from + (target - from) * eased);
      previous.current = next;
      setValue(next);
      if (progress < 1) animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animation);
  }, [duration, enabled, target]);

  return value;
}

export default function CommandMap() {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [autoDemo, setAutoDemo] = useState(true);
  const [storyStage, setStoryStage] = useState<StoryStage>('detect');
  const [selectedRouteId, setSelectedRouteId] = useState(ROUTES[0].id);
  const [showPrelude, setShowPrelude] = useState(true);
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [delivered, setDelivered] = useState<number[]>([]);
  const [activeIds, setActiveIds] = useState<number[]>([]);

  const inflight = useRef(new Map<number, { start: number; duration: number; onDone: () => void }>());
  const animationFrame = useRef(0);
  const sequenceTimers = useRef<number[]>([]);
  const beginStoryRef = useRef<(routeId?: number) => void>(() => undefined);

  const leadRoute = ROUTES.find((route) => route.id === selectedRouteId) || ROUTES[0];
  const urgentRoutes = ROUTES.filter((route) => route.urgent).slice(0, 5);

  const rankings = useMemo(() => {
    const hubs = FACILITIES.filter((node) => node.role === 'hub');
    return hubs
      .map((hub) => {
        const distance = Math.round(haversineKm(hub, leadRoute.to));
        const isSelected = hub.id === leadRoute.from.id;
        const score = isSelected ? 96 : Math.max(58, Math.round(89 - distance / 30));
        return {
          node: hub,
          distance,
          score,
          quantityFit: isSelected ? 'Full need covered' : distance < 500 ? 'Stock check required' : 'Long-haul reserve',
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [leadRoute]);

  function ensureAnimationLoop() {
    if (animationFrame.current) return;
    const loop = (now: number) => {
      if (inflight.current.size === 0) {
        animationFrame.current = 0;
        return;
      }
      const nextProgress: Record<number, number> = {};
      const finished: number[] = [];
      inflight.current.forEach((flight, id) => {
        const value = Math.min(1, (now - flight.start) / flight.duration);
        nextProgress[id] = value;
        if (value >= 1) finished.push(id);
      });
      setProgress((current) => ({ ...current, ...nextProgress }));
      finished.forEach((id) => {
        const flight = inflight.current.get(id);
        inflight.current.delete(id);
        flight?.onDone();
      });
      animationFrame.current = requestAnimationFrame(loop);
    };
    animationFrame.current = requestAnimationFrame(loop);
  }

  function clearSequence() {
    sequenceTimers.current.forEach((timer) => window.clearTimeout(timer));
    sequenceTimers.current = [];
    inflight.current.clear();
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = 0;
    }
  }

  function resetVisuals() {
    clearSequence();
    setProgress({});
    setDelivered([]);
    setActiveIds([]);
    setStoryStage('detect');
    setPhase('idle');
  }

  function launchRoute(route: Route, duration: number) {
    setActiveIds((current) => current.includes(route.id) ? current : [...current, route.id]);
    inflight.current.set(route.id, {
      start: performance.now(),
      duration,
      onDone: () => {
        setProgress((current) => ({ ...current, [route.id]: 1 }));
        setDelivered((current) => current.includes(route.id) ? current : [...current, route.id]);
      },
    });
    ensureAnimationLoop();
  }

  function beginStory(routeId = selectedRouteId) {
    clearSequence();
    setSelectedRouteId(routeId);
    setShowPrelude(false);
    setProgress({});
    setDelivered([]);
    setActiveIds([]);
    setStoryStage('detect');
    setPhase('running');

    const chosen = ROUTES.find((route) => route.id === routeId) || ROUTES[0];
    const remaining = ROUTES.filter((route) => route.id !== chosen.id)
      .sort((a, b) => Number(b.urgent) - Number(a.urgent));

    sequenceTimers.current.push(window.setTimeout(() => setStoryStage('rank'), 8000));
    sequenceTimers.current.push(window.setTimeout(() => {
      setStoryStage('route');
      launchRoute(chosen, 7800);
    }, 19500));

    remaining.forEach((route, index) => {
      sequenceTimers.current.push(window.setTimeout(
        () => launchRoute(route, Math.min(5200, 3300 + route.distance_km * 2.2)),
        33500 + index * 430,
      ));
    });

    sequenceTimers.current.push(window.setTimeout(() => setStoryStage('impact'), 46500));
    sequenceTimers.current.push(window.setTimeout(() => setPhase('done'), 50000));
  }

  beginStoryRef.current = beginStory;

  function revealImpact() {
    clearSequence();
    const complete = Object.fromEntries(ROUTES.map((route) => [route.id, 1]));
    setShowPrelude(false);
    setActiveIds(ROUTES.map((route) => route.id));
    setProgress(complete);
    setDelivered(ROUTES.map((route) => route.id));
    setStoryStage('impact');
    setPhase('done');
  }

  function selectScenario(route: Route) {
    setAutoDemo(false);
    beginStory(route.id);
  }

  useEffect(() => {
    const preludeTimer = window.setTimeout(() => setShowPrelude(false), 3600);
    const storyTimer = window.setTimeout(() => beginStoryRef.current(ROUTES[0].id), 4100);
    return () => {
      window.clearTimeout(preludeTimer);
      window.clearTimeout(storyTimer);
      clearSequence();
    };
  }, []);

  useEffect(() => {
    if (phase !== 'done' || !autoDemo) return;
    const timer = window.setTimeout(() => beginStoryRef.current(selectedRouteId), 9000);
    return () => window.clearTimeout(timer);
  }, [autoDemo, phase, selectedRouteId]);

  const live = useMemo(() => {
    const completed = new Set(delivered);
    const routes = ROUTES.filter((route) => completed.has(route.id));
    return {
      facilities: new Set(routes.map((route) => route.to.id)).size,
      units: routes.reduce((total, route) => total + route.qty, 0),
      km: routes.reduce((total, route) => total + route.distance_km, 0),
      urgent: routes.filter((route) => route.urgent).length,
    };
  }, [delivered]);

  const countersEnabled = phase !== 'idle';
  const facilitiesCount = useCountUp(live.facilities, countersEnabled);
  const unitsCount = useCountUp(live.units, countersEnabled);
  const distanceCount = useCountUp(live.km, countersEnabled);
  const urgentCount = useCountUp(live.urgent, countersEnabled);

  const story = useMemo(() => {
    if (storyStage === 'detect') {
      return {
        step: '01',
        eyebrow: 'Urgent signal detected',
        title: `${leadRoute.to.county} supply gap`,
        body: `${leadRoute.to.org} reports an urgent need for ${leadRoute.qty} units of ${leadRoute.item.toLowerCase()}. The signal is isolated before any route is proposed.`,
      };
    }
    if (storyStage === 'rank') {
      return {
        step: '02',
        eyebrow: 'Geospatial ranking',
        title: `${FACILITIES.filter((node) => node.role === 'hub').length} hubs evaluated`,
        body: 'MediMatch compares category fit, usable quantity, verification status and transfer distance. The coordinator can see why one source ranks above the alternatives.',
      };
    }
    if (storyStage === 'route') {
      return {
        step: '03',
        eyebrow: 'Coordinator-ready route',
        title: `${leadRoute.from.county} → ${leadRoute.to.county}`,
        body: `${leadRoute.from.org} can cover the full need. The proposed ${leadRoute.distance_km} km movement remains subject to stock, cold-chain and logistics confirmation.`,
      };
    }
    return {
      step: '04',
      eyebrow: 'National network impact',
      title: `${live.facilities} facilities addressed`,
      body: `${live.units.toLocaleString()} synthetic units coordinated across ${live.km.toLocaleString()} route kilometres. No transfer is autonomous; a human coordinator verifies every move.`,
    };
  }, [leadRoute, live, storyStage]);

  function travelerPosition(route: Route): [number, number] | null {
    const value = progress[route.id];
    if (value == null) return null;
    const index = Math.min(route.geometry.length - 1, Math.floor(value * (route.geometry.length - 1)));
    return route.geometry[index];
  }

  function visibleGeometry(route: Route) {
    const value = progress[route.id] || 0;
    if (delivered.includes(route.id)) return route.geometry;
    const end = Math.max(2, Math.ceil(value * route.geometry.length));
    return route.geometry.slice(0, end);
  }

  return (
    <div className="command-map">
      <MapContainer
        center={[0.2, 37.9]}
        zoom={6}
        zoomControl={false}
        attributionControl={false}
        preferCanvas
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <FitKenya />
        <MapDirector stage={storyStage} route={leadRoute} candidates={rankings.map((item) => item.node)} />
        <Polygon
          positions={KENYA_OUTLINE}
          pathOptions={{
            color: '#5a9aac',
            weight: 1.3,
            opacity: 0.86,
            fillColor: '#0b2a35',
            fillOpacity: 0.13,
            dashArray: '4 5',
          }}
        />

        {ROUTES.filter((route) => activeIds.includes(route.id)).map((route) => {
          const selected = route.id === leadRoute.id;
          const complete = delivered.includes(route.id);
          const traveler = travelerPosition(route);
          const color = route.urgent ? COLORS.routeUrgent : COLORS.route;
          return (
            <React.Fragment key={route.id}>
              <Polyline
                positions={visibleGeometry(route)}
                pathOptions={{
                  color,
                  weight: selected ? 3.1 : 1.25,
                  opacity: selected ? 0.96 : complete ? 0.34 : 0.58,
                  className: selected ? 'mm-primary-route' : undefined,
                }}
              />
              {traveler && !complete && (
                <CircleMarker
                  center={traveler}
                  radius={3.5}
                  pathOptions={{ color: '#fff', weight: 1.2, fillColor: color, fillOpacity: 1, className: 'mm-traveler' }}
                />
              )}
            </React.Fragment>
          );
        })}

        <CircleMarker
          center={[leadRoute.to.lat, leadRoute.to.lon]}
          radius={storyStage === 'detect' ? 10 : 9}
          pathOptions={{ color: COLORS.need, weight: 1.35, fillOpacity: 0, opacity: 0.9, dashArray: '3 4', className: 'mm-focus-ring' }}
        />
        {storyStage !== 'detect' && (
          <CircleMarker
            center={[leadRoute.from.lat, leadRoute.from.lon]}
            radius={9}
            pathOptions={{ color: COLORS.hub, weight: 1.35, fillOpacity: 0, opacity: 0.9, dashArray: '3 4', className: 'mm-focus-ring' }}
          />
        )}

        {FACILITIES.map((node) => {
          const isLeadNeed = node.id === leadRoute.to.id;
          const isLeadSource = node.id === leadRoute.from.id;
          const isRankedHub = rankings.some((candidate) => candidate.node.id === node.id);
          const served = delivered.some((id) => ROUTES.find((route) => route.id === id)?.to.id === node.id);
          const color = node.role === 'hub' ? COLORS.hub : COLORS.need;
          const visibility = storyStage === 'detect'
            ? isLeadNeed ? 1 : 0.1
            : storyStage === 'rank'
              ? (isLeadNeed || isRankedHub) ? 0.94 : 0.12
              : storyStage === 'route'
                ? (isLeadNeed || isLeadSource) ? 1 : 0.18
                : 0.76;
          const radius = Math.min(7.2, node.urgent ? 6.2 : node.role === 'hub' ? 5.5 : 4.8);
          const showLabel = isLeadNeed || (isLeadSource && storyStage !== 'detect');
          return (
            <CircleMarker
              key={node.id}
              center={[node.lat, node.lon]}
              radius={radius}
              pathOptions={{
                color: served ? '#fff' : color,
                weight: served ? 2 : 1.25,
                fillColor: color,
                fillOpacity: visibility,
                opacity: Math.min(1, visibility + 0.1),
                className: isLeadNeed ? 'mm-critical-node' : undefined,
              }}
            >
              {showLabel && (
                <Tooltip permanent direction={isLeadNeed ? 'right' : 'left'} offset={isLeadNeed ? [8, 0] : [-8, 0]} opacity={1} className="mm-node-label">
                  <strong>{node.county}</strong>
                  <span>{node.role === 'hub' ? 'Selected supply hub' : `${leadRoute.qty} ${leadRoute.item.toLowerCase()} needed`}</span>
                </Tooltip>
              )}
              {!showLabel && (
                <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                  <strong>{node.org_name}</strong>
                  <span>{node.county} County · {node.role === 'hub' ? `${node.surplusUnits} units surplus` : `${node.needUnits} units needed`}</span>
                </Tooltip>
              )}
            </CircleMarker>
          );
        })}
      </MapContainer>

      {showPrelude && (
        <section className="command-prelude">
          <div className="prelude-brand"><i /> MediMatch · A Lesnar AI Development</div>
          <h1>See surplus.<br />Detect need.<br /><em>Coordinate impact.</em></h1>
          <p>A national operating picture for medical supply redistribution across Kenya.</p>
          <div className="prelude-signal">
            <span>{FACILITIES.length} facilities connected</span>
            <span>{ROUTES.length} transfers ready to rank</span>
          </div>
        </section>
      )}

      <header className="command-title">
        <div className="command-title-row">
          <span className="command-live-dot" />
          <strong>MediMatch</strong>
          <span>National Redistribution Command</span>
        </div>
        <p>Geospatial redistribution intelligence for public-health supply coordination across Kenya</p>
        <nav>
          <a href="/platform">Platform</a>
          <a href="/listings">Listings</a>
          <a href="/login">Coordinator login</a>
        </nav>
      </header>

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

      {(storyStage === 'rank' || storyStage === 'route') && (
        <section className={`command-decision decision-${storyStage}`}>
          <div className="decision-heading">
            <span>{storyStage === 'rank' ? 'Ranked source options' : 'Selected coordination path'}</span>
            <b>{storyStage === 'rank' ? 'Explainable score' : '96 priority score'}</b>
          </div>
          <div className="candidate-list">
            {rankings.map((candidate, index) => (
              <div key={candidate.node.id} className={candidate.node.id === leadRoute.from.id ? 'selected' : ''}>
                <em>0{index + 1}</em>
                <p>
                  <strong>{candidate.node.org_name}</strong>
                  <small>{candidate.node.county} · {candidate.distance} km direct</small>
                </p>
                <b>{candidate.score}</b>
              </div>
            ))}
          </div>
          <div className="decision-why">
            <strong>Why this match?</strong>
            <p>Full quantity coverage, verified referral hub, compatible equipment and the shortest viable coordination path.</p>
            <div>
              <span>100% category fit</span>
              <span>{leadRoute.qty}/{leadRoute.qty} units</span>
              <span>{leadRoute.eta_hr} h estimate</span>
            </div>
          </div>
        </section>
      )}

      <aside className="command-hud">
        <span className="hud-kicker">Live coordination impact</span>
        <div className="hud-metrics">
          <Metric label="Facilities served" value={facilitiesCount} />
          <Metric label="Units routed" value={unitsCount.toLocaleString()} />
          <Metric label="Route kilometres" value={distanceCount.toLocaleString()} />
          <Metric label="Urgent needs addressed" value={urgentCount} accent={COLORS.need} />
        </div>
        <div className="hud-controls">
          <button onClick={() => beginStory()} disabled={phase === 'running'}>
            {phase === 'running' ? 'Story in progress' : 'Replay story'}
          </button>
          <button className="ghost" onClick={revealImpact}>Show impact</button>
        </div>
        <button
          className={`autoplay-toggle ${autoDemo ? 'active' : ''}`}
          onClick={() => setAutoDemo((current) => !current)}
        >
          <i /> {autoDemo ? 'Auto-play enabled' : 'Auto-play paused'}
        </button>
        <div className="command-brief">
          <span>AI-assisted coordinator brief</span>
          <strong>{leadRoute.from.county} → {leadRoute.to.county}</strong>
          <p>Prioritize {leadRoute.qty} units of {leadRoute.item.toLowerCase()}. Confirm stock, packaging and transport before coordination.</p>
        </div>
        <div className="scenario-switcher">
          <span>Urgent scenarios</span>
          <div>
            {urgentRoutes.map((route) => (
              <button
                key={route.id}
                className={route.id === leadRoute.id ? 'active' : ''}
                onClick={() => selectScenario(route)}
                title={`${route.item}: ${route.from.county} to ${route.to.county}`}
              >
                <i>{route.to.county.slice(0, 2).toUpperCase()}</i>
                <small>{route.item}</small>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="command-legend">
        <Legend color={COLORS.hub} label="Surplus hub" />
        <Legend color={COLORS.need} label="Urgent need" />
        <Legend color={COLORS.route} label="Coordinated route" />
      </div>

      <div className={`command-platform-strip ${storyStage === 'impact' ? 'revealed' : ''}`}>
        <strong>National deployment layer</strong>
        <div>
          <span><i /> Demand visibility</span>
          <span><i /> Explainable ranking</span>
          <span><i /> Human verification</span>
          <span><i /> Integration-ready</span>
        </div>
        <small>Public facility names and approximate geocodes. Synthetic inventory and need data. No patient records.</small>
      </div>

      {storyStage === 'impact' && (
        <div className="impact-watermark">
          <span>{IMPACT.units.toLocaleString()}</span>
          <strong>units repositioned</strong>
          <small>across {IMPACT.facilities} facilities · {IMPACT.hubs} supply hubs</small>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div>
      <strong style={{ color: accent || '#effff9' }}>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div>
      <i style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}
