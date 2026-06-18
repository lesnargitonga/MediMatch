import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

export default function Home() {
  const { user } = useAuth();
  const nav = useNavigate();
  const token = user ? true : false;
  const properName = user?.name ? user.name.charAt(0).toUpperCase() + user.name.slice(1) : null;
  const [stats, setStats] = useState<{ listings: number; users: number }>({ listings: 0, users: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await API.get('/stats');
        if (!cancelled) setStats({ listings: res.data.listings ?? 0, users: res.data.users ?? 0 });
      } catch {
        // stats are decorative — silently ignore failures
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true };
  }, []);
  return (
    <div>
      <section className="hero bg-image fade-in-up" style={{ marginBottom: 24, ['--hero-bg' as any]: 'linear-gradient(135deg, rgba(86,76,255,0.12), rgba(255,153,102,0.12)), url(/images/pic-1.jpeg)' }}>
        <div className="hero-copy glass-card">
          <div className="brand-accent" />
          <h1 className="heading brand-title" style={{ marginTop: 0 }}>Connecting supplies with those in need</h1>
          {properName && <div className="badge gradient" style={{ marginBottom: 10 }}>Welcome back, {properName}.</div>}
          <p className="muted" style={{ maxWidth: 680 }}>
            MediMatch connects donors, clinics, and communities to share medical supplies quickly and transparently.
            Post items you can donate, request what you need, and discover nearby matches with simple tools.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button className="btn" onClick={() => nav(user ? '/dashboard' : '/login')}>
                    Get started
                  </button>
                  <Link to="/listings" className="btn btn-secondary">Browse listings</Link>
          </div>
        </div>
        {/* Background image applied via CSS variable above */}
      </section>

      {/* Quick stats chips */}
      <div className="chips" style={{ marginBottom: 16 }}>
        {!loading && stats.listings > 0 && <span className="chip"><span className="dot" /> {stats.listings} listings active</span>}
        {!loading && stats.users > 0 && <span className="chip"><span className="dot" /> {stats.users} organisations</span>}
        {token ? <span className="chip"><span className="dot" /> Signed in</span> : <span className="chip"><span className="dot" /> Guest mode</span>}
      </div>

      <section>
        <div className="heading" style={{ fontSize: '1.25rem' }}>What you can do</div>
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div className="card feature-card">
            <span className="icon-circle"><img src="/images/icon-list.svg" alt="List" /></span>
            <div>
              <strong>List supplies</strong>
              <p className="muted">Create listings for available medical items with quantity and location.</p>
            </div>
          </div>
          <div className="card feature-card">
            <span className="icon-circle"><img src="/images/icon-browse.svg" alt="Browse" /></span>
            <div>
              <strong>Browse requests</strong>
              <p className="muted">See what nearby facilities or people need, and offer to help.</p>
            </div>
          </div>
          <div className="card feature-card">
            <span className="icon-circle"><img src="/images/icon-match.svg" alt="Match" /></span>
            <div>
              <strong>Get matched</strong>
              <p className="muted">Find best-fit matches by distance and urgency (MVP preview).</p>
            </div>
          </div>
          <div className="card feature-card">
            <span className="icon-circle"><img src="/images/icon-secure.svg" alt="Secure" /></span>
            <div>
              <strong>Simple and secure</strong>
              <p className="muted">Your account keeps track of your posts and responses with JWT-based auth.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <div className="cta">
          <div>
            <strong>Ready to contribute?</strong>
            <div className="muted-small">Create a listing or explore what others have shared.</div>
          </div>
          <div className="cta-actions">
            {!token ? (
              <Link to="/login" className="btn">Create an account</Link>
            ) : (
              <Link to="/dashboard" className="btn">Open Dashboard</Link>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="card fade-in-up" style={{ marginTop: 24 }}>
        <div className="heading" style={{ fontSize: '1.1rem' }}>How it works</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          <div className="step card image-card light" style={{ display: 'grid', gridTemplateRows: 'auto', borderRadius: 12, backgroundImage: 'url(/images/pic-2.png)' }}>
            <div className="content" style={{ padding: 12, borderRadius: 10 }}>
              <div className="badge">1</div>
              <strong>Create or find a listing</strong>
              <div className="muted-small" style={{ color: 'rgba(255,255,255,0.85)' }}>Post available items or search for local needs.</div>
            </div>
          </div>
          <div className="step card image-card medium" style={{ display: 'grid', gridTemplateRows: 'auto', borderRadius: 12, backgroundImage: 'url(/images/pic-3.jpeg)' }}>
            <div className="content" style={{ padding: 12, borderRadius: 10 }}>
              <div className="badge">2</div>
              <strong>Connect securely</strong>
              <div className="muted-small" style={{ color: 'rgba(255,255,255,0.85)' }}>Message matched parties; keep contact info private.</div>
            </div>
          </div>
          <div className="step card image-card light" style={{ display: 'grid', gridTemplateRows: 'auto', borderRadius: 12, backgroundImage: 'url(/images/pic-4.avif)' }}>
            <div className="content" style={{ padding: 12, borderRadius: 10 }}>
              <div className="badge">3</div>
              <strong>Coordinate handoff</strong>
              <div className="muted-small" style={{ color: 'rgba(255,255,255,0.85)' }}>Agree on logistics and mark completion.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Embedded images inside content instead of a top strip */}
      <section className="card fade-in-up" style={{ marginTop: 24 }}>
        <div className="heading" style={{ fontSize: '1.1rem' }}>Who benefits</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          <div className="card image-card medium" style={{ display: 'grid', gap: 10, backgroundImage: 'url(/images/pic-5.jpg)', borderRadius: 12, padding: 10 }}>
            <div className="content" style={{ padding: 12, borderRadius: 10 }}>
              <strong>Hospitals & Clinics</strong>
              <div className="muted-small" style={{ color: 'rgba(255,255,255,0.85)' }}>Find nearby supplies during shortages and emergencies.</div>
            </div>
          </div>
          <div className="card image-card light" style={{ display: 'grid', gap: 10, backgroundImage: 'url(/images/pic-3.jpeg)', borderRadius: 12, padding: 10 }}>
            <div className="content" style={{ padding: 12, borderRadius: 10 }}>
              <strong>Donors & Suppliers</strong>
              <div className="muted-small" style={{ color: 'rgba(255,255,255,0.85)' }}>Share surplus inventory to support local communities.</div>
            </div>
          </div>
          <div className="card image-card light" style={{ display: 'grid', gap: 10, backgroundImage: 'url(/images/pic-4.avif)', borderRadius: 12, padding: 10 }}>
            <div className="content" style={{ padding: 12, borderRadius: 10 }}>
              <strong>NGOs & Volunteers</strong>
              <div className="muted-small" style={{ color: 'rgba(255,255,255,0.85)' }}>Coordinate requests and matches with transparent listings.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="fade-in-up" style={{ marginTop: 24 }}>
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          <blockquote className="card">
            <p>“We matched surplus gloves to a nearby clinic within hours.”</p>
            <div className="muted-small">Community Volunteer</div>
          </blockquote>
          <blockquote className="card">
            <p>“The visibility and simplicity helped us coordinate donations faster.”</p>
            <div className="muted-small">Clinic Coordinator</div>
          </blockquote>
          <blockquote className="card">
            <p>“Transparent listings and quick messages make this effortless.”</p>
            <div className="muted-small">NGO Partner</div>
          </blockquote>
        </div>
      </section>

      {/* FAQ */}
      <section className="card fade-in-up" style={{ marginTop: 24 }}>
        <div className="heading" style={{ fontSize: '1.1rem' }}>FAQ</div>
        <details>
          <summary>Is MediMatch free to use?</summary>
          <div className="muted-small">Yes. The MVP is free for individuals and organizations.</div>
        </details>
        <details>
          <summary>How do matches work?</summary>
          <div className="muted-small">We surface potential matches by proximity and urgency signals.</div>
        </details>
        <details>
          <summary>Is my data secure?</summary>
          <div className="muted-small">We use JWT auth and never expose private contact info publicly.</div>
        </details>
      </section>
    </div>
  );
}
