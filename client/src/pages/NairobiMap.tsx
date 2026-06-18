import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/* A real, rotatable 3D map of Nairobi (CARTO dark vector basemap with building
 * extrusions) overlaid with MediMatch facilities and live supply flows. Drag to
 * pan, right-drag / ctrl-drag to rotate & tilt, scroll to zoom, click a facility
 * to inspect it. */

type N = { id: number; org_name: string; county: string; lat: number; lon: number; role: 'hub' | 'need' | 'mixed'; surplusUnits: number; needUnits: number; urgent: boolean };
type R = { id: number; urgent: boolean; geometry?: [number, number][]; from: { id: number; lat: number; lon: number }; to: { id: number; lat: number; lon: number } };

const STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const colorFor = (n: N) => (n.role === 'hub' ? '#37c07e' : n.role === 'mixed' ? '#f5c451' : n.urgent ? '#e8703c' : '#f25555');

export default function NairobiMap({ nodes, routes, selectedId, onSelect }: { nodes: N[]; routes: R[]; selectedId: number | null; onSelect: (n: N) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const nodesRef = useRef(nodes); nodesRef.current = nodes;
  const onSelectRef = useRef(onSelect); onSelectRef.current = onSelect;

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: STYLE,
      center: [36.82, -1.286],
      zoom: 10.4,
      pitch: 55,
      bearing: -17,
      antialias: true,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-left');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.dragRotate.enable();
    map.touchZoomRotate.enableRotation();

    const fac = {
      type: 'FeatureCollection' as const,
      features: nodes.map((n) => ({
        type: 'Feature' as const,
        properties: { id: n.id, name: n.org_name, color: colorFor(n), units: Math.max(n.surplusUnits, n.needUnits), hub: n.role === 'hub' ? 1 : 0 },
        geometry: { type: 'Point' as const, coordinates: [n.lon, n.lat] },
      })),
    };
    const flows = {
      type: 'FeatureCollection' as const,
      features: routes.map((r) => ({
        type: 'Feature' as const,
        properties: { urgent: r.urgent ? 1 : 0 },
        geometry: { type: 'LineString' as const, coordinates: (r.geometry && r.geometry.length > 1 ? r.geometry.map((p) => [p[1], p[0]]) : [[r.from.lon, r.from.lat], [r.to.lon, r.to.lat]]) },
      })),
    };

    map.on('load', () => {
      // 3D buildings
      try {
        map.addLayer({
          id: 'mm-buildings', source: 'carto', 'source-layer': 'building', type: 'fill-extrusion', minzoom: 12,
          paint: {
            'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 8], 0, '#16233c', 60, '#22324f'],
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.75,
          },
        });
      } catch { /* style may lack building data */ }

      map.addSource('flows', { type: 'geojson', data: flows as any });
      map.addLayer({ id: 'flows-glow', type: 'line', source: 'flows', layout: { 'line-cap': 'round' }, paint: { 'line-color': ['case', ['==', ['get', 'urgent'], 1], '#e8703c', '#37c07e'], 'line-width': 6, 'line-opacity': 0.18, 'line-blur': 4 } });
      map.addLayer({ id: 'flows', type: 'line', source: 'flows', layout: { 'line-cap': 'round' }, paint: { 'line-color': ['case', ['==', ['get', 'urgent'], 1], '#e8703c', '#37c07e'], 'line-width': 2, 'line-opacity': 0.85 } });

      map.addSource('fac', { type: 'geojson', data: fac as any });
      map.addLayer({ id: 'fac-glow', type: 'circle', source: 'fac', paint: { 'circle-radius': ['interpolate', ['linear'], ['get', 'units'], 0, 9, 250, 26], 'circle-color': ['get', 'color'], 'circle-blur': 1, 'circle-opacity': 0.35 } });
      map.addLayer({ id: 'fac-sel', type: 'circle', source: 'fac', filter: ['==', ['get', 'id'], -1], paint: { 'circle-radius': 16, 'circle-color': 'transparent', 'circle-stroke-color': '#f8d27a', 'circle-stroke-width': 2.5 } });
      map.addLayer({ id: 'fac', type: 'circle', source: 'fac', paint: { 'circle-radius': ['interpolate', ['linear'], ['get', 'units'], 0, 4.5, 250, 11], 'circle-color': ['get', 'color'], 'circle-stroke-color': '#0b1120', 'circle-stroke-width': 1.6 } });
      map.addLayer({ id: 'fac-label', type: 'symbol', source: 'fac', layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'], 'text-optional': true }, paint: { 'text-color': '#f4ead6', 'text-halo-color': '#0b1120', 'text-halo-width': 1.4 } });

      map.on('click', 'fac', (e) => {
        const id = e.features?.[0]?.properties?.id;
        const n = nodesRef.current.find((x) => x.id === id);
        if (n) onSelectRef.current(n);
      });
      map.on('mouseenter', 'fac', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'fac', () => { map.getCanvas().style.cursor = ''; });
    });

    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // highlight the selected facility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer('fac-sel')) return;
    map.setFilter('fac-sel', ['==', ['get', 'id'], selectedId ?? -1]);
  }, [selectedId]);

  return <div className="sv-nmap" ref={ref} />;
}
