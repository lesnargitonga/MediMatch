import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import toast from 'react-hot-toast';

type Stats = { users:number; listings:number; matches:number };
type UserRow = { id:number; email:string; name?:string|null; role:'user'|'admin'; org_name?:string|null; org_type?:string|null; org_license_id?:string|null; org_verified?:boolean; created_at?:string };
type ListingRow = { id:number; owner_id:number; title:string; category?:string|null; quantity?:number|null; is_hidden?:boolean; location_wkt?:string|null; created_at?:string };

// Synthetic fallback so the Review screen stays presentable when the
// Postgres-backed admin reporting endpoints aren't reachable (e.g. mock-DB demo mode).
const DEMO_STATS: Stats = { users: 4, listings: 4, matches: 6 };
const DEMO_USERS: UserRow[] = [
  { id: 1001, email: 'coordinator@kenyatta.org', name: 'Kenyatta Coordinator', role: 'user', org_name: 'Kenyatta National Hospital', org_type: 'Hospital', org_license_id: 'KNH-2025', org_verified: true, created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 1002, email: 'lead@kiberasouth.org', name: 'Kibera South Lead', role: 'user', org_name: 'Kibera South Health Centre', org_type: 'Clinic', org_license_id: '', org_verified: false, created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 1003, email: 'ops@mbagathi.org', name: 'Mbagathi Ops', role: 'user', org_name: 'Mbagathi County Hospital', org_type: 'Hospital', org_license_id: 'MCH-2025', org_verified: true, created_at: new Date(Date.now() - 9 * 86400000).toISOString() },
];
const DEMO_LISTINGS: ListingRow[] = [
  { id: 9001, owner_id: 1001, title: 'Surplus nitrile gloves', category: 'supplies', quantity: 800, is_hidden: false, created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 9002, owner_id: 1002, title: 'Urgent wound-care supplies needed', category: 'supplies', quantity: 120, is_hidden: false, created_at: new Date(Date.now() - 45 * 60000).toISOString() },
  { id: 9003, owner_id: 1003, title: 'Portable oxygen concentrator available', category: 'equipment', quantity: 2, is_hidden: false, created_at: new Date(Date.now() - 5 * 3600000).toISOString() },
];

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'overview'|'users'|'listings'>('overview');
  const [stats, setStats] = useState<Stats| null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [usingDemoData, setUsingDemoData] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const [s, u, l] = await Promise.all([
          API.get('/admin/stats'),
          API.get('/admin/users'),
          API.get('/admin/listings')
        ]);
        setStats(s.data);
        setUsers(u.data || []);
        setListings(l.data || []);
        setUsingDemoData(false);
      } catch (e:any) {
        // Admin reporting is Postgres-only; fall back to a labeled synthetic
        // scenario so the Review screen stays presentable in mock-DB demos.
        setStats(DEMO_STATS);
        setUsers(DEMO_USERS);
        setListings(DEMO_LISTINGS);
        setUsingDemoData(true);
      }
    })();
  }, [isAdmin]);

  const verifyable = useMemo(() => users.filter(u => !u.org_verified && u.role !== 'admin'), [users]);

  if (!isAdmin) {
    return (
      <section>
        <div className="heading">Admin</div>
        <div className="card danger">You are not authorized to view this page.</div>
      </section>
    );
  }

  const updateUser = async (id:number, patch: Partial<UserRow>) => {
    if (usingDemoData) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
      toast.success('User updated (demo data)');
      return;
    }
    try {
      await API.put(`/admin/users/${id}`, patch);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
      toast.success('User updated');
    } catch (e:any) {
      toast.error(e?.response?.data?.error || 'Failed to update user');
    }
  };

  const toggleListingHidden = async (id:number, is_hidden:boolean) => {
    if (usingDemoData) {
      setListings(prev => prev.map(l => l.id === id ? { ...l, is_hidden } : l));
      toast.success('Listing updated (demo data)');
      return;
    }
    try {
      await API.put(`/admin/listings/${id}/hide`, { is_hidden });
      setListings(prev => prev.map(l => l.id === id ? { ...l, is_hidden } : l));
    } catch { toast.error('Failed to update listing'); }
  };

  const deleteListing = async (id:number) => {
    if (!confirm('Delete listing permanently?')) return;
    if (usingDemoData) {
      setListings(prev => prev.filter(l => l.id !== id));
      toast.success('Listing deleted (demo data)');
      return;
    }
    try {
      await API.delete(`/admin/listings/${id}`);
      setListings(prev => prev.filter(l => l.id !== id));
    } catch { toast.error('Failed to delete listing'); }
  };

  return (
    <section className="fade-in-up">
      <div className="dashboard-command-hero" style={{ marginBottom: 12 }}>
        <div className="hero-copy">
          <span className="lesnar-badge" style={{ marginBottom: 10 }}>Coordinator review</span>
          <div className="heading" style={{ marginTop: 0 }}>Verification &amp; Oversight</div>
          <div className="muted" style={{ maxWidth: 680 }}>Verify organizations, audit listings, and export reporting before any redistribution is approved. Synthetic demo data only.</div>
        </div>
        <div className="command-hero-signal" aria-hidden="true">
          <span>Pending review</span>
          <strong>{verifyable.length} organization{verifyable.length === 1 ? '' : 's'}</strong>
          <small>Awaiting coordinator verification</small>
        </div>
      </div>
      <div className="research-banner" style={{ marginBottom: 14 }}>
        <strong>Prototype boundary:</strong> Synthetic demo data only. No patient records. Verification decisions here are advisory and must reflect real coordinator judgment.
      </div>
      {usingDemoData && (
        <div className="research-banner" style={{ marginBottom: 14 }}>
          <strong>Demo mode:</strong> Reporting database not connected — showing a synthetic verification scenario.
        </div>
      )}
      <div className="tabs" role="tablist">
        <button className={`tab ${tab==='overview'?'active':''}`} onClick={()=>setTab('overview')}>Overview</button>
        <button className={`tab ${tab==='users'?'active':''}`} onClick={()=>setTab('users')}>Users</button>
        <button className={`tab ${tab==='listings'?'active':''}`} onClick={()=>setTab('listings')}>Listings</button>
      </div>

      {tab==='overview' && (
        <div className="two-column">
          <div className="card">
            <div className="subtle">At a glance</div>
            <div style={{ display:'flex', gap:12, marginTop:12, flexWrap:'wrap' }}>
              <div className="badge gradient">Users: {stats?.users ?? '—'}</div>
              <div className="badge gradient">Listings: {stats?.listings ?? '—'}</div>
              <div className="badge gradient">Matches: {stats?.matches ?? '—'}</div>
            </div>
            <div style={{ display:'flex', gap:8, marginTop: 12 }}>
              <button className="btn" onClick={async () => {
                const triggerDownload = (data: string | Blob) => {
                  const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `summary-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                };
                if (usingDemoData) {
                  const lines = ['metric,value', `total_users,${stats?.users ?? 0}`, `total_listings,${stats?.listings ?? 0}`, `matches,${stats?.matches ?? 0}`, `verified_orgs,${users.filter(u=>u.org_verified).length}`];
                  triggerDownload(lines.join('\n'));
                  toast.success('Report downloaded (demo data)');
                  return;
                }
                try {
                  const res = await API.get('/admin/reports/summary.csv', { responseType: 'blob' });
                  triggerDownload(res.data);
                  toast.success('Report downloaded');
                } catch (e:any) {
                  toast.error(e?.response?.data?.error || 'Failed to download report');
                }
              }}>Download CSV Report</button>
            </div>
          </div>
          <div className="card">
            <div className="subtle">Organizations pending verification</div>
            {verifyable.length === 0 ? (
              <div className="muted-small" style={{ marginTop: 8 }}>No pending profiles.</div>
            ) : (
              <div style={{ display:'grid', gap:10, marginTop: 10 }}>
                {verifyable.map(u => (
                  <div key={u.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <strong>{u.org_name || u.name || u.email}</strong>
                      <div className="muted-small">{u.org_type || '—'} • License: {u.org_license_id || '—'}</div>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="btn btn-outline" onClick={()=>updateUser(u.id, { org_verified: true })}>Verify</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab==='users' && (
        <div className="card">
          <div className="subtle">All users</div>
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr className="muted-small">
                  <th style={{ textAlign:'left', padding: '6px 8px' }}>User</th>
                  <th style={{ textAlign:'left', padding: '6px 8px' }}>Role</th>
                  <th style={{ textAlign:'left', padding: '6px 8px' }}>Org</th>
                  <th style={{ textAlign:'left', padding: '6px 8px' }}>Verified</th>
                  <th style={{ textAlign:'right', padding: '6px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderTop:'1px solid var(--card-border)' }}>
                    <td style={{ padding: '8px' }}>
                      <div><strong>{u.name || u.email}</strong></div>
                      <div className="muted-small">{u.email}</div>
                    </td>
                    <td style={{ padding: '8px' }}>{u.role}</td>
                    <td style={{ padding: '8px' }}>{u.org_name || '—'}</td>
                    <td style={{ padding: '8px' }}>{u.org_verified ? 'Yes' : 'No'}</td>
                    <td style={{ padding: '8px', textAlign:'right' }}>
                      <div style={{ display:'inline-flex', gap:8 }}>
                        <button className="btn btn-outline" onClick={()=>updateUser(u.id, { role: u.role==='admin'?'user':'admin' })}>{u.role==='admin'?'Demote':'Promote'}</button>
                        {!u.org_verified && (<button className="btn btn-outline" onClick={()=>updateUser(u.id, { org_verified: true })}>Verify</button>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='listings' && (
        <div className="card">
          <div className="subtle">Latest listings</div>
          <div style={{ display:'grid', gap:12, marginTop: 12 }}>
            {listings.map(l => (
              <div key={l.id} className="listing-item">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                  <strong>{l.title}</strong>
                  <div className="muted-small">{l.created_at ? new Date(l.created_at).toLocaleString() : ''}</div>
                </div>
                <div className="chips">
                  <span className="chip"><span className="dot" /> {l.category || 'general'}</span>
                  <span className="chip"><span className="dot" /> Qty: {l.quantity ?? 1}</span>
                </div>
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  <button className="btn btn-outline" onClick={()=>toggleListingHidden(l.id, !(l.is_hidden===true))}>{l.is_hidden ? 'Unhide' : 'Hide'}</button>
                  <button className="btn btn-outline" onClick={()=>deleteListing(l.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
