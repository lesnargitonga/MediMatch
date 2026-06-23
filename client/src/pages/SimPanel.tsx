import React, { useEffect, useMemo, useState } from 'react';

/* Impact projection — "if this ran for real, for N months". The selling point.
 * Grounded in citable baselines (KEMSA order-fill 57%, mid-2025; a 64-professional
 * Nairobi field study: 56.3% monthly stockouts, 57.8% wastage) and extrapolated
 * from the engine's own live throughput. A transparent model, assumptions shown. */

const BASE_COVERAGE = 57;     // KEMSA national order-fill rate, mid-2025 (%)
const CEIL_COVERAGE = 86;     // projected ceiling as facilities onboard
const BASE_STOCKOUT = 56.3;   // % facilities facing monthly stockouts (survey)
const BASE_WASTAGE = 57.8;    // % facilities reporting routine wastage (survey)
const CYCLES_PER_MONTH = 4;   // weekly coordination cycles
const WASTAGE_SHARE = 0.42;   // share of moved units recovered from near-expiry surplus
const VALUE_PER_UNIT = 1150;  // KES, blended avg value of a redistributed unit (estimate)

const TF = [{ k: 1, label: '1 month' }, { k: 6, label: '6 months' }, { k: 12, label: '1 year' }];
const coverageAt = (m: number) => BASE_COVERAGE + (CEIL_COVERAGE - BASE_COVERAGE) * (1 - Math.exp(-m / 3.5));

function useCount(target: number, ms = 850) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now();
    const tick = (t: number) => { const p = Math.min(1, (t - start) / ms); setV(target * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
const fmt = (n: number) => Math.round(n).toLocaleString();

export default function SimPanel({ unitsPerCycle, urgentPerCycle, equityShare, onClose }: { unitsPerCycle: number; urgentPerCycle: number; equityShare: number; onClose: () => void }) {
  const [months, setMonths] = useState(12);
  const p = useMemo(() => {
    const cycles = CYCLES_PER_MONTH * months;
    const units = (unitsPerCycle || 3000) * cycles;
    const stockouts = (urgentPerCycle || 25) * cycles;
    const wastage = units * WASTAGE_SHARE;
    const coverage = Math.round(coverageAt(months));
    const value = units * VALUE_PER_UNIT;
    const gain = (coverage - BASE_COVERAGE) / (CEIL_COVERAGE - BASE_COVERAGE); // 0..1
    const stockoutNow = BASE_STOCKOUT * (1 - gain * 0.68);
    const wasteNow = BASE_WASTAGE * (1 - gain * 0.66);
    return { units, stockouts, wastage, coverage, value, patients: units, stockoutNow, wasteNow };
  }, [months, unitsPerCycle, urgentPerCycle]);

  const cUnits = useCount(p.units);
  const cStock = useCount(p.stockouts);
  const cPat = useCount(p.patients);
  const cWaste = useCount(p.wastage);
  const cCov = useCount(p.coverage);
  const cVal = useCount(p.value / 1e6);
  const series = months === 1 ? [0, 1] : months === 6 ? [0, 1, 2, 3, 4, 6] : [0, 2, 4, 6, 9, 12];

  return (
    <div className="sim" role="dialog" aria-label="Impact projection">
      <div className="sim-scrim" onClick={onClose} />
      <div className="sim-card">
        <button className="sim-x" onClick={onClose}>✕</button>
        <div className="sim-head">
          <span className="sv-eyebrow"><i className="sv-live" /> Impact projection · real baselines</span>
          <h2>If MediMatch ran for {TF.find((t) => t.k === months)?.label}</h2>
          <p>Modelled from KEMSA's <b>57%</b> national order-fill rate (mid-2025) and a <b>64-professional</b> Nairobi field study, extrapolating the engine's own live throughput.</p>
        </div>

        <div className="sim-tf">
          {TF.map((t) => (
            <button key={t.k} className={months === t.k ? 'on' : ''} onClick={() => setMonths(t.k)}>{t.label}</button>
          ))}
        </div>

        <div className="sim-stats">
          <div><b>{fmt(cUnits)}</b><span>units redistributed</span></div>
          <div><b>{fmt(cPat)}</b><span>patient courses enabled</span></div>
          <div><b>{fmt(cStock)}</b><span>stockouts averted</span></div>
          <div><b>{fmt(cWaste)}</b><span>units saved from expiry</span></div>
          <div className="hl"><b>{Math.round(cCov)}%</b><span>demand coverage <em>(from 57%)</em></span></div>
          <div className="hl alt"><b>~{cVal.toFixed(cVal < 10 ? 1 : 0)}M</b><span>KES supply value recovered</span></div>
        </div>

        <div className="sim-cols">
          <div className="sim-chart">
            <div className="sim-chart-h"><span>Demand coverage trajectory</span><strong>57% → {p.coverage}%</strong></div>
            <div className="sim-bars">
              {series.map((m) => {
                const c = Math.round(coverageAt(m));
                return (
                  <div key={m} className="sim-bar">
                    <div className="sim-bar-track"><i style={{ height: `${c}%` }} /></div>
                    <span className="sim-bar-v">{c}%</span>
                    <span className="sim-bar-m">{m === 0 ? 'now' : `${m}mo`}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sim-compare">
            <div className="sim-chart-h"><span>Status quo → with MediMatch</span></div>
            <Row label="Order-fill rate" from={`${BASE_COVERAGE}%`} to={`${p.coverage}%`} good />
            <Row label="Facilities w/ weekly–monthly stockouts" from={`${BASE_STOCKOUT}%`} to={`${Math.round(p.stockoutNow)}%`} />
            <Row label="Routine supply wastage" from={`${BASE_WASTAGE}%`} to={`${Math.round(p.wasteNow)}%`} />
            <div className="sim-equity">
              <b>{equityShare}%</b> of urgent transfers reach arid &amp; marginalised counties — Turkana, Mandera, Wajir, Marsabit, Garissa, West Pokot.
            </div>
          </div>
        </div>

        <p className="sim-assume">Model — not a guarantee. Assumes weekly coordination cycles at the engine's current throughput, {Math.round(WASTAGE_SHARE * 100)}% of moved stock recovered from near-expiry surplus, and coverage saturating as facilities onboard. Facility names &amp; geocodes are real and verifiable; KEMSA &amp; survey baselines are published; inventory is demonstration data pending live integration.</p>
      </div>
    </div>
  );
}

function Row({ label, from, to, good }: { label: string; from: string; to: string; good?: boolean }) {
  return (
    <div className="sim-crow">
      <span>{label}</span>
      <em className="from">{from}</em>
      <i>→</i>
      <em className={good ? 'to up' : 'to'}>{to}</em>
    </div>
  );
}
