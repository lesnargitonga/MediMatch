import React from 'react';

export default function AIExplanation({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="ai-explanation" style={{ marginTop: 8, padding: 12, borderRadius: 8, border: '1px dashed var(--card-border)' }}>
      <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>AI Explanation <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginLeft: 8 }}>(AI-assisted prototype)</span></div>
      <div style={{ marginTop: 8 }} className="muted">{text}</div>
      <div style={{ marginTop: 8 }} className="muted-small">Verify before coordination. This does not provide diagnosis, treatment advice, or autonomous medical decision-making.</div>
    </div>
  );
}
