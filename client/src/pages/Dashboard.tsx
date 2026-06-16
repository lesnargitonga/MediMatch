import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import API from '../services/api';
import MapModal from '../components/MapModal';
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
    description: 'Facility A has unopened gloves ready for redistribution.',
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
    description: 'Facility B reports an immediate dressing and bandage shortfall.',
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
    description: 'Facility C has working equipment available for short-term transfer.',
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
    description: 'Facility D is farther away but verified and marked urgent.',
    quantity: 60,
    category: 'medication',
    is_urgent: true,
    org_name: 'Mama Lucy Kibaki Hospital',
    org_verified: true,
    location_wkt: 'POINT(36.8944 -1.2617)',
    created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
];

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
  // Recommendations (match suggestions)
  const [recs, setRecs] = useState<any[]>([]);
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
    if (!['overview', 'browse', 'map'].includes(tab)) return;
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

  const listingsForSnapshot = listings.length ? listings : DEMO_MAP_LISTINGS;
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
      <div className="hero bg-image command-dashboard-hero" style={{ marginBottom: 12, ['--hero-bg' as any]: 'url(/images/pic-3.jpeg)' }}>
        <div className="hero-copy">
          <span className="demo-pill" style={{ marginBottom: 10 }}>Conference demo — synthetic data</span>
          <div className="heading" style={{ marginTop: 0 }}>Redistribution Command Center</div>
          <div className="muted" style={{ maxWidth: 680 }}>This view uses synthetic demo data for a Nairobi County case study — no real patient or facility data is included.</div>
        </div>
      </div>
      <div className="research-banner" style={{ marginBottom: 14 }}>
        <strong>Conference Demo Mode:</strong> Synthetic demo data only — no real patient or facility data is included.
      </div>
      <div style={{ display:'flex', gap:8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button className={`btn ${tab==='overview'?'btn-primary':''}`} onClick={()=>setTab('overview')}>Overview</button>
        {role !== 'admin' && (
          <button className={`btn ${tab==='create'?'btn-primary':''}`} onClick={()=>setTab('create')}>Post Supply / Need</button>
        )}
        <button className={`btn ${tab==='browse'?'btn-primary':''}`} onClick={()=>setTab('browse')}>Browse</button>
        <button className={`btn ${tab==='suggested'?'btn-primary':''}`} onClick={()=>setTab('suggested')}>Priority Matches</button>
        <button className={`btn ${tab==='map'?'btn-primary':''}`} onClick={()=>setTab('map')}>Map</button>
        <button className={`btn ${tab==='messages'?'btn-primary':''}`} onClick={()=>setTab('messages')}>Messages</button>
        <button className={`btn ${tab==='account'?'btn-primary':''}`} onClick={()=>setTab('account')}>Account</button>
        {role === 'admin' && (
          <button className={`btn ${tab==='admin'?'btn-primary':''}`} onClick={()=>setTab('admin')}>Coordinator Review</button>
        )}
      </div>

      {tab==='overview' && (
        <section style={{ marginBottom: 20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <div>
              <div className="heading" style={{ marginBottom: 4 }}>Today&apos;s Redistribution Snapshot</div>
              <div className="muted-small">Live listing signals ranked around the Nairobi County demo coordinator point. Demo Data — synthetic Nairobi County scenario.</div>
            </div>
            {loadingListings && <span className="muted-small">Refreshing snapshot...</span>}
          </div>
          <div className="snapshot-grid">
            <div className="metric-card alert">
              <span>Urgent needs</span>
              <strong>{urgentNeeds}</strong>
              <small>Marked for immediate redistribution</small>
            </div>
            <div className="metric-card supply">
              <span>Available supplies</span>
              <strong>{availableSupplies}</strong>
              <small>Open supply-side listings</small>
            </div>
            <div className="metric-card">
              <span>Nearest match</span>
              <strong>{nearestListing?.distanceKm != null ? `${nearestListing.distanceKm.toFixed(1)} km` : 'Set location'}</strong>
              <small>{nearestListing?.listing.title || 'Using Nairobi demo center'}</small>
            </div>
            <div className="metric-card trust">
              <span>Verified organizations</span>
              <strong>{verifiedOrgs}</strong>
              <small>Trusted facilities in active flow</small>
            </div>
            <div className="metric-card">
              <span>Average match radius</span>
              <strong>{averageRadius ? `${averageRadius.toFixed(1)} km` : '0 km'}</strong>
              <small>Across visible geospatial listings</small>
            </div>
            <div className="metric-card">
              <span>Recent activity</span>
              <strong>{recentActivity}</strong>
              <small>Listings updated in the last 7 days</small>
            </div>
          </div>
          {/* AI-assisted coordinator brief (local, deterministic prototype) */}
          <AICoordinatorBrief
            stats={{ urgentNeeds, availableSupplies, verifiedOrgs, averageRadius, recentActivity }}
            topListing={nearestListing?.listing}
          />
          <div className="command-strip" style={{ marginTop: 14 }}>
            <div>
              <strong>Coordinate the next redistribution decision</strong>
              <div className="muted-small">Open the map or priority queue to inspect proximity, urgency, trust, and supply adequacy together.</div>
            </div>
            <div style={{ display:'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={()=>setTab('map')}>Open Redistribution Map</button>
              <button className="btn btn-outline" onClick={()=>setTab('suggested')}>View Priority Matches</button>
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
          </div>
        </section>
      )}

  {tab==='create' && role !== 'admin' && (
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="subtle" style={{ marginBottom: 8 }}>{editingId ? 'Edit Listing' : 'Post Supply / Need'}</div>
        <p className="muted" style={{ marginTop: 0 }}>Provide a clear title, optional description, quantity, and where the items are located.</p>
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
          ) : listings.length === 0 ? (
            <div className="empty card">
              <img src="/images/pic-2.png" alt="No listings" />
              <span className="muted">No listings yet — create one to get started.</span>
            </div>
          ) : (
          <div className="listings">
            {(() => {
              const items = listings.map((l: Listing) => {
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
                      {typeof distanceKm === 'number' && Number.isFinite(distanceKm) && (
                        <span className="chip"><span className="dot" /> {distanceKm.toFixed(1)} km away</span>
                      )}
                      {loc ? <span className="chip"><span className="dot" /> {String(loc).slice(0, 64)}</span> : null}
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
          listings={listings.length ? listings : DEMO_MAP_LISTINGS}
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
    try {
      const params: any = { limit: 25 };
      if (userCoords) { params.lat = userCoords.lat; params.lon = userCoords.lon; params.max_km = recRadius; }
      if (recCategory !== 'all') params.category = recCategory;
      const qs = new URLSearchParams(params).toString();
      const res = await API.get(`/matches/suggest?${qs}`);
      setRecs(res.data?.suggestions || []);
      setLastFetched(Date.now());
    } catch (e:any) {
      setError(e?.response?.data?.error || 'Failed to load suggestions');
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
          <div className="subtle">Priority Redistribution Matches</div>
          <div className="muted-small">Ranked by proximity, need severity, trust, recency, verification, category fit, and supply adequacy</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.75rem' }}>
            <input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)} /> Auto refresh
          </label>
          <button className="btn btn-outline" onClick={onOpenShowcaseMap}>Open Map</button>
          <button className="btn btn-outline" onClick={fetchRecs} disabled={loadingRecs}>{loadingRecs? 'Loading…':'Refresh'}</button>
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
          const reasonParts = [
            distanceKm > 0 ? `is within ${distanceKm.toFixed(1)} km` : null,
            r.is_urgent ? 'is marked urgent' : null,
            recCategory !== 'all' && r.category === recCategory ? 'is category-matched' : null,
            r.org_verified ? 'was posted by a verified organization' : null,
            r.quantity != null ? `has supply adequacy of ${r.quantity} unit${Number(r.quantity) === 1 ? '' : 's'}` : null,
          ].filter(Boolean);
          const reason = reasonParts.length
            ? `Recommended because it ${reasonParts.join(', ')}.`
            : 'Recommended because its combined redistribution signals rank above the current queue.';
          const components = [
            { key: 'c_distance', label: 'Proximity advantage', weight: 0.35 },
            { key: 'c_urgency', label: 'Need severity', weight: 0.20 },
            { key: 'c_reputation', label: 'Facility trust signal', weight: 0.20 },
            { key: 'c_recency', label: 'Recency', weight: 0.15 },
            { key: 'c_verified', label: 'Organization verification', weight: 0.05 },
            { key: 'c_category', label: 'Category match', weight: 0.04 },
            { key: 'c_quantity', label: 'Supply adequacy', weight: 0.01 },
          ];
          return (
            <div key={r.id} className="listing-item">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8 }}>
                <strong>{r.title}</strong>
                <span className="priority-score">Redistribution Priority Score {Math.round(score * 100)}</span>
              </div>
              <div className="muted" style={{ marginBottom: 4 }}>{r.description || 'no description'}</div>
              <div className="match-reason">{reason}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                {r.is_urgent && <span className="badge" style={{ background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff' }}>URGENT</span>}
                {Number.isFinite(distanceKm) && distanceKm > 0 && <span className="chip">{distanceKm.toFixed(1)} km</span>}
                {r.quantity != null && <span className="chip">Qty: {r.quantity}</span>}
                {r.org_verified && <span className="badge" style={{ background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff' }}>✓ Verified</span>}
                {r.average_rating > 0 && (
                  <span className="chip" title={`Rating ${toNum(r.average_rating).toFixed(1)} from ${r.total_ratings} review(s)`}>⭐ {toNum(r.average_rating).toFixed(1)} ({r.total_ratings})</span>
                )}
              </div>
              <details style={{ marginBottom: 8 }}>
                <summary className="muted-small" style={{ cursor:'pointer' }}>Model signal breakdown</summary>
                <div className="score-grid">
                  {components.map(c => (
                    <div key={c.key} className="score-component">
                      <div style={{ fontSize:'0.75rem', fontWeight:700 }}>{c.label}</div>
                      <div className="score-bar"><span style={{ width: `${Math.round(toNum(r[c.key]) * 100)}%` }} /></div>
                      <div style={{ fontSize:'0.7rem' }}>{toNum(r[c.key]).toFixed(2)} signal | {(toNum(r[c.key]) * c.weight).toFixed(3)} weighted</div>
                    </div>
                  ))}
                </div>
              </details>
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
                }}>{explanations[r.id] ? 'Hide explanation' : 'Why this match?'}</button>
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

  const lats = [...points.map(p => p.lat), userCoords.lat];
  const lons = [...points.map(p => p.lon), userCoords.lon];
  const minLat = Math.min(...lats) - 0.01;
  const maxLat = Math.max(...lats) + 0.01;
  const minLon = Math.min(...lons) - 0.01;
  const maxLon = Math.max(...lons) + 0.01;
  const project = (lat: number, lon: number) => ({
    x: 8 + ((lon - minLon) / Math.max(0.001, maxLon - minLon)) * 84,
    y: 8 + ((maxLat - lat) / Math.max(0.001, maxLat - minLat)) * 84,
  });

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
  const topRecommendationCoords = topRecommendation ? parseListingCoords(topRecommendation) : null;
  const centerPoint = project(userCoords.lat, userCoords.lon);
  const lineStart = bestPair ? project(bestPair.supply.lat, bestPair.supply.lon) : centerPoint;
  const lineEnd = bestPair ? project(bestPair.need.lat, bestPair.need.lon) : topRecommendationCoords ? project(topRecommendationCoords.lat, topRecommendationCoords.lon) : null;

  return (
    <section>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="heading" style={{ marginBottom: 4 }}>Redistribution Map</div>
          <div className="muted-small">Nairobi County demo region with supply points, urgent needs, and the current top transfer line.</div>
        </div>
        <div style={{ display:'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={onUseDemoCenter}>Use demo center</button>
          <button className="btn btn-primary" onClick={onOpenPriorityMatches}>Priority Matches</button>
        </div>
      </div>
      <div className="redistribution-map-shell">
        <div className="redistribution-map">
          <svg className="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {lineEnd && (
              <line
                x1={lineStart.x}
                y1={lineStart.y}
                x2={lineEnd.x}
                y2={lineEnd.y}
                stroke="rgba(11,95,255,0.82)"
                strokeWidth="0.9"
                strokeDasharray="2 1.8"
              />
            )}
          </svg>
          <button
            className="map-marker coordinator"
            style={{ left: `${centerPoint.x}%`, top: `${centerPoint.y}%` }}
            title="Nairobi County Operations Center"
          />
          {points.map(point => {
            const pos = project(point.lat, point.lon);
            const markerClass = point.isNeed ? 'need' : 'supply';
            return (
              <button
                key={point.listing.id}
                className={`map-marker ${markerClass}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                title={point.listing.title}
                onClick={() => onOpenListingMap(point.lat, point.lon, point.listing.title)}
              />
            );
          })}
          <div className="map-region-label">Nairobi County Demo Region</div>
        </div>
        <aside className="map-side-panel">
          <div className="subtle">Top Recommendation</div>
          <h3>{topRecommendation?.title || 'No active recommendation'}</h3>
          <p className="muted">
            {bestPair
              ? `${bestPair.supply.listing.title} can support ${bestPair.need.listing.title} across ${bestPair.km.toFixed(1)} km${bestPair.sameCategory ? ' with a category match' : ''}.`
              : topRecommendation
                ? 'The highest-ranked visible listing is ready for coordinator review.'
                : 'Create listings to populate the live redistribution map.'}
          </p>
          <div className="chips">
            <span className="chip"><span className="dot" /> {supplies.length} supply point{supplies.length === 1 ? '' : 's'}</span>
            <span className="chip warn"><span className="dot" /> {needs.length} urgent need{needs.length === 1 ? '' : 's'}</span>
            {bestPair && <span className="chip"><span className="dot" /> {bestPair.km.toFixed(1)} km route</span>}
          </div>
          <div className="map-legend">
            <span><i className="legend-dot supply" /> Available supply</span>
            <span><i className="legend-dot need" /> Urgent need</span>
            <span><i className="legend-dot coordinator" /> Coordinator point</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
