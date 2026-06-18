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
        const res = await API.get(`/listings/${id}`);
        if (!cancelled) {
          if (res.data) {
            setListing(res.data);
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
      <div className="card">
        <div className="skeleton" style={{ width: '40%', height: 24, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: '90%', height: 16, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: '65%', height: 16 }} />
      </div>
    );
  }

  if (error) {
    return <div className="card text-danger">{error}</div>;
  }

  if (!listing) {
    return <div className="card">Listing not found.</div>;
  }

  const coords = extractLatLon(listing.location_wkt || listing.location);

  const l = listing as any;
  const ownerName = l.owner_name || l.owner_email || 'Unknown';

  return (
    <div>
      <div className="hero bg-image" style={{ marginBottom: 20, ['--hero-bg' as any]: 'url(/images/pic-5.jpg)' }}>
        <div className="hero-copy glass-card">
          <div className="brand-accent" />
          <div className="heading" style={{ marginTop: 0 }}>{listing.title}</div>
          <div className="muted">
            {listing.category && <span style={{ textTransform: 'capitalize' }}>{listing.category}</span>}
            {listing.created_at && <span> · Posted {new Date(listing.created_at).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' })}</span>}
          </div>
        </div>
      </div>
      <div className="card">
        {/* Chips row */}
        <div className="chips" style={{ marginBottom: 16 }}>
          <span className="chip"><span className="dot" /> Qty: {listing.quantity || 1}</span>
          {listing.category && <span className="chip"><span className="dot" />{listing.category}</span>}
          {l.is_urgent && <span className="badge" style={{ background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff' }}>URGENT</span>}
          {l.org_verified && <span className="badge" style={{ background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff' }}>✓ Verified</span>}
        </div>

        {/* Description */}
        <p style={{ fontSize:'1rem', lineHeight:1.6, marginBottom: 16 }}>{listing.description || 'No description provided.'}</p>

        {/* Owner info */}
        {l.owner_id && (
          <div className="card" style={{ marginBottom: 16, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <div>
              <div className="muted-small" style={{ marginBottom: 2 }}>Posted by</div>
              <strong>{ownerName}</strong>
              {l.org_name && <div className="muted-small">{l.org_name}{l.org_type ? ` · ${l.org_type}` : ''}</div>}
              {l.average_rating > 0 && (
                <div className="muted-small" style={{ marginTop: 4 }}>
                  ⭐ {parseFloat(l.average_rating).toFixed(1)} ({l.total_ratings} review{l.total_ratings !== 1 ? 's' : ''})
                </div>
              )}
            </div>
            {user && user.id !== l.owner_id && (
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-primary" onClick={() => setChatOpen({ otherUserId: l.owner_id, otherUserName: ownerName, listingId: listing.id })}>Message</button>
                <button className="btn btn-outline" onClick={() => setRatingOpen({ userId: l.owner_id, userName: ownerName, listingId: listing.id })}>Rate</button>
              </div>
            )}
          </div>
        )}

        {/* Location */}
        {coords.lat != null && coords.lon != null && (
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <button className="btn btn-primary" onClick={() => setMapOpen({ lat: coords.lat!, lon: coords.lon!, title: listing.title })}>
              View on Map
            </button>
            <span className="muted-small">Location available</span>
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
