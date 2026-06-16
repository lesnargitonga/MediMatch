
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
  const { user, setUser, refresh } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Removed org fields for simplicity

  const canRegister = () => {
    if (isLogin) return true;
    // Admin: only require name, email, password, adminCode
    // User: require org fields
    if (adminCode.trim() === 'ADMIN2025') {
      return (
        name.trim().length > 0 &&
        email.trim().length > 3 &&
        password.trim().length >= 6 &&
        adminCode.trim().length > 0
      );
    } else {
      return (
        name.trim().length > 0 &&
        email.trim().length > 3 &&
        password.trim().length >= 6 &&
        orgName.trim().length >= 2 &&
        orgType.trim().length >= 2 &&
        orgLicenseId.trim().length >= 2
      );
    }
  };

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await API.post('/auth/login', { email, password }, { withCredentials: true });
      await refresh();
      toast.success('Welcome back!');
      // Navigation is handled by useEffect below
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Login failed';
      setError(msg);
      toast.error(msg);
      console.error('Login error:', err);
    }
  }

  async function doRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      let payload: any;
      if (adminCode.trim() === 'ADMIN2025') {
        payload = {
          email,
          password,
          name,
          role: 'admin',
          org_name: 'AdminOrg',
          org_type: 'Admin',
          org_license_id: 'ADM123'
        };
      } else {
        payload = {
          email,
          password,
          name,
          role: 'user',
          org_name: orgName,
          org_type: orgType,
          org_license_id: orgLicenseId
        };
      }
      await API.post('/auth/register', payload, { withCredentials: true });
      toast.success('Account created! Please log in.');
      // After account creation, go to Login instead of auto-login
      setIsLogin(true);
      setInfo('Your account was created successfully. Please log in.');
      // Optional: navigate to explicit login route
      try { nav('/login'); } catch {}
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Register failed';
      setError(msg);
      toast.error(msg);
      console.error('Register error:', err);
    }
  }
  // ...existing code...
  // React to user state and navigate accordingly
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') nav('/dashboard');
      else nav('/');
    }
  }, [user, nav]);

    return (
      <div className="auth-shell fade-in-up">
        <div className="auth-brand-panel">
          <span className="lesnar-badge">A Lesnar AI Development</span>
          <h1 className="heading">Coordinator access for public-health redistribution</h1>
          <p className="muted">
            Sign in to open the Command Center, inspect the geospatial redistribution map, and review
            AI-assisted priority matches. Synthetic demo data only — no patient records.
          </p>
          <div className="auth-preview-card" aria-hidden="true">
            <div className="auth-preview-row"><span className="legend-dot supply" /> Geospatial redistribution map</div>
            <div className="auth-preview-row"><span className="legend-dot need" /> AI-assisted coordinator briefs</div>
            <div className="auth-preview-row"><span className="legend-dot coordinator" /> Verification-gated transfers</div>
          </div>
          <div className="hero-disclosure">Coordinator verification required before any transfer.</div>
        </div>

        <div className="card auth-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <h2 style={{ margin: 0 }}>{isLogin ? 'Coordinator login' : 'Create account'}</h2>
          </div>
          <p className="muted-small" style={{ marginTop: 4, marginBottom: 16 }}>
            {isLogin ? 'Use a demo account or your own credentials.' : 'Register an organization or admin coordinator account.'}
          </p>
          {error && <div className="text-danger" style={{ marginBottom: 12 }}>{error}</div>}
          {info && <div className="success" style={{ marginBottom: 12 }}>{info}</div>}

          {isLogin && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline" onClick={() => { setEmail('test@example.com'); setPassword('Password123'); }}>
                Use demo coordinator account
              </button>
              <button type="button" className="btn btn-outline" onClick={() => {
                setIsLogin(false);
                setName('MediMatch Admin');
                setEmail('lesnar@admin.com');
                setPassword('admin123');
                setAdminCode('ADMIN2025');
              }}>
                Create demo admin account
              </button>
            </div>
          )}

          <form onSubmit={isLogin ? doLogin : doRegister}>
            {isLogin ? (
              <>
                <div className="form-group">
                  <label>Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="you@organization.org" />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input value={password} onChange={e => setPassword(e.target.value)} required type="password" placeholder="••••••••" />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} required type="text" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} required type="email" />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input value={password} onChange={e => setPassword(e.target.value)} required type="password" />
                </div>
                <div className="form-group">
                  <label>Admin Code <span className="muted-small">(optional)</span></label>
                  <input value={adminCode} onChange={e => setAdminCode(e.target.value)} type="text" placeholder="Coordinator admin code" />
                </div>
                {adminCode.trim() !== 'ADMIN2025' && (
                  <>
                    <div className="form-group">
                      <label>Organization Name</label>
                      <input value={orgName} onChange={e => setOrgName(e.target.value)} required type="text" placeholder="e.g., Kenyatta National Hospital" />
                    </div>
                    <div className="form-group">
                      <label>Organization Type</label>
                      <input value={orgType} onChange={e => setOrgType(e.target.value)} required type="text" placeholder="e.g., Hospital, Clinic, NGO" />
                    </div>
                    <div className="form-group">
                      <label>License/Registration ID</label>
                      <input value={orgLicenseId} onChange={e => setOrgLicenseId(e.target.value)} required type="text" />
                    </div>
                  </>
                )}
              </>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" type="submit" disabled={!canRegister()}>{isLogin ? 'Login' : 'Register'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setIsLogin(x => !x); setError(null); setInfo(null); }}>
                {isLogin ? 'Create account' : 'Back to login'}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}