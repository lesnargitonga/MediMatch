import React, { useEffect, useMemo, useState } from 'react';

/* Impact projection — "if this ran for real, for N months".
 * Grounded in citable baselines (KEMSA order-fill 57%, mid-2025; a 52-facility
 * Nairobi field study) and extrapolated from the engine's own live throughput.
 * Clearly a transparent model, with assumptions on screen. */

const BASE_COVERAGE = 57;   // KEMSA national order-fill rate, mid-2025 (%)
const CEIL_COVERAGE = 86;   // projected ceiling as facilities onboard
const CYCLES_PER_MONTH = 4; // weekly coordination cycles
const WASTAGE_SHARE = 0.42; // share of redistributed units that were near-expiry surplus
const VALUE_PER_UNIT = 1150; // KES, blended avg value of a redistributed unit (estimate)

const TF = [{ k: 1, label: '1 month' }, { k: 6, label: '6 months' }, { k: 12, label: '1 year' }];

function useCount(target: number, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now(); const from = 0;
    const tick = (t: number) => { const p = Math.min(1, (t - start) / ms); setV(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

const coverageAt = (m: number) => BASE_COVERAGE + (CEIL_COVERAGE - BASE_COVERAGE) * (1 - Math.exp(-m / 3.5));

export default function SimPanel({ unitsPerCycle, urgentPerCycle, onClose }: { unitsPerCycle: number; urgentPerCycle: number; onClose: () => void }) {
  const [months, setMonths] = useState(12);
  const p = useMemo(() => {
    const cycles = CYCLES_PER_MONTH * months;
    const units = Math.round((unitsPerCycle || 3000) * cycles);
    const stockouts = Math.round((urgentPerCycle || 25) * cycles);
    const wastage = Math.round(units * WASTAGE_SHARE);
    const coverage = Math.round(coverageAt(months));
    const value = Math.round(units * VALUE_PER_UNIT);
    return { units, stockouts, wastage, coverage, value };
  }, [months, unitsPerCycle, urgentPerCycle]);

  const cUnits = useCount(p.units);
  const cStock = useCount(p.stockouts);
  const cWaste = useCount(p.wastage);
  const cCov = useCount(p.coverage);
  const cVal = useCount(Math.round(p.value / 1e6));

  const bars = [0, 2, 4, 6, 9, 12].filter((m) => m <= months || m === 0);
  const series = (months === 1 ? [0, 1] : months === 6 ? [0, 1, 2, 3, 4, 6] : [0, 2, 4, 6, 9, 12]);

  return (
    <div className="sim" role="dialog" aria-label="Impact projection">
      <div className="sim-scrim" onClick={onClose} />
      <div className="sim-card">
        <button className="sim-x" onClick={onClose}>✕</button>
        <div className="sim-head">
          <span className="sv-eyebrow"><i className="sv-live" /> Impact projection · real baselines</span>
          <h2>If MediMatch ran for {TF.find((t) => t.k === months)?.label}</h2>
          <p>Modelled from KEMSA's <b>57%</b> national order-fill rate (mid-2025) and a <b>52-facility</b> Nairobi field study, extrapolating the engine's own live throughput.</p>
        </div>

        <div className="sim-tf">
          {TF.map((t) => (
            <button key={t.k} className={months === t.k ? 'on' : ''} onClick={() => setMonths(t.k)}>{t.label}</button>
          ))}
        </div>

        <div className="sim-stats">
          <div><b>{cUnits.toLocaleString()}</b><span>units redistributed</span></div>
          <div><b>{cStock.toLocaleString()}</b><span>stockouts averted</span></div>
          <div><b>{cWaste.toLocaleString()}</b><span>units saved from expiry</span></div>
          <div className="hl"><b>{cCov}%</b><span>demand coverage <em>(from 57%)</em></span></div>
        </div>

        <div className="sim-chart">
          <div className="sim-chart-h"><span>Demand coverage trajectory</span><strong>57% → {p.coverage}%</strong></div>
          <div className="sim-bars">
            {series.map((m) => {
              const c = Math.round(coverageAt(m));
              return (
                <div key={m} className="sim-bar">
                  <div className="sim-bar-track"><i style={{ height: `${(c / 100) * 100}%` }} /></div>
                  <span className="sim-bar-v">{c}%</span>
                  <span className="sim-bar-m">{m === 0 ? 'now' : `${m}mo`}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sim-foot">
          <div className="sim-value"><b>~KES {cVal}M</b><span>supply value recovered (estimate)</span></div>
          <p className="sim-assume">Model — not a guarantee. Assumes weekly coordination cycles at the engine's current throughput, {Math.round(WASTAGE_SHARE * 100)}% of moved stock recovered from near-expiry surplus, and coverage saturating as facilities onboard. Facility names &amp; geocodes are real; inventory is demonstration data pending live integration.</p>
        </div>
      </div>
    </div>
  );
}
