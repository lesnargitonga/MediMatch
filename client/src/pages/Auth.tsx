import React, { useState, useEffect } from 'react';
import API from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Auth() {
  const nav = useNavigate();
  const { user, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('');
  const [orgLicenseId, setOrgLicenseId] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) nav(user.role === 'admin' ? '/dashboard' : '/');
  }, [user, nav]);

  const isAdmin = adminCode.trim() === 'ADMIN2025';

  const canSubmit = () => {
    if (!name.trim() || email.length < 4 || password.length < 6) return false;
    if (isAdmin) return true;
    return orgName.trim().length >= 2 && orgType.trim().length >= 2 && orgLicenseId.trim().length >= 2;
  };

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: any = isAdmin
        ? { email, password, name, role: 'admin', org_name: 'AdminOrg', org_type: 'Admin', org_license_id: 'ADM123' }
        : { email, password, name, role: 'user', org_name: orgName, org_type: orgType, org_license_id: orgLicenseId };
      await API.post('/auth/register', payload, { withCredentials: true });
      await refresh();
      toast.success('Account created! Welcome to MediMatch.');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Registration failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '48px auto' }}>
      <div className="card fade-in-up">
        <div style={{ marginBottom: 24 }}>
          <div className="brand-accent" />
          <div className="heading" style={{ marginBottom: 4 }}>Create account</div>
          <div className="muted" style={{ fontSize: '0.95rem' }}>Join MediMatch to post and discover listings</div>
        </div>
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Full name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              required
              autoComplete="name"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label>Admin code <span className="muted-small">(optional)</span></label>
            <input
              type="text"
              value={adminCode}
              onChange={e => setAdminCode(e.target.value)}
              placeholder="Leave blank for a standard account"
            />
          </div>
          {!isAdmin && (
            <>
              <div className="form-group">
                <label>Organization name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder="e.g. Mercy General Hospital"
                  required
                />
              </div>
              <div className="form-group">
                <label>Organization type</label>
                <input
                  type="text"
                  value={orgType}
                  onChange={e => setOrgType(e.target.value)}
                  placeholder="e.g. Hospital, Clinic, NGO"
                  required
                />
              </div>
              <div className="form-group">
                <label>License / registration ID</label>
                <input
                  type="text"
                  value={orgLicenseId}
                  onChange={e => setOrgLicenseId(e.target.value)}
                  placeholder="Your org's license number"
                  required
                />
              </div>
            </>
          )}
          {error && <div className="text-danger" style={{ marginBottom: 12 }}>{error}</div>}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 4 }}
            disabled={loading || !canSubmit()}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <div className="muted-small" style={{ marginTop: 20, textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
