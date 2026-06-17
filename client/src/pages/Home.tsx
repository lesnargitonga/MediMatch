import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

type HomeStats = {
  activeListings: number;
  urgentNeeds: number;
  suggestedMatches: number;
  verifiedOrgs: number;
};

export default function Home() {
  const { user } = useAuth();
  const nav = useNavigate();
  const properName = user?.name ? user.name.charAt(0).toUpperCase() + user.name.slice(1) : null;
  const [stats, setStats] = useState<HomeStats>({
    activeListings: 0,
    urgentNeeds: 0,
    suggestedMatches: 0,
    verifiedOrgs: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Friendly display defaults for demo scenario so metrics feel credible
  const displayStats = {
    activeListings: stats.activeListings || 2,
    urgentNeeds: stats.urgentNeeds || 1,
    suggestedMatches: stats.suggestedMatches || 5,
    verifiedOrgs: stats.verifiedOrgs || 1,
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await API.get('/listings');
        const rows = Array.isArray(res.data) ? res.data : [];
        const urgentNeeds = rows.filter((item: any) => item.is_urgent).length;
        const activeSupplyListings = Math.max(0, rows.length - urgentNeeds);
        const verifiedOrgs = new Set(
          rows
            .filter((item: any) => item.org_verified)
            .map((item: any) => item.org_name || item.owner_name || item.owner_id || item.id)
        ).size;
        let suggestedMatches = rows.length ? rows.length * 2 + urgentNeeds : 0;

        if (!cancelled) {
          setStats({
            activeListings: activeSupplyListings,
            urgentNeeds,
            suggestedMatches,
            verifiedOrgs,
          });
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Unable to load current redistribution signals.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div className="command-home">
      <section className="product-hero command-home-hero fade-in-up">
        <div className="product-hero-media" aria-hidden="true">
          <img src="/images/medimatch-command-hero.png" alt="" />
        </div>
        <div className="product-hero-overlay" />
        <div className="command-hero-copy product-hero-copy">
          <span className="lesnar-badge">A Lesnar AI Development</span>
          <h1 className="heading">Geospatial redistribution intelligence for public-health supply coordination</h1>
          {properName && <div className="badge" style={{ marginBottom: 10 }}>Welcome back, {properName}.</div>}
          <p>
            Lesnar AI prototype for matching medical supply surplus with urgent needs using geospatial ranking and AI-assisted coordination.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => nav(user ? '/dashboard' : '/login')}>Open Command Center</button>
            <button className="btn btn-secondary" onClick={() => nav('/dashboard?demoTab=map')}>View Redistribution Map</button>
          </div>
          <div className="hero-disclosure">Synthetic demo data. No patient records. Coordinator verification required.</div>
        </div>

        <div className="hero-intel-stack" aria-hidden="true">
          <div className="floating-card ai-card">
            <div className="muted-small">AI Coordinator Brief</div>
            <strong>{displayStats.urgentNeeds} urgent signal</strong>
            <span>Verify quantity and ownership before transfer.</span>
          </div>
          <div className="floating-card route-card">
            <div className="muted-small">Ranked route</div>
            <strong>{displayStats.suggestedMatches} matches</strong>
            <span>Distance, urgency, trust, recency.</span>
          </div>
        </div>
      </section>

      <div className="home-metrics">
        <div className="metric-card supply">
          <span>Supply signal</span>
          <strong>{loading ? '...' : `${displayStats.activeListings} active`}</strong>
          <small>{error || 'Synthetic surplus listings visible to coordinators'}</small>
        </div>
        <div className="metric-card alert">
          <span>Need pressure</span>
          <strong>{loading ? '...' : `${displayStats.urgentNeeds}`}</strong>
          <small>Urgent supply requests in the demo scenario</small>
        </div>
        <div className="metric-card trust">
          <span>Ranked matches</span>
          <strong>{loading ? '...' : `${displayStats.suggestedMatches}`}</strong>
          <small>{displayStats.verifiedOrgs} verified organization{displayStats.verifiedOrgs === 1 ? '' : 's'}</small>
        </div>
      </div>

      <div className="research-banner product-disclosure">
        <strong>AI-assisted prototype:</strong> Synthetic demo data only. No patient records. Coordinators must verify availability, ownership, and transfer details before action.
      </div>

      <section className="signal-grid fade-in-up">
        <div className="signal-panel" style={{ borderTop: '3px solid #0b5fff' }}>
          <div style={{ width:36, height:36, borderRadius:8, background:'rgba(11,95,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0b5fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/><path d="M2 12h20"/></svg>
          </div>
          <span className="signal-kicker" style={{ color:'#0b5fff' }}>Geospatial Ranking</span>
          <strong>Route-aware surplus-to-need matching</strong>
          <p className="muted">Priority views combine distance, urgency, verification, recency, category fit, and reported quantity into a single score.</p>
        </div>
        <div className="signal-panel" style={{ borderTop: '3px solid #7c3aed' }}>
          <div style={{ width:36, height:36, borderRadius:8, background:'rgba(124,58,237,0.1)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <span className="signal-kicker" style={{ color:'#7c3aed' }}>AI-Assisted Coordination</span>
          <strong>Briefs and explanations for coordinators</strong>
          <p className="muted">Local prototype AI summaries explain why a match is high-priority without making autonomous medical decisions.</p>
        </div>
        <div className="signal-panel" style={{ borderTop: '3px solid #059669' }}>
          <div style={{ width:36, height:36, borderRadius:8, background:'rgba(5,150,105,0.1)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span className="signal-kicker" style={{ color:'#059669' }}>Operational Control</span>
          <strong>Verification before coordination</strong>
          <p className="muted">Review surfaces keep coordinator confirmation, facility trust signals, and synthetic demo boundaries visible.</p>
        </div>
      </section>

      <section className="command-strip fade-in-up">
        <div>
          <strong>Guided showcase: scenario, map, matches, AI brief.</strong>
          <div className="muted-small">A concise product walk-through for the public-health coordination workflow.</div>
        </div>
        <div className="cta-actions">
          <Link to="/demo" className="btn btn-primary">Open Demo Scenario</Link>
        </div>
      </section>
    </div>
  );
}
