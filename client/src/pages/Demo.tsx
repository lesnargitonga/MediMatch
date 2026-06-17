import React from 'react';
import { Link } from 'react-router-dom';

const SCORE_SIGNALS = [
  { label: 'Proximity', value: 97 },
  { label: 'Urgency', value: 100 },
  { label: 'Category', value: 100 },
  { label: 'Verification', value: 88 },
  { label: 'Quantity', value: 82 },
  { label: 'Recency', value: 91 },
];

const STEPS = [
  { n: '01', title: 'Facility posts a signal', body: 'What they have or what they need. Quantity, category, location.' },
  { n: '02', title: 'System scores the matches', body: 'Six factors ranked in one number. Distance, urgency, verification, recency, category, quantity.' },
  { n: '03', title: 'Context surfaced', body: 'A short plain-English summary of why this match ranked at the top.' },
  { n: '04', title: 'Your decision', body: 'Nothing moves without your sign-off.' },
];

export default function Demo() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 28px' }}>

      {/* Hero */}
      <section className="demo-scenario-hero" style={{ marginBottom: 32 }}>
        <div>
          <span className="lesnar-badge">Live scenario · Nairobi County</span>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 900, margin: '12px 0 16px', lineHeight: 1.12, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Surplus found.<br />Route scored.<br />Waiting for you.
          </h1>
          <p style={{ color: '#94a3b8', lineHeight: 1.65, maxWidth: 480, margin: 0 }}>
            Kenyatta has 800 surplus gloves. Kibera South needs wound-care supplies now.
            Score: <strong style={{ color: '#22d3ee' }}>92</strong>. The coordinator decides.
          </p>
        </div>
        <div className="scenario-route-card" aria-hidden="true">
          <div className="scenario-node supply">Supply<br />800 u</div>
          <div className="scenario-line" />
          <div className="scenario-node need">Need<br />120 u</div>
          <div className="priority-score scenario-score">92 · 3.4 km</div>
        </div>
      </section>

      {/* Steps */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 14 }}>How it works</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ padding: '18px 16px', border: '1px solid var(--card-border)', borderRadius: 14, background: 'var(--surface)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--card-border)', lineHeight: 1, marginBottom: 10 }}>{s.n}</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Score + Brief */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 32 }}>
        <div style={{ border: '1px solid var(--card-border)', borderRadius: 14, padding: '24px', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Match score breakdown</div>
            <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#0b5fff', letterSpacing: '-0.03em', lineHeight: 1 }}>92</div>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {SCORE_SIGNALS.map(s => (
              <div key={s.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.84rem' }}>
                  <span style={{ fontWeight: 600 }}>{s.label}</span>
                  <span style={{ color: 'var(--muted)' }}>{s.value}</span>
                </div>
                <div style={{ height: 5, background: 'var(--card-border)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${s.value}%`, height: '100%', background: s.value > 90 ? '#059669' : '#0b5fff', borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ border: '1px solid var(--card-border)', borderRadius: 14, padding: '20px', background: 'var(--surface)', flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 12 }}>Situation brief</div>
            <p style={{ margin: 0, lineHeight: 1.65, fontSize: '0.9rem' }}>
              Kenyatta National Hospital has 800 nitrile gloves available. Kibera South flagged a wound-care
              shortage 45 minutes ago. Category match is exact. Kenyatta is verified. Score: <strong>92</strong>.
            </p>
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(11,95,255,0.05)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--muted)', borderLeft: '3px solid #0b5fff' }}>
              This is a starting point. You still approve it.
            </div>
          </div>

          <div style={{ border: '1px solid var(--card-border)', borderRadius: 14, padding: '16px 20px', background: 'var(--surface)' }}>
            <div style={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 10 }}>Facilities</div>
            {[
              { name: 'Kenyatta National Hospital', status: 'Verified', ok: true },
              { name: 'Kibera South Health Centre', status: 'Pending', ok: false },
              { name: 'Mbagathi County Hospital', status: 'Verified', ok: true },
            ].map(f => (
              <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--card-border)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{f.name}</span>
                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, background: f.ok ? 'rgba(5,150,105,0.1)' : 'rgba(245,158,11,0.1)', color: f.ok ? '#059669' : '#d97706' }}>{f.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Actions */}
      <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link to="/dashboard?demoTab=map" className="btn btn-primary">Open map</Link>
        <Link to="/dashboard?demoTab=suggested" className="btn btn-outline">Priority matches</Link>
        <Link to="/dashboard?demoTab=create" className="btn btn-outline">Post a signal</Link>
        <Link to="/admin" className="btn btn-outline">Coordinator review</Link>
      </section>

    </div>
  );
}
