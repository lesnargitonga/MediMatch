import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import KENYA from '../data/kenya';

/* A real, rotatable map of Kenya (CARTO dark vector basemap) overlaid with every
 * MediMatch facility and live road-routed supply flow. The headline national
 * command surface — replaces the hand-drawn silhouette. */

type N = { id: number; org_name: string; county: string; lat: number; lon: number; role: 'hub' | 'need' | 'mixed'; surplusUnits: number; needUnits: number; urgent: boolean };
type R = { id: number; urgent: boolean; item?: string; geometry?: [number, number][]; from: { id: number; lat: number; lon: number }; to: { id: number; lat: number; lon: number } };

const STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const colorFor = (n: N) => (n.role === 'hub' ? '#37c07e' : n.role === 'mixed' ? '#f5c451' : n.urgent ? '#e8703c' : '#f25555');

export default function NationalMap({ nodes, routes, leadId, onSelectRoute }: { nodes: N[]; routes: R[]; leadId: number | null; onSelectRoute: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onSelRef = useRef(onSelectRoute); onSelRef.current = onSelectRoute;
  const routesRef = useRef(routes); routesRef.current = routes;

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current, style: STYLE,
      center: [37.9, 0.4], zoom: 5.4, pitch: 32, bearing: -8,
      antialias: true, attributionControl: false, dragRotate: true,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    const fac = {
      type: 'FeatureCollection' as const,
      features: nodes.map((n) => ({
        type: 'Feature' as const,
        properties: { id: n.id, name: n.org_name, county: n.county, color: colorFor(n), units: Math.max(n.surplusUnits, n.needUnits), need: n.needUnits, hub: n.role === 'hub' ? 1 : 0, urgent: n.urgent ? 1 : 0 },
        geometry: { type: 'Point' as const, coordinates: [n.lon, n.lat] },
      })),
    };
    const flowFeats = (rs: R[]) => rs.map((r) => ({
      type: 'Feature' as const,
      properties: { id: r.id, urgent: r.urgent ? 1 : 0 },
      geometry: { type: 'LineString' as const, coordinates: (r.geometry && r.geometry.length > 1 ? r.geometry.map((p) => [p[1], p[0]]) : [[r.from.lon, r.from.lat], [r.to.lon, r.to.lat]]) },
    }));

    map.on('load', () => {
      // Kenya highlight — glowing fill + border
      map.addSource('kenya', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [KENYA] } } as any });
      map.addLayer({ id: 'kenya-fill', type: 'fill', source: 'kenya', paint: { 'fill-color': '#f0b32e', 'fill-opacity': 0.05 } });
      map.addLayer({ id: 'kenya-line', type: 'line', source: 'kenya', paint: { 'line-color': '#f8d27a', 'line-width': 2, 'line-opacity': 0.55, 'line-blur': 0.4 } });

      // Demand heatmap (need facilities weighted by shortfall) — hidden by default
      map.addLayer({
        id: 'heat', type: 'heatmap', source: 'fac', layout: { visibility: 'none' },
        filter: ['>', ['get', 'need'], 0],
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'need'], 0, 0.2, 400, 1],
          'heatmap-intensity': 1.1,
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 18, 8, 48],
          'heatmap-opacity': 0.75,
          'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)', 0.2, 'rgba(55,192,126,0.5)', 0.5, 'rgba(245,196,81,0.7)', 0.8, 'rgba(232,112,60,0.85)', 1, 'rgba(242,85,85,0.95)'],
        },
      });

      map.addSource('flows', { type: 'geojson', data: { type: 'FeatureCollection', features: flowFeats(routes) } as any });
      map.addLayer({ id: 'flows-glow', type: 'line', source: 'flows', layout: { 'line-cap': 'round' }, paint: { 'line-color': ['case', ['==', ['get', 'urgent'], 1], '#e8703c', '#37c07e'], 'line-width': 6, 'line-opacity': 0.12, 'line-blur': 4 } });
      map.addLayer({ id: 'flows', type: 'line', source: 'flows', layout: { 'line-cap': 'round' }, paint: { 'line-color': ['case', ['==', ['get', 'urgent'], 1], '#e8703c', '#37c07e'], 'line-width': 1.6, 'line-opacity': 0.6 } });
      map.addLayer({ id: 'flows-lead', type: 'line', source: 'flows', filter: ['==', ['get', 'id'], leadId ?? -1], layout: { 'line-cap': 'round' }, paint: { 'line-color': '#f8d27a', 'line-width': 3.4, 'line-opacity': 0.95 } });

      map.addSource('fac', { type: 'geojson', data: fac as any });
      map.addLayer({ id: 'fac-glow', type: 'circle', source: 'fac', paint: { 'circle-radius': ['interpolate', ['linear'], ['get', 'units'], 0, 7, 800, 26], 'circle-color': ['get', 'color'], 'circle-blur': 1, 'circle-opacity': 0.35 } });
      map.addLayer({ id: 'fac', type: 'circle', source: 'fac', paint: { 'circle-radius': ['interpolate', ['linear'], ['get', 'units'], 0, 3.5, 800, 9], 'circle-color': ['get', 'color'], 'circle-stroke-color': '#0b1120', 'circle-stroke-width': 1.2 } });
      map.addLayer({ id: 'fac-label', type: 'symbol', source: 'fac', minzoom: 6.2, filter: ['==', ['get', 'hub'], 1], layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'], 'text-optional': true }, paint: { 'text-color': '#f4ead6', 'text-halo-color': '#0b1120', 'text-halo-width': 1.4 } });

      const pick = (e: any) => {
        const f = e.features?.[0]; if (!f) return;
        let rid = f.properties?.id;
        if (f.layer.id === 'fac') {
          const r = routesRef.current.find((x) => x.to.id === rid || x.from.id === rid);
          rid = r?.id;
        }
        if (rid != null) onSelRef.current(rid);
      };
      map.on('click', 'fac', pick);
      map.on('click', 'flows', pick);
      for (const id of ['fac', 'flows']) {
        map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
      }
    });

    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refresh data when the plan upgrades (road geometry) or routes change
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const apply = () => {
      const src = map.getSource('flows') as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData({ type: 'FeatureCollection', features: routes.map((r) => ({ type: 'Feature', properties: { id: r.id, urgent: r.urgent ? 1 : 0 }, geometry: { type: 'LineString', coordinates: (r.geometry && r.geometry.length > 1 ? r.geometry.map((p) => [p[1], p[0]]) : [[r.from.lon, r.from.lat], [r.to.lon, r.to.lat]]) } })) } as any);
    };
    if (map.isStyleLoaded()) apply(); else map.once('idle', apply);
  }, [routes]);

  // highlight the lead route — keep the stable national overview (no dive-in)
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const apply = () => {
      if (map.getLayer('flows-lead')) map.setFilter('flows-lead', ['==', ['get', 'id'], leadId ?? -1]);
    };
    if (map.isStyleLoaded()) apply(); else map.once('idle', apply);
  }, [leadId]);

  // toggle the demand heatmap
  const [heat, setHeat] = useState(false);
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const apply = () => { if (map.getLayer('heat')) map.setLayoutProperty('heat', 'visibility', heat ? 'visible' : 'none'); };
    if (map.isStyleLoaded()) apply(); else map.once('idle', apply);
  }, [heat]);

  return (
    <div className="sv-natmap" ref={ref}>
      <button className={`sv-natmap-heat${heat ? ' on' : ''}`} onClick={() => setHeat((h) => !h)}>
        <span className="dot" /> Demand heatmap
      </button>
    </div>
  );
}
