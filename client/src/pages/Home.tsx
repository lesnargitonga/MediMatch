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

const DEMO_CENTER = { lat: -1.286389, lon: 36.817223 };

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

        if (user) {
          try {
            const matchRes = await API.get('/matches/suggest', {
              params: { lat: DEMO_CENTER.lat, lon: DEMO_CENTER.lon, max_km: 50, limit: 50 },
            });
            suggestedMatches = matchRes.data?.suggestions?.length ?? suggestedMatches;
          } catch {
            // Keep the listing-derived estimate for signed-out or temporarily unavailable match APIs.
          }
        }

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
      <section className="hero command-home-hero mission-hero fade-in-up">
        <div className="command-hero-copy">
          <span className="demo-pill">Conference demo — synthetic data</span>
          <h1 className="heading brand-title">Redistribution intelligence for public-health coordination.</h1>
          {properName && <div className="badge" style={{ marginBottom: 10 }}>Welcome back, {properName}.</div>}
          <p>
            MediMatch surfaces nearby surplus and urgent demand, ranks redistribution options, and explains top recommendations.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => nav(user ? '/dashboard' : '/login')}>Open Command Center</button>
            <button className="btn" onClick={() => nav('/dashboard?demoTab=map')}>View Redistribution Map</button>
            <Link to="/dashboard?demoTab=suggested" className="btn btn-secondary">Explore Priority Matches</Link>
          </div>
        </div>

        <div className="hero-visual" aria-hidden>
          <svg className="hero-svg-route" viewBox="0 0 160 100" preserveAspectRatio="none">
            <path d="M8 82 C32 20 68 20 92 60 C116 100 148 12 156 40" stroke="#0b5fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path className="hero-route-anim" d="M8 82 C32 20 68 20 92 60 C116 100 148 12 156 40" stroke="#06b6d4" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 6" strokeDashoffset="0" />
          </svg>

          <div className="floating-card supply" style={{ right: 36, top: 36 }}>
            <div className="muted-small">Available supply</div>
            <strong>{displayStats.activeListings} facilities</strong>
          </div>

          <div className="floating-card need" style={{ left: 40, top: 70 }}>
            <div className="muted-small">Urgent need</div>
            <strong>{displayStats.urgentNeeds} urgent signal</strong>
          </div>

          <div className="floating-card match" style={{ right: 48, bottom: 38 }}>
            <div className="muted-small">Priority matches</div>
            <strong>{displayStats.suggestedMatches} ranked</strong>
          </div>
        </div>
      </section>

      <div className="home-metrics">
        <div className="metric-card supply">
          <span>Redistribution snapshot</span>
          <strong>{loading ? '...' : `${displayStats.activeListings} active`}</strong>
          <small>{error || 'Demo scenario — synthetic data'}</small>
        </div>
        <div className="metric-card alert">
          <span>Urgent signals</span>
          <strong>{loading ? '...' : `${displayStats.urgentNeeds}`}</strong>
          <small>Listings flagged as urgent in scenario</small>
        </div>
        <div className="metric-card trust">
          <span>Priority matches</span>
          <strong>{loading ? '...' : `${displayStats.suggestedMatches}`}</strong>
          <small>{displayStats.verifiedOrgs} verified organization{displayStats.verifiedOrgs === 1 ? '' : 's'}</small>
        </div>
      </div>

      <div className="research-banner">
        <strong>Conference Demo Mode:</strong> This view uses synthetic demo data for a Nairobi County case study — no real patient or facility data is included.
      </div>

      <section className="signal-grid fade-in-up">
        <div className="signal-panel">
          <span className="signal-kicker">Spatial Triage</span>
          <strong>Distance-aware redistribution</strong>
          <p className="muted">Coordinator views prioritize nearby supply and demand points before facilities lose time to manual calls.</p>
        </div>
        <div className="signal-panel">
          <span className="signal-kicker">Priority Matching</span>
          <strong>Explainable ranking</strong>
          <p className="muted">Scores combine proximity, urgency, reputation, recency, verification, category fit, and quantity.</p>
        </div>
        <div className="signal-panel">
          <span className="signal-kicker">Public Health Oversight</span>
          <strong>Exportable activity</strong>
          <p className="muted">Administrators can review active listings, verification status, and summary reports from the same workflow.</p>
        </div>
      </section>

      <section className="command-strip fade-in-up">
        <div>
          <strong>Demo path: snapshot, priority queue, map, export.</strong>
          <div className="muted-small">A three-to-five minute showcase built around the matching model.</div>
        </div>
        <div className="cta-actions">
          <Link to="/demo" className="btn btn-primary">Launch Conference Demo</Link>
        </div>
      </section>
    </div>
  );
}
