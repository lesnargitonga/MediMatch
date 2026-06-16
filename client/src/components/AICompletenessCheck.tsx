import React, { useEffect, useState } from 'react';
import AI from '../services/ai';

export default function AICompletenessCheck(props: { title?: string; description?: string; quantity?: number; category?: string; lat?: string | number; lon?: string | number }) {
  const { title, description, quantity, category, lat, lon } = props;
  const [report, setReport] = useState<{ score: number; suggestions: string[] } | null>(null);

  useEffect(() => {
    const r = AI.completenessCheck({ title, description, quantity, category, lat, lon });
    setReport(r as any);
  }, [title, description, quantity, category, lat, lon]);

  if (!report) return null;

  return (
    <div className="ai-panel" style={{ marginTop: 12, padding: 12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontWeight: 800 }}>AI-assisted Completeness Check <span style={{ fontSize: '0.82rem', color: 'var(--muted)', marginLeft: 8 }}>(prototype)</span></div>
        <div className="ai-score" style={{ fontWeight: 800 }}>{report.score}%</div>
      </div>
      <div style={{ marginTop: 8 }} className="muted-small">{report.suggestions.map((s, i) => (<div key={i} className="ai-suggestion">• {s}</div>))}</div>
      <div style={{ marginTop: 8 }} className="muted-small">This is advisory only. Verify details before coordinating transfers.</div>
    </div>
  );
}
