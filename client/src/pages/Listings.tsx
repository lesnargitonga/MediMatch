import React, { useEffect, useState } from 'react';
import API from '../services/api';
import toast from 'react-hot-toast';
import MapModal from '../components/MapModal';
import ChatModal from '../components/ChatModal';
import RatingModal from '../components/RatingModal';
import { useAuth } from '../context/AuthContext';

type Listing = { id:number; title:string; description?:string|null; quantity?:number; created_at?:string; location_wkt?:string; location?:{lat:number;lon:number}|string };
const CATEGORIES = ['all','general','medication','equipment','supplies','other'] as const;

export default function Listings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapOpen, setMapOpen] = useState<{lat:number; lon:number; title?:string} | null>(null);
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState<'newest'|'nearest'>('newest');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('all');
  const [userCoords, setUserCoords] = useState<{lat:number;lon:number}|null>(null);
  const [groupByOrg, setGroupByOrg] = useState<boolean>(true);
  const [visibleCount, setVisibleCount] = useState<number>(20);
  const [chatOpen, setChatOpen] = useState<{ otherUserId: number; otherUserName: string; listingId?: number } | null>(null);
  const [ratingOpen, setRatingOpen] = useState<{ userId: number; userName: string; listingId?: number } | null>(null);

  function extractLatLon(val: any): { lat?: number; lon?: number } {
    if (!val) return {};
    if (typeof val === 'object' && val.lat != null && val.lon != null) { return { lat: Number(val.lat), lon: Number(val.lon) }; }
    const s = String(val); const m = s.match(/POINT\(([-\d\.]+)\s+([-\d\.]+)\)/i);
    if (m) { const lon = Number(m[1]); const lat = Number(m[2]); return { lat, lon }; }
    return {};
  }
  function haversineKm(a: {lat:number; lon:number}, b: {lat:number; lon:number}) {
    const toRad = (d:number)=>d*Math.PI/180; const R=6371; const dLat=toRad(b.lat-a.lat), dLon=toRad(b.lon-a.lon);
    const s1=Math.sin(dLat/2), s2=Math.sin(dLon/2); const aa=s1*s1+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*s2*s2; const c=2*Math.atan2(Math.sqrt(aa),Math.sqrt(1-aa)); return R*c;
  }

  useEffect(() => { (async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (category !== 'all') params.category = category;
      const { data } = await API.get('/listings?select=*');
      setListings(data);
    } catch { toast.error('Failed to load listings'); } finally { setLoading(false); }
  })(); }, [category]);

  const items = listings
    .map(l => { const loc=(l as any).location_wkt||(l as any).location||''; const coords=extractLatLon(loc); const distanceKm=(userCoords&&coords.lat!=null&&coords.lon!=null)?haversineKm(userCoords,{lat:coords.lat!,lon:coords.lon!}):undefined; return { l, coords, distanceKm }; })
    .filter(x => { if (!filterText.trim()) return true; const t = filterText.trim().toLowerCase(); return x.l.title.toLowerCase().includes(t) || (x.l.description||'').toLowerCase().includes(t); })
    .sort((a,b)=> sortBy==='nearest' ? ((a.distanceKm??Infinity)-(b.distanceKm??Infinity)) : ((b.l.created_at?new Date(b.l.created_at).getTime():0)-(a.l.created_at?new Date(a.l.created_at).getTime():0)) );

  // Group listings by organization (fallback to owner_name, then Unknown)
  type Group = { key:string; title:string; verified?:boolean; avg?:number; total?:number; items: typeof items };
  const groups: Group[] = React.useMemo(() => {
    if (!groupByOrg) return [];
    const map = new Map<string, Group>();
    for (const it of items) {
      const l:any = it.l as any;
      const orgName: string | undefined = l.org_name || undefined;
      const ownerName: string | undefined = l.owner_name || undefined;
      const title = orgName?.trim() || ownerName?.trim() || 'Unknown organization';
      const key = title.toLowerCase();
      const verified = Boolean(l.org_verified);
      const avg = l.average_rating != null ? Number(l.average_rating) : undefined;
      const total = l.total_ratings != null ? Number(l.total_ratings) : undefined;
      const g = map.get(key) || { key, title, verified, avg, total, items: [] as any };
      g.items.push(it);
      // Prefer truthy/meta when available
      if (verified) g.verified = true;
      if (typeof avg === 'number') g.avg = avg;
      if (typeof total === 'number') g.total = total;
      map.set(key, g);
    }
    return Array.from(map.values()).sort((a,b)=> a.title.localeCompare(b.title));
  }, [items, groupByOrg]);

  return (
    <section className="fade-in-up">
      <div className="dashboard-command-hero" style={{ marginBottom: 12 }}>
        <div className="hero-copy">
          <span className="lesnar-badge" style={{ marginBottom: 10 }}>Geospatial inventory</span>
          <div className="heading" style={{ marginTop: 0 }}>Redistribution Listings</div>
          <div className="muted" style={{ maxWidth: 680 }}>Surplus and need signals from synthetic public-health facilities, grouped by organization for coordinator review.</div>
        </div>
        <div className="command-hero-signal" aria-hidden="true">
          <span>Visible signals</span>
          <strong>{items.length} item{items.length!==1?'s':''}</strong>
          <small>{category!=='all' ? `Filtered: ${category}` : 'All categories'}</small>
        </div>
      </div>
      {/* Sticky filter bar */}
      <div className="card" style={{ position:'sticky', top: 58, zIndex: 5, boxShadow:'0 6px 12px rgba(0,0,0,0.04)', marginBottom: 12, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', backdropFilter:'saturate(180%) blur(6px)' }}>
        <input placeholder="Search by title or description" value={filterText} onChange={e=>setFilterText(e.target.value)} style={{ flex:'1 1 240px' }} />
        <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)}>
          <option value="newest">Sort: Newest</option>
          <option value="nearest">Sort: Nearest</option>
        </select>
        <select value={category} onChange={e=>setCategory(e.target.value as any)}>
          {CATEGORIES.map(c => (<option key={c} value={c}>{c === 'all' ? 'All categories' : `Category: ${c}`}</option>))}
        </select>
        <label style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          <input type="checkbox" checked={groupByOrg} onChange={e=>setGroupByOrg(e.target.checked)} /> <span>Group by organization</span>
        </label>
        <button className="btn" onClick={() => {
          if (!('geolocation' in navigator)) { toast.error('Geolocation not supported'); return; }
          navigator.geolocation.getCurrentPosition(
            pos => setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => toast.error('Could not get your location')
          );
        }}>{userCoords ? 'Location set' : 'Use my location'}</button>
      </div>
      {loading ? (
        <div className="listings">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card">
              <div className="skeleton" style={{ width:'40%', height:14, marginBottom:8 }} />
              <div className="skeleton" style={{ width:'90%', height:12, marginBottom:6 }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="empty card">
          <img src="/images/empty-listings.svg" alt="No listings" />
          <span className="muted">No listings to show.</span>
        </div>
      ) : groupByOrg ? (
        <div className="listings">
          {groups.map(group => (
            <div key={group.key} className="card" style={{ padding: 12, marginBottom: 16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <h3 style={{ margin: 0 }}>{group.title}</h3>
                  {group.verified && <span className="chip">Verified</span>}
                  {typeof group.avg === 'number' && typeof group.total === 'number' && (
                    <span className="chip">⭐ {group.avg.toFixed(1)} ({group.total})</span>
                  )}
                </div>
                <div className="muted-small">{group.items.length} listing{group.items.length!==1?'s':''}</div>
              </div>
              <div style={{ height:1, background:'var(--card-border)', margin:'4px 0 10px' }} />
              {/* No group banner visuals */}
              <div style={{ display:'grid', gap: 12 }}>
                {group.items.slice(0, visibleCount).map(({ l, coords, distanceKm }) => (
                  <div key={l.id} className="listing-item">
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                      <strong>{l.title}</strong>
                      <div className="muted-small">{l.created_at ? new Date(l.created_at).toLocaleString() : ''}</div>
                    </div>
                    <div className="muted" style={{ marginBottom: 6 }}>{l.description || 'no description'}</div>
                    <div className="chips">
                        <span className="chip"><span className="dot" /> Qty: {(l as any).quantity ?? 1}</span>
                        {(l as any).category && (<span className="chip"><span className="dot" /> {(l as any).category}</span>)}
                        {typeof distanceKm === 'number' && Number.isFinite(distanceKm) && (
                          <span className="chip"><span className="dot" /> {distanceKm.toFixed(1)} km away</span>
                        )}
                        {(l as any).location_wkt || (l as any).location ? (
                          <button className="btn btn-secondary on-image" onClick={() => setMapOpen({ lat: coords.lat!, lon: coords.lon!, title: l.title })}>View location</button>
                        ) : null}
                        {(l as any).owner_id && user && (user.id !== (l as any).owner_id) && (
                          <>
                            <button
                              className="btn"
                              onClick={() => setChatOpen({ otherUserId: (l as any).owner_id, otherUserName: (l as any).owner_name || (l as any).owner_email || 'User', listingId: (l as any).id })}
                            >Message</button>
                            <button
                              className="btn btn-outline"
                              onClick={() => setRatingOpen({ userId: (l as any).owner_id, userName: (l as any).owner_name || (l as any).owner_email || 'User', listingId: (l as any).id })}
                            >Rate</button>
                          </>
                        )}
                      </div>
                  </div>
                ))}
              </div>
              {group.items.length > visibleCount && (
                <div style={{ display:'flex', justifyContent:'center', marginTop: 8 }}>
                  <button className="btn btn-outline" onClick={()=> setVisibleCount(v => v + 20)}>Load more</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="listings">
          {items.slice(0, visibleCount).map(({ l, coords, distanceKm }) => (
            <div key={l.id} className="listing-item">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                <strong>{l.title}</strong>
                <div className="muted-small">{l.created_at ? new Date(l.created_at).toLocaleString() : ''}</div>
              </div>
              <div className="muted">{l.description || 'no description'}</div>
              <div className="chips">
                <span className="chip"><span className="dot" /> Qty: {(l as any).quantity ?? 1}</span>
                {(l as any).category && (<span className="chip"><span className="dot" /> {(l as any).category}</span>)}
                {typeof distanceKm === 'number' && Number.isFinite(distanceKm) && (
                  <span className="chip"><span className="dot" /> {distanceKm.toFixed(1)} km away</span>
                )}
                {(l as any).location_wkt || (l as any).location ? (
                  <button className="btn btn-secondary on-image" onClick={() => setMapOpen({ lat: coords.lat!, lon: coords.lon!, title: l.title })}>View location</button>
                ) : null}
                {(l as any).owner_id && user && (user.id !== (l as any).owner_id) && (
                  <>
                    <button
                      className="btn"
                      onClick={() => setChatOpen({ otherUserId: (l as any).owner_id, otherUserName: (l as any).owner_name || (l as any).owner_email || 'User', listingId: (l as any).id })}
                    >Message</button>
                    <button
                      className="btn btn-outline"
                      onClick={() => setRatingOpen({ userId: (l as any).owner_id, userName: (l as any).owner_name || (l as any).owner_email || 'User', listingId: (l as any).id })}
                    >Rate</button>
                  </>
                )}
              </div>
            </div>
          ))}
          {items.length > visibleCount && (
            <div style={{ display:'flex', justifyContent:'center', marginTop: 8 }}>
              <button className="btn btn-outline" onClick={()=> setVisibleCount(v => v + 20)}>Load more</button>
            </div>
          )}
        </div>
      )}
      {mapOpen && <MapModal lat={mapOpen.lat} lon={mapOpen.lon} title={mapOpen.title} onClose={() => setMapOpen(null)} />}
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
    </section>
  );
}
