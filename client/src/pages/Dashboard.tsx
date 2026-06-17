import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import API from '../services/api';
import MapModal from '../components/MapModal';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import ChatModal from '../components/ChatModal';
import RatingModal from '../components/RatingModal';
import AICoordinatorBrief from '../components/AICoordinatorBrief';
import AIExplanation from '../components/AIExplanation';
import AICompletenessCheck from '../components/AICompletenessCheck';
import AI from '../services/ai';
import { useDebounce } from 'use-debounce';

// Local Listing type to avoid cross-package path issues in this minimal scaffold
type Listing = {
  id: number;
  title: string;
  description?: string | null;
  quantity?: number;
  category?: string;
  is_urgent?: boolean;
  created_at?: string;
  location_wkt?: string;
  location?: { lat: number; lon: number } | string;
  owner_id?: number;
  owner_name?: string;
  owner_email?: string;
  org_name?: string;
  org_verified?: boolean;
  average_rating?: number;
  total_ratings?: number;
};

const LISTING_CATEGORIES = ['general', 'medication', 'equipment', 'supplies', 'other'] as const;
type ListingCategory = typeof LISTING_CATEGORIES[number];

const DEMO_COORDS = { lat: -1.286389, lon: 36.817223 };
const DEMO_LOCATIONS = [
  { label: 'Kenyatta National Hospital', detail: 'Upper Hill supply hub', lat: -1.3018, lon: 36.8073 },
  { label: 'Kibera South Health Centre', detail: 'Urgent community care need', lat: -1.3151, lon: 36.7858 },
  { label: 'Mbagathi County Hospital', detail: 'Available equipment site', lat: -1.3088, lon: 36.8099 },
  { label: 'Mama Lucy Kibaki Hospital', detail: 'Verified county facility', lat: -1.2617, lon: 36.8944 },
  { label: 'Mathare North Health Centre', detail: 'High-priority medication need', lat: -1.2522, lon: 36.8648 },
  { label: 'Nairobi County Operations Center', detail: 'Demo coordinator point', lat: DEMO_COORDS.lat, lon: DEMO_COORDS.lon },
];

const DEMO_MAP_LISTINGS: Listing[] = [
  {
    id: -101,
    title: 'Surplus nitrile gloves',
    description: '800 nitrile gloves, unopened, stored appropriately. Available for same-day transfer.',
    quantity: 800,
    category: 'supplies',
    is_urgent: false,
    org_name: 'Kenyatta National Hospital',
    org_verified: true,
    location_wkt: 'POINT(36.8073 -1.3018)',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: -102,
    title: 'Urgent wound-care supplies needed',
    description: 'Urgent shortage: dressings, bandages, wound-care consumables. 120 units needed immediately.',
    quantity: 120,
    category: 'supplies',
    is_urgent: true,
    org_name: 'Kibera South Health Centre',
    org_verified: false,
    location_wkt: 'POINT(36.7858 -1.3151)',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: -103,
    title: 'Portable oxygen concentrator available',
    description: '2 portable oxygen concentrators, functional, available for short-term facility transfer.',
    quantity: 2,
    category: 'equipment',
    is_urgent: false,
    org_name: 'Mbagathi County Hospital',
    org_verified: true,
    location_wkt: 'POINT(36.8099 -1.3088)',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: -104,
    title: 'Emergency medication stock request',
    description: 'Critical medication stock depletion. 60 units needed within 24 hours. Verified county facility.',
    quantity: 60,
    category: 'medication',
    is_urgent: true,
    org_name: 'Mama Lucy Kibaki Hospital',
    org_verified: true,
    location_wkt: 'POINT(36.8944 -1.2617)',
    created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
];

function demoMatchRecommendations() {
  const scores = [0.78, 0.92, 0.74, 0.88];
  const distances = [2.8, 3.4, 2.2, 9.1];
  return DEMO_MAP_LISTINGS
    .map((listing, index) => ({
      ...listing,
      owner_name: listing.org_name || 'Demo facility',
      org_verified: listing.org_verified ?? false,
      average_rating: listing.org_verified ? 4.8 : 4.1,
      total_ratings: listing.org_verified ? 18 : 5,
      distance_km: distances[index] ?? 4.5,
      score: scores[index] ?? 0.72,
      c_distance: index === 3 ? 0.72 : 0.92,
      c_urgency: listing.is_urgent ? 1 : 0,
      c_reputation: listing.org_verified ? 0.86 : 0.58,
      c_recency: index === 1 ? 0.98 : 0.82,
      c_verified: listing.org_verified ? 1 : 0,
      c_category: listing.category === 'supplies' ? 1 : 0.35,
      c_quantity: Math.min(1, (listing.quantity || 1) / 100),
    }))
    .sort((a, b) => b.score - a.score);
}

export default function Dashboard() {
  const location = useLocation();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [tab, setTab] = useState<'overview'|'create'|'browse'|'suggested'|'map'|'messages'|'account'|'admin'>('overview');
  const { user } = useAuth();
  const role = user?.role;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [category, setCategory] = useState<ListingCategory>('general');
  const [isUrgent, setIsUrgent] = useState(false);
  const [lat, setLat] = useState<string>('');
  const [lon, setLon] = useState<string>('');
  const [locationQuery, setLocationQuery] = useState('');
  const [debouncedLocationQuery] = useDebounce(locationQuery, 500);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  // Recommendations — seed with demo data immediately so the tab never shows empty
  const [recs, setRecs] = useState<any[]>(() => demoMatchRecommendations());
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recCategory, setRecCategory] = useState<string>('all');
  const [recRadius, setRecRadius] = useState<number>(50);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{title?:string; lat?:string; lon?:string}>({});
  const [userCoords, setUserCoords] = useState<{lat:number; lon:number} | null>(DEMO_COORDS);
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'nearest'>('newest');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [distanceFilter, setDistanceFilter] = useState<number>(999999); // km, default unlimited
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [favorites, setFavorites] = useState<number[]>(() => {
    try { const raw = localStorage.getItem('favorites'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [chatOpen, setChatOpen] = useState<{ otherUserId: number; otherUserName: string; listingId?: number } | null>(null);
  const [ratingOpen, setRatingOpen] = useState<{ userId: number; userName: string; listingId?: number } | null>(null);

  function saveFavorites(next: number[]) { setFavorites(next); localStorage.setItem('favorites', JSON.stringify(next)); }
  function toggleFavorite(id: number) {
    if (favorites.includes(id)) saveFavorites(favorites.filter(x => x !== id));
    else saveFavorites([...favorites, id]);
  }
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
  function haversineKm(a: {lat:number; lon:number}, b: {lat:number; lon:number}) {
    const toRad = (d:number)=>d*Math.PI/180;
    const R = 6371;
    const dLat = toRad(b.lat-a.lat); const dLon = toRad(b.lon-a.lon);
    const s1 = Math.sin(dLat/2), s2 = Math.sin(dLon/2);
    const aa = s1*s1 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*s2*s2;
    const c = 2*Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
    return R*c;
  }
  function applyDemoLocation(place: typeof DEMO_LOCATIONS[number]) {
    setLat(String(place.lat));
    setLon(String(place.lon));
    setLocationQuery(`${place.label} - ${place.detail}`);
    setSuggestions([]);
    setFieldErrors(prev => ({ ...prev, lat: undefined, lon: undefined }));
  }
  const [mapOpen, setMapOpen] = useState<{lat:number; lon:number; title?:string} | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const demoTab = params.get('demoTab');
    if (demoTab && ['overview','create','browse','suggested','map','messages','account','admin'].includes(demoTab)) {
      setTab(demoTab as any);
    }
  }, [location.search]);

  useEffect(() => {
    const query = debouncedLocationQuery.trim().toLowerCase();
    if (!query) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setIsSuggestionsLoading(true);
      const localMatches = DEMO_LOCATIONS
        .filter(place => `${place.label} ${place.detail}`.toLowerCase().includes(query))
        .map(place => ({
          place_id: `demo-${place.label}`,
          lat: String(place.lat),
          lon: String(place.lon),
          display_name: `${place.label} - ${place.detail}`,
          isDemoPreset: true,
        }));
      setSuggestions(localMatches);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(debouncedLocationQuery)}&format=json&limit=5`);
        const data = await response.json();
        setSuggestions([...localMatches, ...data]);
      } catch (error) {
        console.error('Error fetching location suggestions:', error);
        setSuggestions(localMatches);
      } finally {
        setIsSuggestionsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedLocationQuery]);

  useEffect(() => {
    // The command-hero snapshot banner renders on every tab, so keep listings
    // fresh whenever a tab that surfaces it is opened directly (e.g. a nav
    // deep link straight into Matches), not just overview/browse/map.
    if (!['overview', 'browse', 'map', 'suggested'].includes(tab)) return;
    let cancelled = false;
    (async () => {
      setLoadingListings(true);
      try {
        const res = await API.get('/listings');
        if (!cancelled) setListings(res.data);
      } catch (e: any) {
        if (!cancelled) setError('Failed to load listings');
      } finally { if (!cancelled) setLoadingListings(false); }
    })();
    return () => { cancelled = true; };
  }, [tab]);

  function validate() {
    const errs: {title?:string; lat?:string; lon?:string} = {};
    if (!title.trim()) errs.title = 'Title is required';
    const latNum = Number(lat), lonNum = Number(lon);
    if (lat === '') errs.lat = 'Latitude is required';
    else if (Number.isNaN(latNum) || latNum < -90 || latNum > 90) errs.lat = 'Latitude must be a number between -90 and 90';
    if (lon === '') errs.lon = 'Longitude is required';
    else if (Number.isNaN(lonNum) || lonNum < -180 || lonNum > 180) errs.lon = 'Longitude must be a number between -180 and 180';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function createListing(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    try {
      const latNum = Number(lat), lonNum = Number(lon);
      const payload = {
        title,
        description,
        quantity,
        category,
        is_urgent: isUrgent,
        location: { lat: latNum, lon: lonNum }
      };
    const res = await API.post('/listings', payload);
    setListings((prev: Listing[]) => [res.data, ...prev]);
      // reset form
      setTitle('');
      setDescription('');
      setQuantity(1);
      setCategory('general');
      setIsUrgent(false);
      setLat('');
      setLon('');
      setLocationQuery('');
      setFieldErrors({});
      setSuccess('Listing created');
      toast.success('Listing created');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to create listing';
      setError(msg);
      toast.error(msg);
    }
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingId) return;
    try {
      const payload: any = { title, description, quantity, category };
      const res = await API.put(`/listings/${editingId}`, payload);
      setListings(prev => prev.map(l => (l.id === editingId ? { ...l, ...res.data } : l)));
      toast.success('Listing updated');
      setEditingId(null);
      setTitle(''); setDescription(''); setQuantity(1); setCategory('general'); setLat(''); setLon(''); setLocationQuery('');
      setTab('browse');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Update failed');
    }
  }

  async function removeListing(id: number) {
    try {
      await API.delete(`/listings/${id}`);
      setListings(prev => prev.filter(l => l.id !== id));
      toast.success('Listing deleted');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Delete failed');
    }
  }

  const hasScenarioListingSet = listings.length >= 2 && listings.some(l => (l as any).is_urgent) && listings.some(l => !(l as any).is_urgent);
  const listingsForSnapshot = hasScenarioListingSet ? listings : DEMO_MAP_LISTINGS;
  const listingsWithDistance = listingsForSnapshot
    .map(l => {
      const coords = extractLatLon((l as any).location_wkt || (l as any).location || '');
      const distanceKm = userCoords && coords.lat != null && coords.lon != null
        ? haversineKm(userCoords, { lat: coords.lat!, lon: coords.lon! })
        : undefined;
      return { listing: l, coords, distanceKm };
    })
    .filter(item => item.coords.lat != null && item.coords.lon != null);
  const nearestListing = listingsWithDistance
    .filter(item => typeof item.distanceKm === 'number')
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))[0];
  const averageRadius = listingsWithDistance.length
    ? listingsWithDistance.reduce((sum, item) => sum + (item.distanceKm ?? 0), 0) / listingsWithDistance.length
    : 0;
  const recentActivity = listingsForSnapshot.filter(l => {
    if (!l.created_at) return false;
    return Date.now() - new Date(l.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
  }).length;
  const verifiedOrgs = new Set(
    listingsForSnapshot
      .filter(l => (l as any).org_verified)
      .map(l => (l as any).org_name || (l as any).owner_name || (l as any).owner_id || l.id)
  ).size;
  const urgentNeeds = listingsForSnapshot.filter(l => (l as any).is_urgent).length;
  const availableSupplies = Math.max(0, listingsForSnapshot.length - urgentNeeds);

  return (
    <div>
      <div style={{ marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid var(--card-border)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:'1.6rem', fontWeight:900, letterSpacing:'-0.02em', color:'var(--text)', lineHeight:1.1 }}>Command Center</div>
            <div style={{ color:'var(--muted)', marginTop:4, fontSize:'0.9rem' }}>Nairobi County · Synthetic demo data</div>
          </div>
          <div style={{ display:'flex', gap:18, alignItems:'center' }}>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:'1.9rem', fontWeight:900, color:'#dc2626', lineHeight:1 }}>{urgentNeeds}</div>
              <div style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', color:'var(--muted)', letterSpacing:'0.06em' }}>Urgent</div>
            </div>
            <div style={{ width:1, height:36, background:'var(--card-border)' }} />
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:'1.9rem', fontWeight:900, color:'#059669', lineHeight:1 }}>{availableSupplies}</div>
              <div style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', color:'var(--muted)', letterSpacing:'0.06em' }}>Supply</div>
            </div>
          </div>
        </div>
      </div>
      <div className="tabs">
        <button className={`tab ${tab==='overview'?'active':''}`} onClick={()=>setTab('overview')}>Command</button>
        {role !== 'admin' && (
          <button className={`tab ${tab==='create'?'active':''}`} onClick={()=>setTab('create')}>Post Signal</button>
        )}
        <button className={`tab ${tab==='browse'?'active':''}`} onClick={()=>setTab('browse')}>Listings</button>
        <button className={`tab ${tab==='suggested'?'active':''}`} onClick={()=>setTab('suggested')}>Matches</button>
        <button className={`tab ${tab==='map'?'active':''}`} onClick={()=>setTab('map')}>Map</button>
        {role !== 'admin' && (
          <button className={`tab ${tab==='messages'?'active':''}`} onClick={()=>setTab('messages')}>Messages</button>
        )}
        {role !== 'admin' && (
          <button className={`tab ${tab==='account'?'active':''}`} onClick={()=>setTab('account')}>Account</button>
        )}
        {role === 'admin' && (
          <button className={`tab ${tab==='admin'?'active':''}`} onClick={()=>setTab('admin')}>Review</button>
        )}
      </div>

      {tab==='overview' && (
        <section style={{ marginBottom: 20 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
            <div style={{ padding:'22px 24px', border:'1px solid var(--card-border)', borderRadius:16, background:'var(--surface)', borderTop:'4px solid #dc2626' }}>
              <div style={{ fontSize:'3.4rem', fontWeight:900, color:'#dc2626', lineHeight:1, letterSpacing:'-0.02em' }}>{urgentNeeds}</div>
              <div style={{ fontSize:'0.78rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--muted)', marginTop:8 }}>Urgent needs</div>
            </div>
            <div style={{ padding:'22px 24px', border:'1px solid var(--card-border)', borderRadius:16, background:'var(--surface)', borderTop:'4px solid #059669' }}>
              <div style={{ fontSize:'3.4rem', fontWeight:900, color:'#059669', lineHeight:1, letterSpacing:'-0.02em' }}>{availableSupplies}</div>
              <div style={{ fontSize:'0.78rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--muted)', marginTop:8 }}>Available supply</div>
            </div>
            <div style={{ padding:'22px 24px', border:'1px solid var(--card-border)', borderRadius:16, background:'var(--surface)', borderTop:'4px solid #0b5fff' }}>
              <div style={{ fontSize:'3.4rem', fontWeight:900, color:'#0b5fff', lineHeight:1, letterSpacing:'-0.02em' }}>{nearestListing?.distanceKm != null ? `${nearestListing.distanceKm.toFixed(1)}` : '—'}</div>
              <div style={{ fontSize:'0.78rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--muted)', marginTop:8 }}>km · nearest match</div>
              {nearestListing?.listing.title && <div style={{ fontSize:'0.8rem', color:'var(--muted)', marginTop:4 }}>{nearestListing.listing.title}</div>}
            </div>
          </div>
          {/* AI-assisted coordinator brief (local, deterministic prototype) */}
          <AICoordinatorBrief
            stats={{ urgentNeeds, availableSupplies, verifiedOrgs, averageRadius, recentActivity }}
            topListing={nearestListing?.listing}
          />
          <div style={{ display:'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              <button className="btn btn-primary" onClick={()=>setTab('map')}>Open map</button>
              <button className="btn btn-outline" onClick={()=>setTab('suggested')}>Priority matches</button>
              {role === 'admin' && (
                <button className="btn" onClick={async ()=>{
                  try {
                    const res = await API.get('/admin/reports/summary.csv', { responseType: 'blob' });
                    const blob = new Blob([res.data], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `summary-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast.success('Report downloaded');
                  } catch (e:any) {
                    toast.error(e?.response?.data?.error || 'Failed to download report');
                  }
                }}>Export Report</button>
              )}
            </div>
          {/* Recent signals feed */}
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize:'0.72rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--muted)', marginBottom:12 }}>Recent signals</div>
            <div style={{ display:'grid', gap:8 }}>
              {listingsForSnapshot.slice(0, 5).map(l => {
                const isUrgent = (l as any).is_urgent;
                const org = (l as any).org_name || (l as any).owner_name || 'Unknown facility';
                const ago = l.created_at ? (() => {
                  const diff = Date.now() - new Date(l.created_at).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 60) return `${mins}m ago`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs}h ago`;
                  return `${Math.floor(hrs / 24)}d ago`;
                })() : '';
                return (
                  <div key={l.id} style={{ display:'flex', gap:12, alignItems:'center', padding:'10px 14px', border:'1px solid var(--card-border)', borderRadius:10, background:'var(--surface)', cursor:'pointer' }} onClick={()=>setTab('suggested')}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background: isUrgent ? '#dc2626' : '#059669', flexShrink:0, boxShadow: isUrgent ? '0 0 6px rgba(220,38,38,0.5)' : '0 0 6px rgba(5,150,105,0.4)' }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:'0.88rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{l.title}</div>
                      <div style={{ fontSize:'0.78rem', color:'var(--muted)' }}>{org}</div>
                    </div>
                    <div style={{ fontSize:'0.75rem', color:'var(--muted)', flexShrink:0 }}>{ago}</div>
                    {isUrgent && <div style={{ fontSize:'0.68rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', color:'#dc2626', flexShrink:0 }}>Urgent</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

  {tab==='create' && role !== 'admin' && (
      <section className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 16 }}>{editingId ? 'Edit listing' : 'Post a supply or need'}</div>
        <form onSubmit={editingId ? saveEdit : createListing} style={{ maxWidth: 560 }}>
          <div className="form-group">
            <label>Title <span className="muted-small">(required)</span></label>
            <input placeholder="e.g., Sterile bandage rolls" value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} />
            {fieldErrors.title && <div className="text-danger" style={{ marginTop: 6 }}>{fieldErrors.title}</div>}
          </div>
          <div className="form-group">
            <label>Description</label>
            <input placeholder="e.g., 10 rolls, unopened" value={description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Quantity</label>
            <input type="number" value={quantity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(Math.max(1, Number(e.target.value)))} min={1} step={1} />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as ListingCategory)}>
              {LISTING_CATEGORIES.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)} />
              <span>Mark as urgent</span>
            </label>
            <div className="muted-small">Urgent listings are prioritized and highlighted to users</div>
          </div>
          {!editingId && (
            <div className="form-group">
              <label>Location <span className="muted-small">(required)</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="e.g., Nairobi, Kenya"
                  value={locationQuery}
                  onChange={(e) => {
                    setLocationQuery(e.target.value);
                    // Clear lat/lon when user types a new location
                    if (lat || lon) {
                      setLat('');
                      setLon('');
                    }
                  }}
                />
                <button type="button" className="btn" onClick={() => {
                  if (!('geolocation' in navigator)) { setError('Geolocation not supported by this browser'); return; }
                  navigator.geolocation.getCurrentPosition(
                    pos => {
                      setLat(String(pos.coords.latitude));
                      setLon(String(pos.coords.longitude));
                      setLocationQuery(`My Location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
                      setSuggestions([]);
                    },
                    () => setError('Could not get your current location')
                  );
                }}>Use my location</button>
                {user?.org_address && (
                  <button type="button" className="btn" onClick={() => {
                    setLocationQuery(user.org_address!);
                    // This will trigger the debounced search
                  }}>Use my organization's address</button>
                )}
              </div>
              <div style={{ marginTop: 8 }}>
                <select
                  value=""
                  onChange={e => {
                    const place = DEMO_LOCATIONS.find(p => p.label === e.target.value);
                    if (place) applyDemoLocation(place);
                  }}
                >
                  <option value="">Research demo location presets</option>
                  {DEMO_LOCATIONS.map(place => (
                    <option key={place.label} value={place.label}>{place.label} - {place.detail}</option>
                  ))}
                </select>
              </div>
              {isSuggestionsLoading && <div className="muted-small" style={{ marginTop: 4 }}>Searching...</div>}
              {suggestions.length > 0 && (
                <div style={{ border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', marginTop: 6 }}>
                  {suggestions.map((suggestion) => (
                    <div
                      key={suggestion.place_id}
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--card-border)' }}
                      onClick={() => {
                        setLat(suggestion.lat);
                        setLon(suggestion.lon);
                        setLocationQuery(suggestion.display_name);
                        setSuggestions([]);
                      }}
                    >
                      {suggestion.display_name}
                    </div>
                  ))}
                </div>
              )}
              {fieldErrors.lat && <div className="text-danger" style={{ marginTop: 6 }}>{fieldErrors.lat}</div>}
            </div>
          )}
          {error && <div className="text-danger" style={{ marginTop: 8 }}>{error}</div>}
          {success && <div className="success" style={{ marginTop: 8 }}>{success}</div>}
          {/* AI completeness check for the post form */}
          <AICompletenessCheck title={title} description={description} quantity={quantity} category={category} lat={lat} lon={lon} />
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary" type="submit" disabled={!title.trim() || (!editingId && (lat==='' || lon===''))}>{editingId ? 'Save' : 'Post Supply / Need'}</button>
            {editingId && <button type="button" className="btn" style={{ marginLeft: 8 }} onClick={() => { setEditingId(null); setTitle(''); setDescription(''); setQuantity(1); setCategory('general'); setLat(''); setLon(''); setLocationQuery(''); }}>Cancel</button>}
          </div>
        </form>
      </section>
      )}

      {tab==='browse' && (
        <section>
          <div className="subtle" style={{ marginBottom: 10 }}>Available listings near you</div>
          <div className="card" style={{ marginBottom: 12, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <input placeholder="Search by title or description" value={filterText} onChange={e=>setFilterText(e.target.value)} style={{ flex:'1 1 200px' }} />
            <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} style={{ minWidth: 140 }}>
              <option value="all">All Categories</option>
              <option value="medication">Medication</option>
              <option value="equipment">Equipment</option>
              <option value="supplies">Supplies</option>
              <option value="general">General</option>
              <option value="other">Other</option>
            </select>
            <select value={distanceFilter} onChange={e=>setDistanceFilter(Number(e.target.value))} style={{ minWidth: 120 }}>
              <option value="999999">Any Distance</option>
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
            </select>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} style={{ minWidth: 120 }}>
              <option value="newest">Sort: Newest</option>
              <option value="nearest">Sort: Nearest</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={urgentOnly} onChange={e => setUrgentOnly(e.target.checked)} />
              <span>Urgent only</span>
            </label>
            <button className="btn" onClick={() => {
              if (!('geolocation' in navigator)) { toast.error('Geolocation not supported'); return; }
              navigator.geolocation.getCurrentPosition(
                pos => setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                () => toast.error('Could not get your location')
              );
            }}>{userCoords ? 'Location set' : 'Use my location'}</button>
          </div>
          {loadingListings ? (
            <div className="listings">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card">
                  <div className="skeleton" style={{ width:'40%', height:14, marginBottom:8 }} />
                  <div className="skeleton" style={{ width:'90%', height:12, marginBottom:6 }} />
                  <div className="skeleton" style={{ width:'65%', height:12 }} />
                </div>
              ))}
            </div>
          ) : (
          <div className="listings">
            {(() => {
              const browseListings: Listing[] = listings.length >= 3 ? listings : [...listings, ...DEMO_MAP_LISTINGS.filter(d => !listings.some(l => l.title === d.title))];
              const items = browseListings.map((l: Listing) => {
                const loc = (l as any).location_wkt || (l as any).location || '';
                const coords = extractLatLon(loc);
                const distanceKm = (userCoords && coords.lat != null && coords.lon != null)
                  ? haversineKm(userCoords, { lat: coords.lat!, lon: coords.lon! })
                  : undefined;
                return { l, coords, distanceKm };
              })
              .filter(x => {
                if (!filterText.trim()) return true;
                const t = filterText.trim().toLowerCase();
                return x.l.title.toLowerCase().includes(t) || (x.l.description || '').toLowerCase().includes(t);
              })
              .filter(x => {
                // Category filter
                if (categoryFilter !== 'all' && (x.l as any).category !== categoryFilter) return false;
                // Distance filter
                if (distanceFilter < 999999 && typeof x.distanceKm === 'number' && x.distanceKm > distanceFilter) return false;
                // Urgent filter
                if (urgentOnly && !(x.l as any).is_urgent) return false;
                return true;
              })
              .sort((a, b) => {
                if (sortBy === 'nearest') {
                  const ad = a.distanceKm ?? Number.POSITIVE_INFINITY;
                  const bd = b.distanceKm ?? Number.POSITIVE_INFINITY;
                  return ad - bd;
                }
                // newest default by created_at
                const at = a.l.created_at ? new Date(a.l.created_at).getTime() : 0;
                const bt = b.l.created_at ? new Date(b.l.created_at).getTime() : 0;
                return bt - at;
              });

              return items.map(({ l, coords, distanceKm }) => {
                const q = (l as any).quantity ?? l.quantity ?? 1;
                const loc = (l as any).location_wkt || (l as any).location || '';
                const userId = Number(localStorage.getItem('userId'));
                const isOwner = !!userId && (l as any).owner_id === userId;
                const fav = favorites.includes(l.id);
                return (
                  <div key={l.id} className="listing-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong>{l.title}</strong>
                        {(l as any).is_urgent && (
                          <span className="badge" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', fontSize: '0.75rem', padding: '2px 8px' }}>
                            URGENT
                          </span>
                        )}
                      </div>
                      <div className="muted-small">{l.created_at ? (() => {
                        const date = new Date(l.created_at);
                        return date.toLocaleString(undefined, { 
                          year: 'numeric', 
                          month: '2-digit', 
                          day: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: false
                        });
                      })() : ''}</div>
                    </div>
                    <div className="muted">{l.description || 'no description'}</div>
                    
                    {/* Owner reputation info */}
                    {(l as any).owner_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 4 }}>
                        <div className="muted-small">
                          Posted by <strong>{(l as any).owner_name}</strong>
                          {(l as any).org_name && ` (${(l as any).org_name})`}
                        </div>
                        {(l as any).org_verified && (
                          <span className="badge" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: '0.65rem', padding: '2px 6px' }}>
                            ✓ Verified
                          </span>
                        )}
                        {(l as any).average_rating > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
                            <span className="muted-small">User rating:</span>
                            <span style={{ color: '#f59e0b' }}>⭐</span>
                            <span className="muted-small">{parseFloat((l as any).average_rating).toFixed(1)} ({(l as any).total_ratings} review{(l as any).total_ratings !== 1 ? 's' : ''})</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="chips">
                      <span className="chip"><span className="dot" /> Qty: {q}</span>
                      {typeof distanceKm === 'number' && Number.isFinite(distanceKm) && distanceKm < 200 && (
                        <span className="chip"><span className="dot" /> {distanceKm.toFixed(1)} km away</span>
                      )}
                      {coords.lat != null && coords.lon != null && (
                        <>
                        <button className="btn btn-outline" onClick={() => {
                          setMapOpen({ lat: coords.lat!, lon: coords.lon!, title: l.title });
                        }}>View location</button>
                        <button className="btn" onClick={async () => {
                          const url = `${window.location.origin}/listings/${l.id}`;
                          const shareData = {
                            title: `MediMatch Listing: ${l.title}`,
                            text: `Check out this medical supply listing on MediMatch: ${l.description || ''}`,
                            url: url,
                          };
                          try {
                            if (navigator.share) {
                              await navigator.share(shareData);
                              toast.success('Listing shared!');
                            } else {
                              throw new Error('Web Share API not supported');
                            }
                          } catch (err) {
                            // Fallback to copying link
                            try {
                              await navigator.clipboard.writeText(url);
                              toast.success('Link copied to clipboard');
                            } catch (copyErr) {
                              toast.error('Could not copy or share link.');
                            }
                          }
                        }}>Share</button>
                        </>
                      )}
                      {!isOwner && (l as any).owner_id && (
                        <>
                          <button className="btn btn-primary" onClick={() => {
                            const ownerName = (l as any).owner_name || 'User';
                            setChatOpen({ otherUserId: (l as any).owner_id, otherUserName: ownerName, listingId: l.id });
                          }}>Message</button>
                          <button className="btn btn-outline" onClick={() => {
                            const ownerName = (l as any).owner_name || 'User';
                            setRatingOpen({ userId: (l as any).owner_id, userName: ownerName, listingId: l.id });
                          }}>Rate</button>
                        </>
                      )}
                      <button className={`btn ${fav ? 'btn-primary' : 'btn-outline'}`} onClick={() => toggleFavorite(l.id)}>
                        {fav ? 'Saved' : 'Save'}
                      </button>
                      {isOwner && (
                        <>
                          <button className="btn btn-outline" onClick={() => { setEditingId(l.id); setTitle(l.title); setDescription(l.description || ''); setQuantity((l as any).quantity ?? 1); setCategory(((l as any).category || 'general') as ListingCategory); setTab('create'); }}>Edit</button>
                          <button className="btn btn-ghost" onClick={() => removeListing(l.id)}>Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          )}
        </section>
      )}
      {mapOpen && (
        <MapModal lat={mapOpen.lat} lon={mapOpen.lon} title={mapOpen.title} onClose={() => setMapOpen(null)} />
      )}
      {chatOpen && (
        <ChatModal
          otherUserId={chatOpen.otherUserId}
          otherUserName={chatOpen.otherUserName}
          listingId={(chatOpen as any).listingId}
          onClose={() => setChatOpen(null)}
        />
      )}
      {ratingOpen && (
        <RatingModal
          userId={ratingOpen.userId}
          userName={ratingOpen.userName}
          listingId={ratingOpen.listingId}
          onClose={() => setRatingOpen(null)}
          onSuccess={() => {
            // Trigger listings refresh by switching tabs
            const currentTab = tab;
            setTab('overview');
            setTimeout(() => setTab(currentTab), 10);
          }}
        />
      )}

      {tab==='messages' && (
        <MessagesSection onOpenChat={(otherUserId, otherUserName) => setChatOpen({ otherUserId, otherUserName })} />
      )}

      {tab==='suggested' && (
        <SuggestedSection
          userCoords={userCoords}
          setUserCoords={setUserCoords}
          recs={recs}
          setRecs={setRecs}
          loadingRecs={loadingRecs}
          setLoadingRecs={setLoadingRecs}
          recCategory={recCategory}
          setRecCategory={setRecCategory}
          recRadius={recRadius}
          setRecRadius={setRecRadius}
          onOpenMap={(lat:number, lon:number, title?:string)=> setMapOpen({ lat, lon, title })}
          onOpenShowcaseMap={()=>setTab('map')}
          onOpenChat={(otherUserId:number, otherUserName:string, listingId?:number)=> setChatOpen({ otherUserId, otherUserName, listingId } as any)}
          onOpenRate={(userId:number, userName:string, listingId?:number)=> setRatingOpen({ userId, userName, listingId })}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
        />
      )}

      {tab==='map' && (
        <RedistributionMapSection
          listings={listingsForSnapshot}
          recs={recs}
          userCoords={userCoords || DEMO_COORDS}
          onUseDemoCenter={() => setUserCoords(DEMO_COORDS)}
          onOpenListingMap={(lat:number, lon:number, title?:string)=> setMapOpen({ lat, lon, title })}
          onOpenPriorityMatches={() => setTab('suggested')}
        />
      )}

      {tab==='account' && (
        <AccountSection />
      )}

      {tab==='admin' && (
        <AdminSection />
      )}
    </div>
  );
}

function AccountSection() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await API.get('/auth/me');
        if (cancelled) return;
        setMe(r.data);
        setName(r.data?.name || '');
        setOrgName(r.data?.org_name || '');
        setOrgType(r.data?.org_type || '');
        setOrgAddress(r.data?.org_address || '');
      } catch (e: any) {
        if (!cancelled) setErr('Failed to load account');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    try {
      const body: any = {};
      if (name !== me?.name) body.name = name;
      if (orgName !== (me?.org_name || '')) body.org_name = orgName;
      if (orgType !== (me?.org_type || '')) body.org_type = orgType;
      if (orgAddress !== (me?.org_address || '')) body.org_address = orgAddress;
      if (password.trim()) body.password = password.trim();
      const r = await API.put('/auth/me', body);
      setMe(r.data);
      localStorage.setItem('name', r.data?.name || '');
      if (r.data?.role) localStorage.setItem('role', r.data.role);
      setPassword('');
      setMsg('Profile updated');
      toast.success('Profile updated');
    } catch (e: any) {
      const m = e?.response?.data?.error || 'Update failed';
      setErr(m);
      toast.error(m);
    } finally { setLoading(false); }
  }

  return (
    <section className="card" style={{ maxWidth: 560 }}>
      <div className="subtle">Account</div>
      {!me ? (
        <div className="muted-small">Loading…</div>
      ) : (
        <>
          {/* Reputation Display */}
          <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)', border: '1px solid #d1d5db' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong style={{ fontSize: '1.1rem' }}>Your Reputation</strong>
              {me.org_verified && (
                <span className="badge" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: '0.8rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>✓</span> Verified Organization
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
                  {me.average_rating > 0 ? '⭐'.repeat(Math.round(me.average_rating)) : '—'}
                </div>
                <div className="muted-small">
                  {me.average_rating > 0 ? `${parseFloat(me.average_rating).toFixed(1)} average` : 'No ratings yet'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{me.total_ratings || 0}</div>
                <div className="muted-small">Total reviews</div>
              </div>
            </div>
          </div>

          <form onSubmit={onSave}>
          <div className="form-group">
            <label>Email</label>
            <input value={me.email} disabled />
          </div>
          <div className="form-group">
            <label>Organization Name</label>
            <input value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="e.g., Mercy General Hospital" />
          </div>
          <div className="form-group">
            <label>Organization Type</label>
            <input value={orgType} onChange={e=>setOrgType(e.target.value)} placeholder="e.g., Hospital, Clinic, NGO" />
          </div>
          <div className="form-group">
            <label>Organization Address</label>
            <input value={orgAddress} onChange={e=>setOrgAddress(e.target.value)} placeholder="e.g., 123 Main St, Nairobi, Kenya" />
          </div>
          <div className="form-group">
            <label>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>New password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
            <div className="muted-small">6+ characters</div>
          </div>
          {err && <div className="text-danger" style={{ marginTop: 8 }}>{err}</div>}
          {msg && <div className="success" style={{ marginTop: 8 }}>{msg}</div>}
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary" disabled={loading} type="submit">Save changes</button>
          </div>
        </form>
        </>
      )}
    </section>
  );
}

function AdminSection() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState('');
  const [listTitleFilter, setListTitleFilter] = useState('');
  const CATEGORIES = ['all','general','medication','equipment','supplies','other'] as const;
  const [listCategory, setListCategory] = useState<typeof CATEGORIES[number]>('all');

  useEffect(() => {
    (async () => {
      try {
  const s = await API.get('/admin/stats');
  setStats(s.data);
  const u = await API.get('/admin/users');
  setUsers(u.data);
  const l = await API.get('/admin/listings');
  setListings(l.data);
      } catch (e: any) {
        const msg = e?.response?.data?.error || 'Failed to load admin data';
        setErr(msg);
        // Fallback to demo data when running the conference demo (query param present)
        try {
          if (typeof window !== 'undefined' && window.location?.search?.includes('demo')) {
            setStats({ users: 2, listings: 2, matches: 0 });
            setUsers([
              { id: 1, email: 'test@example.com', name: 'Test User', role: 'user', org_name: 'Kenyatta National Hospital', org_verified: true },
              { id: 2, email: 'lesnar@admin.com', name: 'MediMatch Admin', role: 'admin', org_name: 'MediMatch Coordination Desk', org_verified: true },
            ]);
            setListings([
              { id: 1, owner_id: 1, title: 'Surplus nitrile gloves', category: 'supplies', quantity: 800, is_hidden: false, created_at: new Date().toISOString() },
              { id: 2, owner_id: 1, title: 'Urgent wound-care supplies needed', category: 'supplies', quantity: 120, is_hidden: false, created_at: new Date().toISOString() },
            ]);
          }
        } catch {}
      }
    })();
  }, []);

  async function toggleVerify(userId: number, current: boolean) {
    try {
  await API.put(`/admin/users/${userId}`, { org_verified: !current });
  setUsers(prev => prev.map(u => u.id === userId ? { ...u, org_verified: !current } : u));
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Failed to update verification');
    }
  }

  return (
    <section>
      <div className="heading" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span>Admin</span>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn" onClick={async ()=>{
            try {
              const res = await API.get('/admin/reports/summary.csv', { responseType: 'blob' });
              const blob = new Blob([res.data], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `summary-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              URL.revokeObjectURL(url);
              toast.success('Report downloaded');
            } catch (e:any) {
              const m = e?.response?.data?.error || 'Failed to download report';
              setErr(m); toast.error(m);
            }
          }}>Download CSV Report</button>
        </div>
      </div>
      {err && <div className="text-danger" style={{ marginBottom: 8 }}>{err}</div>}

      <div className="card" style={{ marginBottom: 12 }}>
        <strong>Stats</strong>
        <div className="muted-small">Users: {stats?.users ?? '—'} | Listings: {stats?.listings ?? '—'} | Matches: {stats?.matches ?? '—'}</div>
      </div>

      <div className="card" style={{ marginBottom: 12, overflowX:'auto' }}>
        <strong>Users</strong>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginTop: 8, marginBottom: 8 }}>
          <input placeholder="Search by email or name" value={userFilter} onChange={e=>setUserFilter(e.target.value)} style={{ maxWidth: 320 }} />
        </div>
        <table className="table" style={{ width:'100%', marginTop: 8 }}>
          <thead><tr><th>ID</th><th>Email</th><th>Name</th><th>Role</th><th>Org</th><th>Type</th><th>Verified</th><th>Disabled</th><th>Actions</th></tr></thead>
          <tbody>
            {users
              .filter(u => {
                const q = userFilter.trim().toLowerCase();
                if (!q) return true;
                return (u.email||'').toLowerCase().includes(q) || (u.name||'').toLowerCase().includes(q);
              })
              .map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.email}</td>
                <td>{u.name||''}</td>
                <td>
                  <select value={u.role} onChange={async (e)=>{
                    const role = e.target.value;
                    try {
                      await API.put(`/admin/users/${u.id}`, { role });
                      setUsers(prev => prev.map(x => x.id===u.id ? { ...x, role } : x));
                    } catch (er:any) {
                      setErr(er?.response?.data?.error || 'Failed to update role');
                    }
                  }}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>{u.org_name||''}</td>
                <td>{u.org_type||''}</td>
                <td>{u.org_verified? 'Yes':'No'}</td>
                <td>{u.disabled? 'Yes':'No'}</td>
                <td>
                  <button
                    className="btn btn-outline"
                    title={(!u.org_name || !u.org_type || !u.org_license_id) && !u.org_verified ? 'Provide org name, type, and license to verify' : ''}
                    disabled={(!u.org_name || !u.org_type || !u.org_license_id) && !u.org_verified}
                    onClick={() => toggleVerify(u.id, !!u.org_verified)}
                  >
                    {u.org_verified? 'Unverify':'Verify'}
                  </button>
                  <button className="btn" style={{ marginLeft: 6 }} onClick={async ()=>{
                    try {
                      await API.put(`/admin/users/${u.id}`, { disabled: !u.disabled });
                      setUsers(prev => prev.map(x => x.id===u.id ? { ...x, disabled: !u.disabled } : x));
                    } catch (er:any) {
                      setErr(er?.response?.data?.error || 'Failed to update user');
                    }
                  }}>{u.disabled? 'Enable':'Disable'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ overflowX:'auto' }}>
        <strong>Listings</strong>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginTop: 8 }}>
          <input placeholder="Search by title" value={listTitleFilter} onChange={e=>setListTitleFilter(e.target.value)} style={{ maxWidth: 320 }} />
          <select value={listCategory} onChange={e=>setListCategory(e.target.value as any)}>
            {CATEGORIES.map(c => (<option key={c} value={c}>{c==='all' ? 'All categories' : `Category: ${c}`}</option>))}
          </select>
        </div>
        <table className="table" style={{ width:'100%', marginTop: 8 }}>
          <thead><tr><th>ID</th><th>Owner</th><th>Title</th><th>Category</th><th>Qty</th><th>Hidden</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {listings
              .filter(l => {
                const q = listTitleFilter.trim().toLowerCase();
                if (q && !(l.title||'').toLowerCase().includes(q)) return false;
                if (listCategory !== 'all' && l.category !== listCategory) return false;
                return true;
              })
              .map(l => (
              <tr key={l.id}>
                <td>{l.id}</td>
                <td>{l.owner_id}</td>
                <td>{l.title}</td>
                <td>{l.category}</td>
                <td>{l.quantity}</td>
                <td>{l.is_hidden? 'Yes':'No'}</td>
                <td>{l.created_at ? new Date(l.created_at).toLocaleString(): ''}</td>
                <td>
                  <button className="btn" onClick={async ()=>{
                    try {
                      await API.put(`/admin/listings/${l.id}/hide`, { is_hidden: !l.is_hidden });
                      setListings(prev => prev.map(x=>x.id===l.id ? { ...x, is_hidden: !l.is_hidden } : x));
                      toast.success(l.is_hidden ? 'Listing unhidden' : 'Listing hidden');
                    } catch (er:any) {
                      const m = er?.response?.data?.error || 'Failed to update listing';
                      setErr(m); toast.error(m);
                    }
                  }}>{l.is_hidden? 'Unhide':'Hide'}</button>
                  <button className="btn btn-ghost" style={{ marginLeft: 6 }} onClick={async ()=>{
                    if (!confirm('Delete this listing permanently?')) return;
                    try {
                      await API.delete(`/admin/listings/${l.id}`);
                      setListings(prev => prev.filter(x=>x.id!==l.id));
                      toast.success('Listing deleted');
                    } catch (er:any) {
                      const m = er?.response?.data?.error || 'Failed to delete listing';
                      setErr(m); toast.error(m);
                    }
                  }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MessagesSection({ onOpenChat }: { onOpenChat: (otherUserId: number, otherUserName: string) => void }) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await API.get('/chat/conversations');
        if (!cancelled && res.data?.conversations) {
          setConversations(res.data.conversations);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.error || 'Failed to load conversations');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="card">
      <div className="subtle" style={{ marginBottom: 12 }}>Your Messages</div>
      {error && <div className="text-danger" style={{ marginBottom: 8 }}>{error}</div>}
      {loading ? (
        <div className="muted-small">Loading conversations...</div>
      ) : conversations.length === 0 ? (
        <div className="empty">
          <p className="muted">No conversations yet. Start a conversation by clicking "Message" on a listing.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className="card"
              style={{ cursor: 'pointer', padding: 16 }}
              onClick={() => onOpenChat(conv.other_user_id, conv.other_user_name || conv.other_user_email)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong>{conv.other_user_name || conv.other_user_email}</strong>
                  {conv.listing_id && (
                    <div className="muted-small">Listing: {conv.listing_title || `#${conv.listing_id}`}</div>
                  )}
                  {conv.last_message && (
                    <div className="muted" style={{ marginTop: 4 }}>
                      {conv.last_message.length > 60 ? conv.last_message.slice(0, 60) + '...' : conv.last_message}
                    </div>
                  )}
                </div>
                {conv.last_message_at && (
                  <div className="muted-small">
                    {new Date(conv.last_message_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SuggestedSection(props: {
  userCoords: {lat:number; lon:number} | null;
  setUserCoords: (v:{lat:number; lon:number})=>void;
  recs: any[];
  setRecs: (v:any[])=>void;
  loadingRecs: boolean;
  setLoadingRecs: (v:boolean)=>void;
  recCategory: string;
  setRecCategory: (v:string)=>void;
  recRadius: number;
  setRecRadius: (v:number)=>void;
  onOpenMap: (lat:number, lon:number, title?:string)=>void;
  onOpenShowcaseMap: ()=>void;
  onOpenChat: (otherUserId:number, otherUserName:string, listingId?:number)=>void;
  onOpenRate: (userId:number, userName:string, listingId?:number)=>void;
  favorites: number[];
  toggleFavorite: (id:number)=>void;
}) {
  const { userCoords, setUserCoords, recs, setRecs, loadingRecs, setLoadingRecs, recCategory, setRecCategory, recRadius, setRecRadius, onOpenMap, onOpenShowcaseMap, onOpenChat, onOpenRate, favorites, toggleFavorite } = props;
  const { user } = useAuth();
  const [error, setError] = useState<string|null>(null);
  const [explanations, setExplanations] = useState<Record<number,string|undefined>>({});
  const [lastFetched, setLastFetched] = useState<number>(0);
  const [autoRefresh, setAutoRefresh] = useState(false);

  async function fetchRecs() {
    setError(null); setLoadingRecs(true);
    if (typeof window !== 'undefined' && window.location.search.includes('demoTab=suggested')) {
      setRecs(demoMatchRecommendations());
      setLastFetched(Date.now());
      setLoadingRecs(false);
      return;
    }
    try {
      const params: any = { limit: 25 };
      if (userCoords) { params.lat = userCoords.lat; params.lon = userCoords.lon; params.max_km = recRadius; }
      if (recCategory !== 'all') params.category = recCategory;
      const qs = new URLSearchParams(params).toString();
      const res = await API.get(`/matches/suggest?${qs}`);
      setRecs(res.data?.suggestions || []);
      setLastFetched(Date.now());
    } catch (e:any) {
      setRecs(demoMatchRecommendations());
      setLastFetched(Date.now());
      setError(null);
    } finally {
      setLoadingRecs(false);
    }
  }

  useEffect(() => { fetchRecs(); }, [userCoords?.lat, userCoords?.lon, recCategory, recRadius]);
  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(() => fetchRecs(), 15000);
    return () => clearInterval(iv);
  }, [autoRefresh, userCoords, recCategory, recRadius]);

  // If demo URL requests AI explanation, prefetch for the top suggestion
  useEffect(() => {
    if (!window.location.search.includes('ai_explain_demo')) return;
    if (!recs || recs.length === 0) return;
    (async () => {
      try {
        const first = recs[0];
        setExplanations(prev => ({ ...prev, [first.id]: 'Loading…' }));
        const t = await AI.explainMatch(first);
        setExplanations(prev => ({ ...prev, [first.id]: t }));
      } catch (e) {
        // ignore
      }
    })();
  }, [recs]);

  return (
    <section className="card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 12 }}>
        <div>
          <div className="subtle">Priority Matches</div>
          <div className="muted-small">Scored on six factors. Coordinator approves every transfer.</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.75rem' }}>
            <input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)} /> Auto refresh
          </label>
          <button className="btn btn-outline" onClick={onOpenShowcaseMap}>Open Map</button>
          <button className="btn btn-outline" onClick={fetchRecs} disabled={loadingRecs}>{loadingRecs && recs.length === 0 ? 'Loading…' : 'Refresh'}</button>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom: 12 }}>
        <select value={recCategory} onChange={e=>setRecCategory(e.target.value)} style={{ minWidth:140 }}>
          <option value="all">All Categories</option>
          <option value="medication">Medication</option>
          <option value="equipment">Equipment</option>
          <option value="supplies">Supplies</option>
          <option value="general">General</option>
          <option value="other">Other</option>
        </select>
        <select value={recRadius} onChange={e=>setRecRadius(Number(e.target.value))} style={{ minWidth:130 }}>
          <option value={10}>Within 10 km</option>
          <option value={25}>Within 25 km</option>
          <option value={50}>Within 50 km</option>
          <option value={100}>Within 100 km</option>
        </select>
        <button className="btn" onClick={() => {
          if (!('geolocation' in navigator)) { toast.error('Geolocation not supported'); return; }
          navigator.geolocation.getCurrentPosition(
            pos => setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => toast.error('Could not get location')
          );
        }}>{userCoords ? 'Location set' : 'Use my location'}</button>
        <button className="btn btn-outline" onClick={() => setUserCoords(DEMO_COORDS)}>Use demo center</button>
        <div className="muted-small" style={{ alignSelf:'center' }}>{lastFetched ? `Updated ${new Date(lastFetched).toLocaleTimeString()}` : ''}</div>
      </div>
      {error && <div className="text-danger" style={{ marginBottom: 8 }}>{error}</div>}
      {loadingRecs && recs.length === 0 && <div className="muted-small">Loading suggestions...</div>}
      {!loadingRecs && recs.length === 0 && <div className="muted-small">No suggestions yet – adjust filters or create listings.</div>}
      <div className="listings">
        {recs.map((r:any) => {
          const toNum = (v:any) => {
            if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
            const n = parseFloat(v);
            return Number.isFinite(n) ? n : 0;
          };
          const fav = favorites.includes(r.id);
          const score = toNum(r.score);
          const distanceKm = toNum(r.distance_km);
          const scoreInt = Math.round(score * 100);
          const scoreColor = scoreInt >= 85 ? '#059669' : scoreInt >= 70 ? '#0b5fff' : '#f59e0b';
          return (
            <div key={r.id} className="listing-item" style={{ display:'grid', gridTemplateColumns:'76px 1fr', gap:16, alignItems:'start' }}>
              {/* Score badge */}
              <div style={{ textAlign:'center', background: scoreInt >= 85 ? 'rgba(5,150,105,0.07)' : 'rgba(11,95,255,0.06)', border:`1px solid ${scoreColor}22`, borderRadius:10, padding:'12px 6px', flexShrink:0 }}>
                <div style={{ fontSize:'1.9rem', fontWeight:900, color:scoreColor, lineHeight:1 }}>{scoreInt}</div>
                <div style={{ fontSize:'0.58rem', color:'var(--muted)', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.04em', marginTop:4 }}>Priority</div>
                {r.is_urgent && <div style={{ marginTop:6, fontSize:'0.6rem', fontWeight:800, color:'#ef4444', textTransform:'uppercase' }}>Urgent</div>}
              </div>
              {/* Content */}
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:4 }}>
                  <strong style={{ fontSize:'1.02rem' }}>{r.title}</strong>
                  {r.org_verified && <span style={{ padding:'2px 8px', borderRadius:999, fontSize:'0.72rem', fontWeight:800, background:'rgba(5,150,105,0.1)', color:'#059669', flexShrink:0 }}>✓ Verified</span>}
                </div>
                <div className="muted" style={{ marginBottom:8, fontSize:'0.88rem' }}>{(r.org_name || r.owner_name) ? `${r.org_name || r.owner_name}` : ''}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                  {Number.isFinite(distanceKm) && distanceKm > 0 && <span className="chip">{distanceKm.toFixed(1)} km</span>}
                  {r.quantity != null && <span className="chip">{r.quantity} units</span>}
                  {r.category && r.category !== 'other' && <span className="chip">{r.category}</span>}
                  {r.is_urgent && <span className="chip" style={{ color:'#ef4444', borderColor:'#ef444430', background:'rgba(239,68,68,0.06)', fontWeight:800 }}>Urgent</span>}
                </div>
              <div className="chips">
                {r.location_wkt && (
                  <button className="btn btn-outline" onClick={()=>{
                    const m = String(r.location_wkt).match(/POINT\(([-\d\.]+)\s+([-\d\.]+)\)/i);
                    if (m) { const lon = Number(m[1]); const lat = Number(m[2]); onOpenMap(lat, lon, r.title); }
                  }}>Map</button>
                )}
                <button className="btn btn-outline" onClick={async () => {
                  try {
                    if (explanations[r.id]) { setExplanations(prev => ({ ...prev, [r.id]: undefined })); return; }
                    setExplanations(prev => ({ ...prev, [r.id]: 'Loading…' }));
                    const text = await AI.explainMatch(r);
                    setExplanations(prev => ({ ...prev, [r.id]: text }));
                  } catch (e) {
                    setExplanations(prev => ({ ...prev, [r.id]: 'Failed to generate explanation' }));
                  }
                }}>{explanations[r.id] ? 'Hide AI Explanation' : 'AI Explanation'}</button>
                <button className={`btn ${fav ? 'btn-primary':'btn-outline'}`} onClick={()=>toggleFavorite(r.id)}>{fav? 'Saved':'Save'}</button>
                {r.owner_id && (
                  <>
                    <button className="btn" onClick={()=> onOpenChat(r.owner_id, r.owner_name || 'User', r.id)}>Message</button>
                    <button className="btn btn-outline" onClick={()=> onOpenRate(r.owner_id, r.owner_name || 'User', r.id)}>Rate</button>
                  </>
                )}
              </div>
              {explanations[r.id] && (
                <div style={{ marginTop: 8 }}>
                  <AIExplanation text={explanations[r.id] as string} />
                </div>
              )}
              </div>{/* end content */}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function parseListingCoords(listing: any): { lat: number; lon: number } | null {
  const value = listing.location_wkt || listing.location || '';
  if (value && typeof value === 'object' && value.lat != null && value.lon != null) {
    return { lat: Number(value.lat), lon: Number(value.lon) };
  }
  const match = String(value).match(/POINT\(([-\d\.]+)\s+([-\d\.]+)\)/i);
  if (!match) return null;
  return { lon: Number(match[1]), lat: Number(match[2]) };
}

function RedistributionMapSection(props: {
  listings: Listing[];
  recs: any[];
  userCoords: { lat: number; lon: number };
  onUseDemoCenter: () => void;
  onOpenListingMap: (lat: number, lon: number, title?: string) => void;
  onOpenPriorityMatches: () => void;
}) {
  const { listings, recs, userCoords, onUseDemoCenter, onOpenListingMap, onOpenPriorityMatches } = props;
  const points = listings
    .map(listing => {
      const coords = parseListingCoords(listing);
      if (!coords) return null;
      return { listing, ...coords, isNeed: Boolean((listing as any).is_urgent) };
    })
    .filter(Boolean) as Array<{ listing: Listing; lat: number; lon: number; isNeed: boolean }>;


  const supplies = points.filter(p => !p.isNeed);
  const needs = points.filter(p => p.isNeed);
  const distance = (a: {lat:number; lon:number}, b: {lat:number; lon:number}) => {
    const toRad = (d:number)=>d*Math.PI/180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const aa = Math.sin(dLat/2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon/2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  };
  const bestPair = supplies.flatMap(supply => needs.map(need => {
    const sameCategory = (supply.listing as any).category && (supply.listing as any).category === (need.listing as any).category;
    const km = distance(supply, need);
    const priority = km - (sameCategory ? 6 : 0) - ((supply.listing as any).org_verified ? 2 : 0);
    return { supply, need, sameCategory, km, priority };
  })).sort((a, b) => a.priority - b.priority)[0];

  const topRecommendation = recs[0] || bestPair?.need?.listing || points[0]?.listing;
  const routeLine: [number, number][] | null = bestPair
    ? [[bestPair.supply.lat, bestPair.supply.lon], [bestPair.need.lat, bestPair.need.lon]]
    : null;

  // Fetch real road route from OSRM public API
  const [roadRoute, setRoadRoute] = useState<[number, number][] | null>(null);
  useEffect(() => {
    if (!bestPair) { setRoadRoute(null); return; }
    const { supply, need } = bestPair;
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${supply.lon},${supply.lat};${need.lon},${need.lat}?geometries=geojson&overview=full`
    )
      .then(r => r.json())
      .then(data => {
        const coords = data.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
        if (coords?.length) setRoadRoute(coords.map(([lon, lat]) => [lat, lon]));
      })
      .catch(() => setRoadRoute(null));
  }, [bestPair?.supply.listing.id, bestPair?.need.listing.id]);
  const priorityScore = bestPair
    ? Math.round(Math.max(76, Math.min(98, 96 - bestPair.km * 2.2 + (bestPair.sameCategory ? 4 : 0) + ((bestPair.supply.listing as any).org_verified ? 2 : 0))))
    : topRecommendation ? 84 : 0;
  const whyMatch = bestPair
    ? [
        `${bestPair.km.toFixed(1)} km transfer route`,
        bestPair.sameCategory ? 'category fit confirmed' : 'category requires coordinator confirmation',
        (bestPair.supply.listing as any).org_verified ? 'source organization is verified' : 'source verification needed',
        'urgent need marker is prioritized',
      ].join('; ')
    : 'Create or refresh listings to generate a source-to-need route.';

  return (
    <section>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="heading" style={{ marginBottom: 4 }}>Redistribution Map</div>
          <div className="muted-small">Signature source-to-need route view for coordinator verification. Synthetic demo data.</div>
        </div>
        <div style={{ display:'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={onUseDemoCenter}>Reset Center</button>
          <button className="btn btn-primary" onClick={onOpenPriorityMatches}>Matches</button>
        </div>
      </div>
      <div className="redistribution-map-shell">
        <div style={{ position: 'relative', height: 520, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--card-border)', isolation: 'isolate' }}>
          <MapContainer
            center={[userCoords.lat, userCoords.lon]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
            />
            <CircleMarker
              center={[userCoords.lat, userCoords.lon]}
              radius={10}
              pathOptions={{ color: '#0b5fff', fillColor: '#0b5fff', fillOpacity: 0.9, weight: 2 }}
            >
              <Popup><strong>Nairobi County Operations Center</strong><br />Demo coordinator reference point</Popup>
            </CircleMarker>
            {supplies.map(p => (
              <CircleMarker
                key={p.listing.id}
                center={[p.lat, p.lon]}
                radius={9}
                pathOptions={{ color: '#059669', fillColor: '#059669', fillOpacity: 0.85, weight: 2 }}
              >
                <Popup>
                  <strong>{p.listing.title}</strong><br />
                  {(p.listing as any).org_name || ''}<br />
                  Qty: {(p.listing as any).quantity ?? '—'}
                  {(p.listing as any).org_verified && <><br /><span style={{ color: '#059669' }}>✓ Verified org</span></>}
                </Popup>
              </CircleMarker>
            ))}
            {needs.map(p => (
              <CircleMarker
                key={p.listing.id}
                center={[p.lat, p.lon]}
                radius={11}
                pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.9, weight: 2 }}
              >
                <Popup>
                  <strong style={{ color: '#dc2626' }}>⚠ URGENT</strong><br />
                  <strong>{p.listing.title}</strong><br />
                  {(p.listing as any).org_name || ''}<br />
                  Qty needed: {(p.listing as any).quantity ?? '—'}
                </Popup>
              </CircleMarker>
            ))}
            {(roadRoute || routeLine) && (
              <Polyline
                positions={(roadRoute || routeLine)!}
                pathOptions={{ color: '#22d3ee', weight: 4, dashArray: roadRoute ? undefined : '8 4', opacity: 0.92 }}
              />
            )}
          </MapContainer>
        </div>
        <aside className="map-side-panel" style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {/* Score */}
          <div style={{ textAlign:'center', padding:'24px 16px 16px', borderBottom:'1px solid var(--card-border)' }}>
            <div style={{ fontSize:'4rem', fontWeight:900, lineHeight:1, color: priorityScore >= 85 ? '#059669' : '#0b5fff' }}>
              {priorityScore || '—'}
            </div>
            <div style={{ fontSize:'0.72rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--muted)', marginTop:6 }}>Priority score</div>
          </div>

          {/* Route summary */}
          {bestPair ? (
            <div style={{ padding:'16px', borderBottom:'1px solid var(--card-border)', display:'grid', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:'#059669', flexShrink:0, display:'inline-block' }} />
                <div>
                  <div style={{ fontWeight:700, fontSize:'0.88rem' }}>{(bestPair.supply.listing as any).org_name || bestPair.supply.listing.title}</div>
                  <div className="muted-small">Supply · {(bestPair.supply.listing as any).quantity ?? '—'} units</div>
                </div>
              </div>
              <div style={{ paddingLeft:14, fontSize:'0.78rem', color:'var(--muted)', fontWeight:700 }}>↓ {bestPair.km.toFixed(1)} km route</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:'#dc2626', flexShrink:0, display:'inline-block' }} />
                <div>
                  <div style={{ fontWeight:700, fontSize:'0.88rem' }}>{(bestPair.need.listing as any).org_name || bestPair.need.listing.title}</div>
                  <div className="muted-small" style={{ color:'#dc2626' }}>Urgent need · {(bestPair.need.listing as any).quantity ?? '—'} units</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding:'16px', color:'var(--muted)', fontSize:'0.88rem' }}>Add supply and urgent-need listings to generate a route.</div>
          )}

          {/* Signals */}
          {bestPair && (
            <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--card-border)', display:'flex', flexWrap:'wrap', gap:6 }}>
              {bestPair.sameCategory && <span style={{ padding:'3px 8px', borderRadius:999, fontSize:'0.72rem', fontWeight:700, background:'rgba(5,150,105,0.1)', color:'#059669' }}>Exact category</span>}
              {(bestPair.supply.listing as any).org_verified && <span style={{ padding:'3px 8px', borderRadius:999, fontSize:'0.72rem', fontWeight:700, background:'rgba(11,95,255,0.08)', color:'#0b5fff' }}>Verified source</span>}
              <span style={{ padding:'3px 8px', borderRadius:999, fontSize:'0.72rem', fontWeight:700, background:'rgba(15,23,42,0.05)', color:'var(--muted)' }}>{bestPair.km.toFixed(1)} km</span>
            </div>
          )}

          {/* Actions */}
          <div style={{ padding:'14px 16px', display:'grid', gap:8, marginTop:'auto' }}>
            <button className="btn btn-primary" style={{ width:'100%' }} onClick={onOpenPriorityMatches}>View priority matches</button>
            <div style={{ display:'flex', gap:6 }}>
              <span style={{ fontSize:'0.7rem', color:'var(--muted)', alignSelf:'center' }}>
                <i className="legend-dot supply" style={{ marginRight:4 }} />Supply
              </span>
              <span style={{ fontSize:'0.7rem', color:'var(--muted)', alignSelf:'center', marginLeft:8 }}>
                <i className="legend-dot need" style={{ marginRight:4 }} />Need
              </span>
              <span style={{ fontSize:'0.7rem', color:'var(--muted)', alignSelf:'center', marginLeft:8 }}>
                <i className="legend-dot coordinator" style={{ marginRight:4 }} />HQ
              </span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
