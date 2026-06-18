
import React, { useState, useEffect } from 'react';
import API from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Auth() {
  const [adminCode, setAdminCode] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('');
  const [orgLicenseId, setOrgLicenseId] = useState('');
  const nav = useNavigate();
  const { user, refresh } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = () => {
    if (isLogin) return email.trim().length > 3 && password.trim().length >= 6;
    if (adminCode.trim() === 'ADMIN2025') return name.trim().length > 0 && email.trim().length > 3 && password.trim().length >= 6;
    return name.trim().length > 0 && email.trim().length > 3 && password.trim().length >= 6 && orgName.trim().length >= 2 && orgType.trim().length >= 2 && orgLicenseId.trim().length >= 2;
  };

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await API.post('/auth/login', { email, password }, { withCredentials: true });
      await refresh();
      toast.success('Welcome back!');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Login failed. Check credentials.';
      setError(msg); toast.error(msg);
    } finally { setLoading(false); }
  }

  async function doRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const payload: any = adminCode.trim() === 'ADMIN2025'
        ? { email, password, name, role: 'admin', org_name: 'AdminOrg', org_type: 'Admin', org_license_id: 'ADM123' }
        : { email, password, name, role: 'user', org_name: orgName, org_type: orgType, org_license_id: orgLicenseId };
      await API.post('/auth/register', payload, { withCredentials: true });
      toast.success('Account created! Please log in.');
      setIsLogin(true); setInfo('Account created. Sign in below.');
      try { nav('/login'); } catch {}
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Registration failed.';
      setError(msg); toast.error(msg);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (user) { nav(user.role === 'admin' ? '/dashboard' : '/'); }
  }, [user, nav]);

  return (
    <div className="auth-split">
      {/* ── Left brand panel ── */}
      <div className="auth-brand-panel">
        <div>
          <div className="lesnar-badge" style={{ marginBottom: 28 }}>Lesnar AI · Public Health</div>
          <h1 className="auth-brand-heading">
            Surplus found.<br />Route scored.<br />Waiting for you.
          </h1>
          <p className="auth-brand-tagline">
            Real-time medical supply redistribution for public health coordinators across Nairobi County.
          </p>
          <div className="auth-stat-row">
            <div className="auth-stat"><div className="num">96</div><div className="label">Max score</div></div>
            <div className="auth-stat"><div className="num">2.0<span style={{fontSize:'1rem'}}>km</span></div><div className="label">Nearest match</div></div>
            <div className="auth-stat"><div className="num">4</div><div className="label">Facilities</div></div>
          </div>
        </div>

        {/* Visual illustration — abstract route network */}
        <svg viewBox="0 0 320 180" style={{ width:'100%', maxWidth:360, margin:'28px 0', opacity:0.85 }} aria-hidden="true">
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22C55E" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          {/* Route lines */}
          <path d="M 50 90 Q 120 40 180 80 Q 240 120 280 70" stroke="url(#lineGrad)" strokeWidth="2" fill="none" strokeDasharray="6 3" opacity="0.6">
            <animate attributeName="stroke-dashoffset" from="0" to="-50" dur="4s" repeatCount="indefinite"/>
          </path>
          <path d="M 80 130 Q 140 160 200 140 Q 250 125 290 145" stroke="#DC2626" strokeWidth="1.5" fill="none" strokeDasharray="5 3" opacity="0.4">
            <animate attributeName="stroke-dashoffset" from="0" to="-40" dur="5s" repeatCount="indefinite"/>
          </path>
          {/* Supply nodes — green */}
          <circle cx="50" cy="90" r="10" fill="#059669" filter="url(#glow)"/>
          <circle cx="50" cy="90" r="18" fill="none" stroke="#059669" strokeWidth="1.5" opacity="0.3">
            <animate attributeName="r" from="10" to="22" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="80" cy="130" r="8" fill="#10b981" filter="url(#glow)"/>
          {/* Need nodes — red */}
          <circle cx="180" cy="80" r="12" fill="#DC2626" filter="url(#glow)"/>
          <circle cx="180" cy="80" r="20" fill="none" stroke="#DC2626" strokeWidth="1.5" opacity="0.3">
            <animate attributeName="r" from="12" to="26" dur="2.4s" repeatCount="indefinite"/>
            <animate attributeName="opacity" from="0.5" to="0" dur="2.4s" repeatCount="indefinite"/>
          </circle>
          <circle cx="280" cy="70" r="9" fill="#D97706" filter="url(#glow)"/>
          <circle cx="200" cy="140" r="7" fill="#DC2626" opacity="0.8"/>
          {/* Score badge */}
          <rect x="152" y="44" width="44" height="22" rx="11" fill="rgba(217,119,6,0.9)"/>
          <text x="174" y="59" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="900">92</text>
        </svg>

        <div className="auth-brand-quote">
          "Six factors. One number. Every transfer verified by a human coordinator."
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-form-panel">
        <div style={{ maxWidth: 400, width: '100%', margin: '0 auto' }}>
          {/* Toggle */}
          <div style={{ display:'flex', gap:4, marginBottom:28, background:'var(--surface-2)', borderRadius:999, padding:4, border:'1px solid var(--card-border)' }}>
            {(['login','register'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => { setIsLogin(mode==='login'); setError(null); setInfo(null); }}
                style={{
                  flex:1, padding:'9px 0', border:'none', borderRadius:999,
                  fontWeight:700, fontSize:'0.875rem', cursor:'pointer',
                  background: (isLogin ? mode==='login' : mode==='register') ? 'var(--primary)' : 'transparent',
                  color: (isLogin ? mode==='login' : mode==='register') ? '#fff' : 'var(--muted)',
                  transition: 'all 0.2s ease',
                  boxShadow: (isLogin ? mode==='login' : mode==='register') ? '0 2px 8px var(--primary-glow)' : 'none',
                }}
              >
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 4 }}>
            <h2 style={{ margin:'0 0 6px', fontSize:'1.5rem', fontWeight:900, letterSpacing:'-0.02em' }}>
              {isLogin ? 'Welcome back' : 'Join MediMatch'}
            </h2>
            <p className="muted-small">{isLogin ? 'Demo: lesnar@admin.com / admin123' : 'Register your organization or create an admin account.'}</p>
          </div>

          {error && <div style={{ background:'var(--urgent-subtle)', border:'1px solid rgba(220,38,38,0.25)', borderRadius:8, padding:'10px 12px', color:'var(--urgent)', fontSize:'0.875rem', marginBottom:14, fontWeight:600 }}>{error}</div>}
          {info  && <div style={{ background:'var(--supply-subtle)', border:'1px solid rgba(5,150,105,0.2)', borderRadius:8, padding:'10px 12px', color:'var(--supply)', fontSize:'0.875rem', marginBottom:14, fontWeight:600 }}>{info}</div>}

          {isLogin && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ width:'100%', marginBottom:16, justifyContent:'center' }}
              onClick={() => { setEmail('lesnar@admin.com'); setPassword('admin123'); }}
            >
              <span>⚡</span> Fill demo credentials
            </button>
          )}

          <form onSubmit={isLogin ? doLogin : doRegister} style={{ display:'grid', gap:14 }}>
            {!isLogin && (
              <div className="form-group" style={{ margin:0 }}>
                <label>Full name</label>
                <input value={name} onChange={e => setName(e.target.value)} required type="text" placeholder="Dr. Amina Osei" />
              </div>
            )}
            <div className="form-group" style={{ margin:0 }}>
              <label>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="you@organization.org" autoComplete="email" />
            </div>
            <div className="form-group" style={{ margin:0 }}>
              <label>Password</label>
              <input value={password} onChange={e => setPassword(e.target.value)} required type="password" placeholder="••••••••" autoComplete={isLogin ? 'current-password' : 'new-password'} />
            </div>

            {!isLogin && (
              <>
                <div className="form-group" style={{ margin:0 }}>
                  <label>Admin code <span className="muted-small">(optional)</span></label>
                  <input value={adminCode} onChange={e => setAdminCode(e.target.value)} type="text" placeholder="Leave blank for facility account" />
                </div>
                {adminCode.trim() !== 'ADMIN2025' && (
                  <>
                    <div className="form-group" style={{ margin:0 }}>
                      <label>Organization name</label>
                      <input value={orgName} onChange={e => setOrgName(e.target.value)} required type="text" placeholder="Kenyatta National Hospital" />
                    </div>
                    <div className="form-group" style={{ margin:0 }}>
                      <label>Organization type</label>
                      <input value={orgType} onChange={e => setOrgType(e.target.value)} required type="text" placeholder="Hospital · Clinic · NGO" />
                    </div>
                    <div className="form-group" style={{ margin:0 }}>
                      <label>License / Registration ID</label>
                      <input value={orgLicenseId} onChange={e => setOrgLicenseId(e.target.value)} required type="text" />
                    </div>
                  </>
                )}
              </>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={!canSubmit() || loading}
              style={{ width:'100%', justifyContent:'center', padding:'13px 0', fontSize:'0.95rem', marginTop:4 }}
            >
              {loading ? <span className="loader" style={{ width:18, height:18, borderWidth:2 }} /> : isLogin ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="muted-small" style={{ textAlign:'center', marginTop:20 }}>
            Synthetic demo data · no patient records · coordinator verification required
          </p>
        </div>
      </div>
    </div>
  );
}
