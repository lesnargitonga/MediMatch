import React from 'react';

export default function AIExplanation({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="ai-explanation" style={{ marginTop: 8, padding: 12, borderRadius: 8, border: '1px dashed var(--card-border)', background: 'rgba(250,250,255,0.6)' }}>
      <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>AI-assisted explanation <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginLeft: 8 }}>(prototype)</span></div>
      <div style={{ marginTop: 8 }} className="muted">{text}</div>
    </div>
  );
}
