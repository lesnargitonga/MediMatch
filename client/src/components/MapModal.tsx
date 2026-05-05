import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icon paths in Vite
// @ts-ignore
delete (L.Icon.Default as any).prototype._getIconUrl;
(L.Icon.Default as any).mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type Props = {
  lat: number;
  lon: number;
  title?: string;
  onClose: () => void;
};

export default function MapModal({ lat, lon, title, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" style={styles.backdrop}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <strong>{title || 'Location'}</strong>
          <button className="btn btn-secondary on-image" onClick={onClose}>Close</button>
        </div>
        <div style={{ height: 360, borderRadius: 8, overflow: 'hidden' }}>
          <MapContainer center={[lat, lon]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            <Marker position={[lat, lon]}>
              <Popup>{title || 'Location'}</Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 },
  modal: { background: 'var(--surface)', color: 'var(--text)', borderRadius: 12, padding: 12, maxWidth: 720, width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', border: '1px solid var(--card-border)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
};
