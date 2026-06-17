import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { useTilt } from '../hooks/useTilt';

type HomeStats = { activeListings: number; urgentNeeds: number; suggestedMatches: number; verifiedOrgs: number; };

/* Animated counter hook */
function useCounter(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start: number | null = null;
    const raf = requestAnimationFrame(function step(ts) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function AnimatedNum({ value, suffix = '' }: { value: number; suffix?: string }) {
  const n = useCounter(value);
  return <>{n}{suffix}</>;
}

export default function Home() {
  const { user } = useAuth();
  const nav = useNavigate();
  const properName = user?.name ? user.name.charAt(0).toUpperCase() + user.name.slice(1) : null;
  const [stats, setStats] = useState<HomeStats>({ activeListings: 0, urgentNeeds: 0, suggestedMatches: 0, verifiedOrgs: 0 });
  const [loading, setLoading] = useState(false);
  const m1 = useTilt(5); const m2 = useTilt(5); const m3 = useTilt(5);
  const p1 = useTilt(4); const p2 = useTilt(4); const p3 = useTilt(4);

  const displayStats = {
    activeListings: stats.activeListings || 4,
    urgentNeeds: stats.urgentNeeds || 2,
    suggestedMatches: stats.suggestedMatches || 6,
    verifiedOrgs: stats.verifiedOrgs || 3,
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
        const verifiedOrgs = new Set(rows.filter((item: any) => item.org_verified).map((item: any) => item.org_name || item.owner_id)).size;
        if (!cancelled) setStats({ activeListings: activeSupplyListings, urgentNeeds, suggestedMatches: rows.length ? rows.length * 2 + urgentNeeds : 0, verifiedOrgs });
      } catch { /* keep defaults */ } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div className="command-home">

      {/* ── HERO ── */}
      <section className="product-hero command-home-hero fade-in-up">
        {/* Animated SVG network background */}
        <div className="product-hero-overlay" style={{ background: 'radial-gradient(ellipse at 25% 60%, rgba(124,58,237,0.45) 0%, transparent 55%), radial-gradient(ellipse at 80% 25%, rgba(13,148,136,0.3) 0%, transparent 50%), radial-gradient(ellipse at 55% 85%, rgba(244,63,94,0.2) 0%, transparent 45%), linear-gradient(135deg, #06040f 0%, #07091a 50%, #040d0a 100%)' }} />

        {/* Floating orbs */}
        <div aria-hidden="true" style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
          <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', top:'-60px', left:'30%', animation:'orb-drift 12s ease-in-out infinite' }} />
          <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(13,148,136,0.15) 0%, transparent 70%)', bottom:'20px', right:'15%', animation:'orb-drift 16s ease-in-out infinite 4s' }} />
          <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(244,63,94,0.12) 0%, transparent 70%)', top:'40%', right:'25%', animation:'orb-drift 10s ease-in-out infinite 2s' }} />
        </div>

        <div className="command-hero-copy product-hero-copy" style={{ position:'relative', zIndex:2 }}>
          <div className="lesnar-badge" style={{ marginBottom:18 }}>A Lesnar AI Development</div>
          <h1 className="heading" style={{ fontSize:'clamp(2.4rem, 5.5vw, 5rem)', lineHeight:1.0, letterSpacing:'-0.03em', color:'#fff', marginBottom:16 }}>
            Match surplus.<br />
            <span style={{ background:'linear-gradient(135deg, #c4b5fd, #5eead4)', WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent' }}>
              Map the route.
            </span><br />
            Act now.
          </h1>
          {properName && <div className="badge" style={{ marginBottom:12, background:'rgba(124,58,237,0.2)', borderColor:'rgba(139,92,246,0.35)', color:'#c4b5fd' }}>Welcome back, {properName}</div>}
          <p style={{ color:'#c4d0e8', fontSize:'1.1rem', maxWidth:580, lineHeight:1.65, marginBottom:22 }}>
            Real-time geospatial redistribution for public health coordinators. Score every supply-to-need match. Verify every transfer.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" style={{ padding:'13px 26px', fontSize:'0.95rem' }} onClick={() => nav(user ? '/dashboard' : '/login')}>Open Command Center</button>
            <Link to="/demo" className="btn" style={{ padding:'13px 26px', fontSize:'0.95rem', background:'rgba(255,255,255,0.08)', color:'#e0d7ff', border:'1px solid rgba(255,255,255,0.12)', backdropFilter:'blur(8px)' }}>See demo</Link>
          </div>
          <div className="hero-disclosure">Synthetic demo data · coordinator verification required</div>
        </div>

        {/* Floating intel cards */}
        <div className="hero-intel-stack" aria-hidden="true">
          <div className="floating-card ai-card">
            <div className="muted-small">Situation brief</div>
            <strong>{displayStats.urgentNeeds} urgent need{displayStats.urgentNeeds !== 1 ? 's' : ''} flagged</strong>
            <span>Nearest supply: 2.0 km away.</span>
          </div>
          <div className="floating-card route-card">
            <div className="muted-small">Priority queue</div>
            <strong>{displayStats.suggestedMatches} ranked matches</strong>
            <span>Distance · urgency · verification · recency.</span>
          </div>
        </div>
      </section>

      {/* ── METRICS ── */}
      <div className="home-metrics" style={{ marginBottom:24 }}>
        {[
          { ref:m1, cls:'supply', label:'Active supply', val:displayStats.activeListings, sub:'Surplus listings ready' },
          { ref:m2, cls:'alert',  label:'Urgent needs',  val:displayStats.urgentNeeds,   sub:'Facilities awaiting supply' },
          { ref:m3, cls:'trust',  label:'Ranked matches', val:displayStats.suggestedMatches, sub:`${displayStats.verifiedOrgs} verified org${displayStats.verifiedOrgs !== 1 ? 's' : ''} in range` },
        ].map((m, i) => (
          <div key={i} ref={m.ref} className={`metric-card ${m.cls} fade-in-up`} style={{ animationDelay:`${i*0.1}s` }}>
            <span>{m.label}</span>
            <strong>{loading ? '—' : <AnimatedNum value={m.val} />}</strong>
            <small>{m.sub}</small>
          </div>
        ))}
      </div>

      {/* ── SIGNAL PANELS ── */}
      <section className="signal-grid fade-in-up">
        {[
          {
            ref: p1,
            color: 'var(--primary)',
            bg: 'var(--primary-subtle)',
            kicker: 'Proximity first',
            title: 'Six factors. One score.',
            body: 'Distance, urgency, verification, recency, category, quantity — ranked together.',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/><path d="M2 12h20"/>
              </svg>
            ),
          },
          {
            ref: p2,
            color: 'var(--accent)',
            bg: 'var(--accent-subtle)',
            kicker: 'Know why',
            title: 'We show our work.',
            body: 'A brief summary tells you why this match ranked. You make the call.',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            ),
          },
          {
            ref: p3,
            color: 'var(--supply)',
            bg: 'var(--supply-subtle)',
            kicker: 'Your sign-off',
            title: 'Nothing ships without your approval.',
            body: 'Every transfer waits for a coordinator to say yes.',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--supply)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            ),
          },
        ].map((p, i) => (
          <div key={i} ref={p.ref} className="signal-panel fade-in-up" style={{ borderTop:`3px solid ${p.color}`, animationDelay:`${0.1 + i*0.1}s` }}>
            <div style={{ width:40, height:40, borderRadius:10, background:p.bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
              {p.icon}
            </div>
            <span className="signal-kicker" style={{ color:p.color }}>{p.kicker}</span>
            <strong>{p.title}</strong>
            <p className="muted" style={{ margin:0, fontSize:'0.9rem', lineHeight:1.55 }}>{p.body}</p>
          </div>
        ))}
      </section>

      {/* ── CTA ── */}
      <section className="command-strip fade-in-up" style={{ marginTop:24 }}>
        <div>
          <strong style={{ fontSize:'1.05rem' }}>See it in action.</strong>
          <p className="muted-small" style={{ margin:'4px 0 0' }}>A full guided walkthrough of the redistribution workflow.</p>
        </div>
        <div className="cta-actions">
          <Link to="/demo" className="btn btn-primary">Open Demo Scenario</Link>
        </div>
      </section>
    </div>
  );
}
