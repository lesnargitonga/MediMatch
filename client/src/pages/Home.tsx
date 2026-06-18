import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { useScrollReveal, useInView, Counter } from '../components/Reveal';

const PIPELINE = [
  { n: 1, t: 'Normalize', d: 'Every listing is parsed into a surplus offer or an urgent request, each anchored to a geocoded facility location.' },
  { n: 2, t: 'Triage', d: 'Requests are ordered urgent-first, then by recency — the most acute needs enter the queue ahead of routine ones.' },
  { n: 3, t: 'Match', d: 'Each need is paired with the nearest category-compatible surplus using geodesic (haversine) distance.' },
  { n: 4, t: 'Allocate', d: 'Quantity is committed against remaining stock, so a single hub can responsibly serve several facilities.' },
  { n: 5, t: 'Route', d: 'Transfers resolve to real road geometry via OSRM, with a resilient curved-arc fallback when offline.' },
];

const WEIGHTS = [
  { f: 'Proximity (distance)', w: 35 },
  { f: 'Need urgency', w: 20 },
  { f: 'Provider reputation', w: 20 },
  { f: 'Listing recency', w: 15 },
  { f: 'Verified facility', w: 5 },
  { f: 'Category fit', w: 4 },
  { f: 'Quantity fit', w: 1 },
];

const SDG = [
  { tag: 'SDG 3', t: 'Good Health & Well-being', d: 'Reducing stock-outs of essential medical supplies at the point of care.' },
  { tag: 'UHC', t: 'Universal Health Coverage', d: 'Extending reliable supply access to underserved, rural, and frontier facilities.' },
  { tag: 'Africa CDC', t: 'Supply-chain resilience', d: 'Strengthening continental health-security and emergency-response logistics.' },
];

export default function Home() {
  const { user } = useAuth();
  const nav = useNavigate();
  const properName = user?.name ? user.name.charAt(0).toUpperCase() + user.name.slice(1) : null;
  const [stats, setStats] = useState<{ listings: number; users: number }>({ listings: 0, users: 0 });
  const weights = useInView<HTMLDivElement>(0.4);
  useScrollReveal([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await API.get('/stats');
        if (!cancelled) setStats({ listings: res.data.listings ?? 0, users: res.data.users ?? 0 });
      } catch {
        // stats are decorative — silently ignore failures
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="about-page">
      {/* Hero */}
      <section className="hero bg-image reveal" style={{ marginBottom: 24, ['--hero-bg' as any]: 'linear-gradient(135deg, rgba(34,211,154,0.18), rgba(6,182,212,0.14)), url(/images/pic-1.jpeg)' }}>
        <div className="hero-copy glass-card">
          <div className="brand-accent" />
          <div className="eyebrow-tag">Geospatial public-health infrastructure · Kenya</div>
          <h1 className="heading brand-title" style={{ marginTop: 6 }}>
            Equitable medical-supply redistribution, made visible
          </h1>
          {properName && <div className="badge gradient" style={{ marginBottom: 10 }}>Welcome back, {properName}.</div>}
          <p className="muted" style={{ maxWidth: 700 }}>
            MediMatch turns scattered surplus and unmet need into one coordinated operating picture — ranking
            transfers by proximity, urgency, and verification so supplies reach the facilities that need them most.
            Studied in Nairobi County, built to scale across Kenya and Africa.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
            <Link to="/" className="btn">Open the national command map</Link>
            <Link to="/listings" className="btn btn-secondary">Browse listings</Link>
          </div>
        </div>
      </section>

      {/* Problem framing */}
      <section className="card reveal" style={{ marginTop: 8 }}>
        <div className="eyebrow-tag">The problem</div>
        <div className="heading" style={{ fontSize: '1.35rem', marginTop: 4 }}>
          Supplies expire in one facility while another runs out
        </div>
        <p className="muted" style={{ maxWidth: 820 }}>
          Across fragmented health systems, usable medical supplies are discarded as surplus in some facilities
          while neighbouring clinics report critical stock-outs. The gap is rarely a shortage of supplies — it is a
          shortage of <strong>visibility and coordination</strong>. MediMatch closes that gap with a shared,
          geospatial picture of who has surplus, who has need, and the most equitable way to move stock between them.
        </p>
        <div className="metric-band">
          <div><strong><Counter end={stats.users || 16} /></strong><span>Facilities connected</span></div>
          <div><strong><Counter end={stats.listings || 27} /></strong><span>Surplus &amp; need listings</span></div>
          <div><strong>Urgent-first</strong><span>Triage ordering</span></div>
          <div><strong>Human-verified</strong><span>Before every transfer</span></div>
        </div>
      </section>

      {/* How the engine works */}
      <section className="card reveal" style={{ marginTop: 24 }}>
        <div className="eyebrow-tag">How the redistribution engine works</div>
        <div className="heading" style={{ fontSize: '1.2rem', marginTop: 4 }}>From signal to coordinated transfer</div>
        <div className="pipeline">
          {PIPELINE.map((s) => (
            <div className="pipeline-step" key={s.n}>
              <div className="pipeline-num">{s.n}</div>
              <strong>{s.t}</strong>
              <p className="muted-small">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Matching methodology / scoring */}
      <section className="card reveal" style={{ marginTop: 24 }}>
        <div className="eyebrow-tag">Matching methodology</div>
        <div className="heading" style={{ fontSize: '1.2rem', marginTop: 4 }}>A transparent, multi-factor match score</div>
        <p className="muted" style={{ maxWidth: 760 }}>
          Beyond nearest-neighbour routing, MediMatch ranks candidate matches with an explainable weighted model.
          Every factor is auditable — no black box. Weights are tuned for equity, prioritising proximity and clinical urgency.
        </p>
        <div className="weights" ref={weights.ref}>
          {WEIGHTS.map((row, i) => (
            <div className="weight-row" key={row.f}>
              <span className="weight-label">{row.f}</span>
              <span className="weight-track">
                <i style={{ width: weights.inView ? `${row.w * 2.4}%` : '0%', transitionDelay: `${i * 80}ms` }} />
              </span>
              <span className="weight-val">{row.w}%</span>
            </div>
          ))}
        </div>
      </section>

      {/* Global health alignment */}
      <section className="card reveal" style={{ marginTop: 24 }}>
        <div className="eyebrow-tag">Aligned with global health goals</div>
        <div className="heading" style={{ fontSize: '1.2rem', marginTop: 4 }}>Built toward recognised public-health targets</div>
        <div className="sdg-grid">
          {SDG.map((s) => (
            <div className="sdg-card" key={s.tag}>
              <span className="sdg-tag">{s.tag}</span>
              <strong>{s.t}</strong>
              <p className="muted-small">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Research & data ethics */}
      <section className="card reveal research-ethics" style={{ marginTop: 24 }}>
        <div className="eyebrow-tag">Research &amp; data ethics</div>
        <div className="heading" style={{ fontSize: '1.2rem', marginTop: 4 }}>Responsible by design</div>
        <ul className="ethics-list">
          <li><strong>Case study scope.</strong> The current study models Nairobi County, with a national-scale demonstration of how the platform extends.</li>
          <li><strong>Synthetic inventory.</strong> Supply and need quantities are synthetic demonstration data — no real stock records.</li>
          <li><strong>No patient data.</strong> The platform handles facility-level supply signals only; it never touches patient records.</li>
          <li><strong>Public geocodes.</strong> Facility names are public and locations are approximate.</li>
          <li><strong>Human in the loop.</strong> Every suggested transfer requires coordinator verification before any real-world action.</li>
          <li><strong>Open standards.</strong> Built on PostGIS, OpenStreetMap / Nominatim, and OSRM — interoperable and inspectable.</li>
        </ul>
      </section>

      {/* Who we are */}
      <section className="card reveal researcher-card" style={{ marginTop: 24 }}>
        <div className="researcher-grid">
          <div className="researcher-mark">MM</div>
          <div>
            <div className="eyebrow-tag">Who we are</div>
            <div className="heading" style={{ fontSize: '1.2rem', marginTop: 4 }}>Built in Kenya, engineered for Africa</div>
            <p className="muted" style={{ maxWidth: 720 }}>
              MediMatch is the work of <strong>Dr. Lesnar Gitonga</strong>, United States International
              University-Africa (USIU-Africa), Kenya — research presented as
              <em> “Leveraging Geospatial Technology for Equitable Medical Supply Redistribution: A Case Study of
              Nairobi County.”</em> The mission is simple: give African health systems the coordination layer that
              ensures no usable supply goes to waste while a clinic down the road runs out.
            </p>
            <div className="chips" style={{ marginTop: 12 }}>
              <span className="chip"><span className="dot" /> USIU-Africa</span>
              <span className="chip"><span className="dot" /> Nairobi, Kenya</span>
              <span className="chip"><span className="dot" /> Global Public Health 2026</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ marginTop: 24 }}>
        <div className="cta">
          <div>
            <strong>See the platform in motion</strong>
            <div className="muted-small">Watch surplus get ranked and routed to urgent need across the country, live.</div>
          </div>
          <div className="cta-actions">
            <Link to="/" className="btn">Open command map</Link>
            {!user
              ? <Link to="/login" className="btn btn-secondary">Coordinator login</Link>
              : <Link to="/dashboard" className="btn btn-secondary">Open dashboard</Link>}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="card reveal" style={{ marginTop: 24 }}>
        <div className="heading" style={{ fontSize: '1.1rem' }}>FAQ</div>
        <details>
          <summary>How does MediMatch decide which transfer to recommend?</summary>
          <div className="muted-small">Urgent needs are triaged first, then matched to the nearest category-compatible surplus. A transparent, multi-factor score (proximity, urgency, reputation, recency, verification) ranks the options — every factor is auditable.</div>
        </details>
        <details>
          <summary>Is the data real?</summary>
          <div className="muted-small">Facility names and locations are public and approximate. Inventory and need quantities are synthetic demonstration data. No patient records are ever used.</div>
        </details>
        <details>
          <summary>Does the system act automatically?</summary>
          <div className="muted-small">No. MediMatch surfaces ranked recommendations; a human coordinator verifies stock and logistics before any real-world transfer.</div>
        </details>
        <details>
          <summary>Can it scale beyond Nairobi?</summary>
          <div className="muted-small">Yes. The case study models Nairobi County, and the national command map demonstrates the same engine operating across all of Kenya — and, by design, across other African health systems.</div>
        </details>
      </section>
    </div>
  );
}
