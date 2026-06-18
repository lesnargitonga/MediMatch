
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
      <div className="auth-page">
      <form className="auth-form" onSubmit={isLogin ? doLogin : doRegister}>
        <h2>{isLogin ? 'Login' : 'Register'}</h2>
        {error && <div className="error">{error}</div>}
        {info && <div className="info">{info}</div>}
        {isLogin ? (
          <>
            <div>
              <label>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} required type="email" />
            </div>
            <div>
              <label>Password</label>
              <input value={password} onChange={e => setPassword(e.target.value)} required type="password" />
            </div>
          </>
        ) : (
          <>
            <div>
              <label>Name</label>
              <input value={name} onChange={e => setName(e.target.value)} required type="text" />
            </div>
            <div>
              <label>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} required type="email" />
            </div>
            <div>
              <label>Password</label>
              <input value={password} onChange={e => setPassword(e.target.value)} required type="password" />
            </div>
            <div>
              <label>Admin Code (optional)</label>
              <input value={adminCode} onChange={e => setAdminCode(e.target.value)} type="text" placeholder="ADMIN2025 for admin" />
            </div>
            {adminCode.trim() !== 'ADMIN2025' && (
              <>
                <div>
                  <label>Organization Name</label>
                  <input value={orgName} onChange={e => setOrgName(e.target.value)} required type="text" />
                </div>
                <div>
                  <label>Organization Type</label>
                  <input value={orgType} onChange={e => setOrgType(e.target.value)} required type="text" />
                </div>
                <div>
                  <label>License/Registration ID</label>
                  <input value={orgLicenseId} onChange={e => setOrgLicenseId(e.target.value)} required type="text" />
                </div>
              </>
            )}
          </>
        )}
        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={!canRegister()}>{isLogin ? 'Login' : 'Register'}</button>
          <button type="button" onClick={() => { setIsLogin(x => !x); setError(null); setInfo(null); }} style={{ marginLeft: 8 }}>
            {isLogin ? 'Create account' : 'Back to login'}
          </button>
        </div>
      </form>
    </div>
  );
}