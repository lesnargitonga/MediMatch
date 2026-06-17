import React, { useEffect, useState } from 'react';
import AI from '../services/ai';

export default function AICoordinatorBrief({ stats, topListing }: { stats?: any; topListing?: any }) {
  const [brief, setBrief] = useState<string>('');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const text = AI.generateCoordinatorBrief({ stats, topListing });
        if (!cancelled) setBrief(text);
      } catch {
        if (!cancelled) setBrief('');
      }
    })();
    return () => { cancelled = true; };
  }, [stats, topListing]);

  if (!brief) return null;
  const firstSentence = brief.split(/(?<=[.!?])\s/)[0] || brief;

  return (
    <div style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'var(--surface)', marginTop: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(11,95,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0b5fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 3 }}>
          AI brief <span style={{ fontWeight: 400, color: 'var(--muted)' }}>· advisory only</span>
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.6 }}>{firstSentence}</div>
      </div>
    </div>
  );
}
