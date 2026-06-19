import React, { useEffect, useRef, useState } from 'react';

/* MediMatch Copilot — a conversational view of the live coordination state.
 * Answers from the real plan data (urgent approvals, in-transit transfers,
 * county shortfalls, surplus hubs). Hardcoded intent engine so it works with no
 * key and never hallucinates; reads like a real ops assistant. */

type Node = { id: number; org_name: string; county: string; role: string; surplusUnits: number; needUnits: number; urgent: boolean };
type Route = { id: number; item: string; qty: number; urgent: boolean; distance_km: number; from: { org: string; county: string }; to: { org: string; county: string } };
type Plan = { nodes: Node[]; routes: Route[]; impact: any };
type Msg = { who: 'you' | 'bot'; text: string };

const SUGGESTIONS = [
  'Which facilities need urgent approval?',
  "What's in transit right now?",
  'Shortfalls in Mandera',
  'Who has surplus oxygen?',
  'Summarise the situation',
];

function answer(q: string, plan: Plan): string {
  const ql = q.toLowerCase();
  const { routes, nodes, impact } = plan;
  const urgent = routes.filter((r) => r.urgent);
  const counties = [...new Set(nodes.map((n) => n.county))];
  const county = counties.find((c) => ql.includes(c.toLowerCase()));
  const items = ['oxygen', 'insulin', 'blood', 'iv fluid', 'fluids', 'antimalarial', 'amoxicillin', 'surgical', 'mask', 'ventilator', 'vaccine', 'cold'];
  const item = items.find((i) => ql.includes(i));
  const totalUnits = routes.reduce((s, r) => s + r.qty, 0);

  if (/approv|verif|sign.?off|authoris|authoriz/.test(ql) || (/urgent/.test(ql) && /facilit|which|need|queue/.test(ql))) {
    const list = urgent.slice(0, 6);
    return `**${urgent.length} transfers are flagged URGENT and awaiting coordinator approval.** Top of the queue:\n` +
      list.map((r) => `• ${r.to.org} (${r.to.county}) — ${r.qty} × ${r.item}, sourced from ${r.from.org}`).join('\n');
  }
  if (/transit|on the way|moving|dispatch|en route|active/.test(ql)) {
    const list = routes.slice(0, 6);
    return `**${routes.length} transfers are routed and in motion** across ${new Set(routes.map((r) => r.to.county)).size} counties — ${(impact?.total_km || routes.reduce((s, r) => s + r.distance_km, 0)).toLocaleString()} km total. Active corridors:\n` +
      list.map((r) => `• ${r.from.county} → ${r.to.county}: ${r.qty} × ${r.item}${r.urgent ? ' (urgent)' : ''}`).join('\n');
  }
  if (county) {
    const cn = nodes.filter((n) => n.county === county);
    const need = cn.filter((n) => n.needUnits > 0);
    const cr = routes.filter((r) => r.to.county === county || r.from.county === county);
    return `**${county} County** — ${cn.length} facilities, ${need.length} in shortfall (${need.reduce((s, n) => s + n.needUnits, 0)} units short), ${cr.length} connected transfers.` +
      (need.length ? `\nShortfalls: ${need.slice(0, 5).map((n) => `${n.org_name} (${n.needUnits}u)`).join(', ')}` : '');
  }
  if (item) {
    const ir = routes.filter((r) => r.item.toLowerCase().includes(item) || (item === 'fluids' && /fluid/.test(r.item.toLowerCase())));
    if (/surplus|who has|hub|source/.test(ql)) {
      const hubs = nodes.filter((n) => n.surplusUnits > 0).slice(0, 5);
      return `Surplus sources currently routing **${item}**:\n` + ir.slice(0, 5).map((r) => `• ${r.from.org} (${r.from.county}) → ${r.to.county}, ${r.qty} units`).join('\n') || hubs.map((h) => `• ${h.org_name}`).join('\n');
    }
    return `**${item}:** ${ir.length} transfers moving ${ir.reduce((s, r) => s + r.qty, 0)} units.` +
      (ir.length ? `\n${ir.slice(0, 5).map((r) => `• ${r.from.county} → ${r.to.county} (${r.qty}u${r.urgent ? ', urgent' : ''})`).join('\n')}` : ' No active transfers.');
  }
  if (/surplus|hub|source|who has|available/.test(ql)) {
    const hubs = nodes.filter((n) => n.surplusUnits > 0).sort((a, b) => b.surplusUnits - a.surplusUnits).slice(0, 5);
    return `**Top surplus hubs:**\n` + hubs.map((h) => `• ${h.org_name} (${h.county}) — ${h.surplusUnits} units available`).join('\n');
  }
  if (/summar|situation|status|overview|brief me|how are|whats happening|what's happening/.test(ql)) {
    return `**National picture:** ${nodes.length} facilities, ${routes.length} transfers routed (${urgent.length} urgent), ${totalUnits.toLocaleString()} units moving. ` +
      `Demand coverage **${impact?.coverage_pct ?? ''}%**; **${impact?.facilities_in_need ?? '—'}** facilities still in shortfall. Open a corridor on the map to trace it.`;
  }
  return `I read the live coordination state. Try:\n• "which facilities need urgent approval"\n• "what's in transit"\n• "shortfalls in Mandera"\n• "who has surplus oxygen"\n• "summarise the situation"`;
}

function render(text: string) {
  return text.split('\n').map((line, i) => (
    <div key={i} className={line.startsWith('•') ? 'cp-li' : ''} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
  ));
}

export default function Copilot({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ who: 'bot', text: "**MediMatch Copilot.** Ask me what needs approval, what's in transit, or where the shortfalls are." }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bodyRef.current?.scrollTo(0, bodyRef.current.scrollHeight); }, [msgs, typing]);

  const ask = (q: string) => {
    if (!q.trim()) return;
    setMsgs((m) => [...m, { who: 'you', text: q }]);
    setInput('');
    setTyping(true);
    const a = answer(q, plan);
    window.setTimeout(() => { setTyping(false); setMsgs((m) => [...m, { who: 'bot', text: a }]); }, 650 + Math.min(900, a.length * 4));
  };

  return (
    <div className="cp">
      <div className="cp-head">
        <span><i className="sv-live" /> MediMatch Copilot</span>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="cp-body" ref={bodyRef}>
        {msgs.map((m, i) => (
          <div key={i} className={`cp-msg ${m.who}`}>{render(m.text)}</div>
        ))}
        {typing && <div className="cp-msg bot cp-typing"><span /><span /><span /></div>}
      </div>
      <div className="cp-sugg">
        {SUGGESTIONS.map((s) => <button key={s} onClick={() => ask(s)}>{s}</button>)}
      </div>
      <form className="cp-input" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about the live coordination state…" />
        <button type="submit">→</button>
      </form>
    </div>
  );
}
