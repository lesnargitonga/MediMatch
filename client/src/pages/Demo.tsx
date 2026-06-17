import React from 'react';
import { Link } from 'react-router-dom';

const SCORE_COMPONENTS = [
  { label: 'Proximity', value: 97, note: '3.4 km route' },
  { label: 'Urgency', value: 100, note: 'Critical shortage' },
  { label: 'Category fit', value: 100, note: 'Exact match' },
  { label: 'Org trust', value: 88, note: 'Verified source' },
  { label: 'Quantity', value: 82, note: '800 available / 120 needed' },
  { label: 'Recency', value: 91, note: 'Posted 45 min ago' },
];

const WORKFLOW_STEPS = [
  {
    num: '01',
    title: 'Facility posts a signal',
    body: 'A coordinator posts what they have or what they need — quantity, category, location. Takes two minutes.',
    accent: '#0b5fff',
  },
  {
    num: '02',
    title: 'System ranks the matches',
    body: 'We score each potential transfer on six factors: distance, urgency, recency, org verification, category fit, supply quantity. You see the number and the breakdown.',
    accent: '#059669',
  },
  {
    num: '03',
    title: 'Context surfaced',
    body: 'A short plain-English summary explains why this match ranked at the top. Not the final word — just something to read before you decide.',
    accent: '#7c3aed',
  },
  {
    num: '04',
    title: 'Your decision',
    body: 'You look at the list, read the brief, and say yes or no. Nothing ships without your approval.',
    accent: '#f59e0b',
  },
];

export default function Demo() {
  return (
    <div className="demo-showcase fade-in-up">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="demo-scenario-hero" style={{ marginBottom: 28 }}>
        <div>
          <span className="lesnar-badge">Live scenario · Nairobi County, Kenya</span>
          <h1 className="heading" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', marginTop: 10, marginBottom: 10, lineHeight: 1.15 }}>
            Public-health redistribution<br />in real time
          </h1>
          <p style={{ maxWidth: 560, lineHeight: 1.7, marginBottom: 16, color: 'var(--muted)' }}>
            Kibera South Health Centre is out of wound-care supplies. Kenyatta National Hospital has 800
            surplus nitrile gloves sitting unused. MediMatch scores the transfer at 92, generates a brief
            for the coordinator, and waits.
          </p>
          <div className="hero-disclosure" style={{ marginBottom: 0 }}>
            Synthetic scenario · Nairobi County · No patient records · Coordinator decides
          </div>
        </div>

        {/* Route card — decorative, uses absolute-position CSS */}
        <div className="scenario-route-card" aria-hidden="true">
          <div className="scenario-node supply">Supply<br />800 u</div>
          <div className="scenario-line" />
          <div className="scenario-node need">Need<br />120 u</div>
          <div className="priority-score scenario-score">Score 92 · 3.4 km</div>
        </div>
      </section>

      {/* ── Workflow steps ────────────────────────────────────── */}
      <section style={{ marginBottom: 28 }}>
        <div style={{ marginBottom: 14 }}>
          <div className="subtle" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800, marginBottom: 4 }}>How it works</div>
          <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>Four-step coordination workflow</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {WORKFLOW_STEPS.map(step => (
            <div key={step.num} className="card" style={{ borderTop: `3px solid ${step.accent}`, padding: '18px 20px' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: step.accent, opacity: 0.18, lineHeight: 1, marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>{step.num}</div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{step.title}</div>
              <div className="muted-small" style={{ lineHeight: 1.55 }}>{step.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Priority score breakdown ──────────────────────────── */}
      <section style={{ marginBottom: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 18, alignItems: 'start' }}>

          {/* Score breakdown */}
          <div className="card" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
              <div>
                <div className="subtle" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800, marginBottom: 4 }}>Priority analysis</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Match score: 92 / 100</div>
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0b5fff', lineHeight: 1 }}>92</div>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {SCORE_COMPONENTS.map(sc => (
                <div key={sc.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{sc.label}</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{sc.note} · {sc.value}</span>
                  </div>
                  <div className="score-bar">
                    <span style={{ width: `${sc.value}%`, background: sc.value > 90 ? 'linear-gradient(90deg,#059669,#0b5fff)' : 'linear-gradient(90deg,#0b5fff,#06b6d4)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI coordinator brief */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card ai-panel" style={{ padding: '20px 22px' }}>
              <div className="subtle" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800, marginBottom: 10 }}>AI coordinator brief</div>
              <div className="ai-explanation" style={{ marginBottom: 12 }}>
                <p style={{ margin: 0, lineHeight: 1.65, fontSize: '0.92rem' }}>
                  Kenyatta National Hospital has 800 nitrile gloves available and is 3.4 km from Kibera South. Kibera South
                  flagged a wound-care shortage 45 minutes ago. Category is an exact match. Kenyatta is verified.
                  Score: <strong>92</strong>.
                </p>
              </div>
              <div style={{ background: 'rgba(11,95,255,0.04)', borderRadius: 8, padding: '10px 12px', fontSize: '0.82rem', color: 'var(--muted)', borderLeft: '3px solid rgba(11,95,255,0.3)' }}>
                This is a starting point for the coordinator, not a decision. You still have to approve it.
              </div>
            </div>

            <div className="card" style={{ padding: '16px 20px' }}>
              <div className="subtle" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800, marginBottom: 10 }}>Facility status</div>
              {[
                { name: 'Kenyatta National Hospital', type: 'Hospital', status: 'Verified', color: '#059669' },
                { name: 'Kibera South Health Centre', type: 'Clinic', status: 'Pending', color: '#f59e0b' },
                { name: 'Mbagathi County Hospital', type: 'Hospital', status: 'Verified', color: '#059669' },
              ].map(f => (
                <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--card-border)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{f.name}</div>
                    <div className="muted-small">{f.type}</div>
                  </div>
                  <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 800, background: f.color === '#059669' ? 'rgba(5,150,105,0.1)' : 'rgba(245,158,11,0.1)', color: f.color }}>{f.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA strip ─────────────────────────────────────────── */}
      <section className="command-strip demo-action-strip" style={{ marginBottom: 4 }}>
        <div>
          <strong style={{ fontSize: '1.02rem' }}>Walk through the live workflow</strong>
          <div className="muted-small" style={{ marginTop: 4 }}>View the real Nairobi map, inspect ranked matches, post a supply signal, then verify as a coordinator.</div>
        </div>
        <div className="demo-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/dashboard?demoTab=map" className="btn btn-primary">Open map</Link>
          <Link to="/dashboard?demoTab=suggested" className="btn btn-outline">Priority matches</Link>
          <Link to="/dashboard?demoTab=create" className="btn btn-outline">Post a signal</Link>
          <Link to="/admin" className="btn btn-outline">Coordinator review</Link>
        </div>
      </section>

    </div>
  );
}
