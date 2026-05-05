import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import API from '../services/api';
import MapModal from '../components/MapModal';
import ChatModal from '../components/ChatModal';
import RatingModal from '../components/RatingModal';
import { useAuth } from '../context/AuthContext';

type Listing = {
  id: number;
  title: string;
  description?: string | null;
  quantity?: number;
  created_at?: string;
  location_wkt?: string;
  location?: { lat: number; lon: number } | string;
  category?: string;
};

function extractLatLon(val: any): { lat?: number; lon?: number } {
  if (!val) return {};
  if (typeof val === 'object' && val.lat != null && val.lon != null) {
    return { lat: Number(val.lat), lon: Number(val.lon) };
  }
  const s = String(val);
  const m = s.match(/POINT\(([-\d\.]+)\s+([-\d\.]+)\)/i);
  if (m) { const lon = Number(m[1]); const lat = Number(m[2]); return { lat, lon }; }
  return {};
}

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState<{lat:number; lon:number; title?:string} | null>(null);
  const { user } = useAuth();
  const [chatOpen, setChatOpen] = useState<{ otherUserId: number; otherUserName: string; listingId?: number } | null>(null);
  const [ratingOpen, setRatingOpen] = useState<{ userId: number; userName: string; listingId?: number } | null>(null);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await API.get(`/listings?id=eq.${id}&select=*`);
        if (!cancelled) {
          if (res.data && res.data.length > 0) {
            setListing(res.data[0]);
          } else {
            setError('Listing not found');
          }
        }
      } catch (e: any) {
        if (!cancelled) setError('Failed to load listing');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <div className="skeleton" style={{ width: '40%', height: 24, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: '90%', height: 16, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '65%', height: 16 }} />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="container"><div className="card text-danger">{error}</div></div>;
  }

  if (!listing) {
    return <div className="container"><div className="card">Listing not found.</div></div>;
  }

  const coords = extractLatLon(listing.location_wkt || listing.location);

  return (
    <div className="container">
      <div className="hero bg-image" style={{ marginBottom: 12, ['--hero-bg' as any]: 'url(/images/pic-5.jpg)' }}>
        <div className="hero-copy glass-card">
          <div className="heading" style={{ marginTop: 0 }}>Listing</div>
          <div className="muted" style={{ maxWidth: 640 }}>Details, quantity, and location for this item.</div>
        </div>
      </div>
      <div className="card">
        <h1 className="heading">{listing.title}</h1>
        <div className="muted" style={{ marginBottom: 16 }}>
          Posted on: {listing.created_at ? new Date(listing.created_at).toLocaleString() : 'N/A'}
        </div>

        <p>{listing.description || 'No description provided.'}</p>

        <div className="chips" style={{ marginBottom: 16 }}>
          <span className="chip"><span className="dot" /> Quantity: {listing.quantity || 1}</span>
          {listing.category && <span className="chip"><span className="dot" /> Category: {listing.category}</span>}
        </div>

        {coords.lat != null && coords.lon != null && (
          <div>
            <h2 className="heading" style={{ fontSize: '1.25rem', marginTop: 24 }}>Location</h2>
            <p className="muted">
              Latitude: {coords.lat}, Longitude: {coords.lon}
            </p>
            <button className="btn btn-outline" onClick={() => setMapOpen({ lat: coords.lat!, lon: coords.lon!, title: listing.title })}>
              View on Map
            </button>
          </div>
        )}
        {(listing as any).owner_id && user && user.id !== (listing as any).owner_id && (
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => setChatOpen({ otherUserId: (listing as any).owner_id, otherUserName: (listing as any).owner_name || (listing as any).owner_email || 'User', listingId: listing.id })}>Message owner</button>
            <button className="btn btn-outline" onClick={() => setRatingOpen({ userId: (listing as any).owner_id, userName: (listing as any).owner_name || (listing as any).owner_email || 'User', listingId: listing.id })}>Rate owner</button>
          </div>
        )}
      </div>
      {mapOpen && (
        <MapModal lat={mapOpen.lat} lon={mapOpen.lon} title={mapOpen.title} onClose={() => setMapOpen(null)} />
      )}
      {chatOpen && (
        <ChatModal
          otherUserId={chatOpen.otherUserId}
          otherUserName={chatOpen.otherUserName}
          listingId={chatOpen.listingId}
          onClose={() => setChatOpen(null)}
        />
      )}
      {ratingOpen && (
        <RatingModal
          userId={ratingOpen.userId}
          userName={ratingOpen.userName}
          listingId={ratingOpen.listingId}
          onClose={() => setRatingOpen(null)}
        />
      )}
    </div>
  );
}
