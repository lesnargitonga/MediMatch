import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { useInView, Counter } from '../components/Reveal';

const FIELD = [
  { v: '55.7%', d: 'face stockouts at least monthly' },
  { v: '80.8%', d: 'call current systems ineffective' },
  { v: '57.7%', d: 'report routine supply wastage' },
  { v: '90.3%', d: 'would adopt MediMatch' },
];

const PIPELINE = [
  { n: 1, t: 'Normalize', d: 'Every listing is parsed into a surplus offer or an urgent request, anchored to a geocoded facility.' },
  { n: 2, t: 'Triage', d: 'Requests are ordered urgent-first, then by recency — the most acute needs enter the queue ahead of routine ones.' },
  { n: 3, t: 'Match', d: 'Each need is paired with the nearest category-compatible surplus using geodesic distance.' },
  { n: 4, t: 'Allocate', d: 'Quantity is committed against remaining stock, so one hub can responsibly serve several facilities.' },
  { n: 5, t: 'Route', d: 'Transfers resolve to real road geometry via OSRM, with a resilient curved-arc fallback offline.' },
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
  { tag: 'UHC', t: 'Universal Health Coverage', d: 'Extending reliable supply access to underserved, rural and frontier facilities.' },
  { tag: 'Africa CDC', t: 'Supply-chain resilience', d: 'Strengthening continental health-security and emergency-response logistics.' },
];

const ETHICS = [
  ['Case-study scope', 'The study models Nairobi County, with a national-scale demonstration of how the platform extends.'],
  ['Synthetic inventory', 'Supply and need quantities are synthetic demonstration data — no real stock records.'],
  ['No patient data', 'The platform handles facility-level supply signals only; it never touches patient records.'],
  ['Public geocodes', 'Facility names are public and locations are approximate.'],
  ['Human in the loop', 'Every suggested transfer requires coordinator verification before any real-world action.'],
  ['Open standards', 'Built on PostGIS, OpenStreetMap / Nominatim and OSRM — interoperable and inspectable.'],
];

const FAQ = [
  ['How does MediMatch decide which transfer to recommend?', 'Urgent needs are triaged first, then matched to the nearest category-compatible surplus. A transparent, multi-factor score ranks the options — every factor is auditable.'],
  ['Is the data real?', 'Facility names and locations are public and approximate. Inventory and need quantities are synthetic demonstration data. No patient records are ever used.'],
  ['Does the system act automatically?', 'No. MediMatch surfaces ranked recommendations; a human coordinator verifies stock and logistics before any real-world transfer.'],
  ['Can it scale beyond Nairobi?', 'Yes. The case study models Nairobi County, and the national command map runs the same engine across all of Kenya — and, by design, other African health systems.'],
];

export default function Home() {
  const { user } = useAuth();
  const properName = user?.name ? user.name.charAt(0).toUpperCase() + user.name.slice(1) : null;
  const [stats, setStats] = useState<{ listings: number; users: number }>({ listings: 0, users: 0 });
  const weights = useInView<HTMLDivElement>(0.4);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await API.get('/stats');
        if (!cancelled) setStats({ listings: res.data.listings ?? 0, users: res.data.users ?? 0 });
      } catch { /* decorative */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="lx">
      <div className="lx-aurora" aria-hidden />
      <div className="lx-grid-bg" aria-hidden />

      {/* ===== Hero ===== */}
      <section className="lx-hero">
        <div className="lx-kicker"><span className="lx-pulse" /> Geospatial public-health infrastructure · Kenya</div>
        <h1 className="lx-title">Move surplus to where<br /><span className="hl">need bites hardest.</span></h1>
        <p className="lx-sub">
          MediMatch turns scattered surplus and unmet need into one coordinated operating picture — ranking
          transfers by proximity, urgency and verification so supplies reach the facilities that need them most.
          {properName && <> Welcome back, <b>{properName}</b>.</>}
        </p>
        <div className="lx-cta">
          <Link to="/" className="lx-btn primary">Open the national command map <span>→</span></Link>
          <Link to="/listings" className="lx-btn">Browse listings</Link>
        </div>
        <div className="lx-hero-stats">
          <div><b><Counter end={stats.users || 39} /></b><span>Facilities connected</span></div>
          <div><b><Counter end={stats.listings || 60} /></b><span>Surplus &amp; need listings</span></div>
          <div><b>52</b><span>Professionals surveyed</span></div>
          <div><b>Urgent-first</b><span>Equity triage</span></div>
        </div>
      </section>

      {/* ===== The problem, from the field ===== */}
      <section className="lx-band lx-problem">
        <div className="lx-eyebrow">The problem — from the field</div>
        <h2 className="lx-h2">Supplies expire in one facility while another runs out.</h2>
        <p className="lx-lead">
          The gap is rarely a shortage of supplies — it is a shortage of <b>visibility and coordination</b>.
          Our field study of healthcare professionals across Nairobi County put numbers to it:
        </p>
        <div className="lx-bigstats">
          {FIELD.map((s) => (
            <div key={s.v}><b>{s.v}</b><span>{s.d}</span></div>
          ))}
        </div>
        <p className="lx-foot">Survey of 52 clinical, pharmacy &amp; administrative staff, Nairobi County (2025). Nationally, KEMSA’s order-fill rate sat at just <b>57%</b> mid-2025.</p>
      </section>

      {/* ===== Engine ===== */}
      <section className="lx-section">
        <div className="lx-eyebrow">How the redistribution engine works</div>
        <h2 className="lx-h2 sm">From signal to coordinated transfer</h2>
        <div className="lx-pipeline">
          {PIPELINE.map((s) => (
            <div className="lx-step" key={s.n}>
              <div className="lx-step-n">{s.n}</div>
              <strong>{s.t}</strong>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Scoring ===== */}
      <section className="lx-section">
        <div className="lx-eyebrow">Matching methodology</div>
        <h2 className="lx-h2 sm">A transparent, multi-factor match score</h2>
        <p className="lx-lead">Beyond nearest-neighbour routing, MediMatch ranks candidates with an explainable weighted model — every factor auditable, no black box.</p>
        <div className="lx-weights" ref={weights.ref}>
          {WEIGHTS.map((row, i) => (
            <div className="lx-wrow" key={row.f}>
              <span className="lx-wlabel">{row.f}</span>
              <span className="lx-wtrack"><i style={{ width: weights.inView ? `${row.w * 2.6}%` : '0%', transitionDelay: `${i * 70}ms` }} /></span>
              <span className="lx-wval">{row.w}%</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== SDG ===== */}
      <section className="lx-section">
        <div className="lx-eyebrow">Aligned with global health goals</div>
        <h2 className="lx-h2 sm">Built toward recognised public-health targets</h2>
        <div className="lx-cards3">
          {SDG.map((s) => (
            <div className="lx-card" key={s.tag}>
              <span className="lx-tag">{s.tag}</span>
              <strong>{s.t}</strong>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Ethics ===== */}
      <section className="lx-section">
        <div className="lx-eyebrow">Research &amp; data ethics</div>
        <h2 className="lx-h2 sm">Responsible by design</h2>
        <div className="lx-ethics">
          {ETHICS.map(([t, d]) => (
            <div className="lx-eitem" key={t}><strong>{t}</strong><p>{d}</p></div>
          ))}
        </div>
      </section>

      {/* ===== Who ===== */}
      <section className="lx-section lx-who">
        <div className="lx-mark">MM</div>
        <div>
          <div className="lx-eyebrow">Who we are</div>
          <h2 className="lx-h2 sm">Built in Kenya, engineered for Africa</h2>
          <p className="lx-lead">
            MediMatch is the work of <b>Lesnar Gitonga</b>, United States International University-Africa (USIU-Africa) —
            research presented as <em>“Leveraging Geospatial Technology for Equitable Medical Supply Redistribution:
            A Case Study of Nairobi County.”</em> The mission: give African health systems the coordination layer that
            ensures no usable supply goes to waste while a clinic down the road runs out.
          </p>
          <div className="lx-chips">
            <span><span className="lx-dot" /> USIU-Africa</span>
            <span><span className="lx-dot" /> Nairobi, Kenya</span>
            <span><span className="lx-dot" /> Global Public Health 2026</span>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="lx-final">
        <div>
          <h2>See the platform in motion.</h2>
          <p>Watch surplus get ranked and routed to urgent need across the country, live.</p>
        </div>
        <div className="lx-cta">
          <Link to="/" className="lx-btn primary">Open command map <span>→</span></Link>
          {!user
            ? <Link to="/login" className="lx-btn">Coordinator login</Link>
            : <Link to="/dashboard" className="lx-btn">Open dashboard</Link>}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="lx-section">
        <h2 className="lx-h2 sm">FAQ</h2>
        <div className="lx-faq">
          {FAQ.map(([q, a]) => (
            <details key={q}><summary>{q}</summary><div>{a}</div></details>
          ))}
        </div>
      </section>
    </div>
  );
}
