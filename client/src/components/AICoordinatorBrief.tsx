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
      } catch (e) {
        if (!cancelled) setBrief('AI summary unavailable');
      }
    })();
    return () => { cancelled = true; };
  }, [stats, topListing]);

  return (
    <section className="card ai-panel" style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>AI-assisted Coordinator Brief <span style={{ fontSize: '0.78rem', marginLeft: 8, color: 'var(--muted)' }}>(prototype)</span></strong>
        <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>AI-assisted • synthetic demo data</div>
      </div>
      <div style={{ marginTop: 8 }} className="ai-note">{brief}</div>
      <div style={{ marginTop: 8 }} className="muted-small">Use this prototype AI assistance as an advisory summary. Verify facts and availability before coordination.</div>
    </section>
  );
}
