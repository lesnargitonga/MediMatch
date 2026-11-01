# MediMatch conference speaker notes

> **Correction, 2026-11-01.** The survey shown on slides 3–5 is a Google Form showing 64
> responses. **52 were generated** by the project's synthetic-survey tool and submitted to the
> form (its export holds exactly those 52, all within eight minutes on 24 Nov 2025). **The
> provenance of the other 12 is unverified.** Neither group is validated participant research.
> Do not present it as a field study, as "real field data" or as what healthcare professionals
> told us. Present its charts only as illustrative synthetic data,
> or leave them out. Facility names and locations are real; inventory is synthetic; KEMSA's 57%
> order-fill rate is the one published baseline. See `CORRECTION.md`.


Target: 11–13 minutes, then a 3–5 minute live demo. 13 slides.

All figures match the published GPH2026 abstract (ISBN 978-1-988652-96-2, p.6) exactly, so nothing on screen contradicts the abstract book in the room.

## 1. Opening — 45 seconds

“MediMatch starts with a simple contradiction: one facility can have usable stock approaching expiry while another facility is urgently searching for the same category of supply. The missing layer is coordination. MediMatch uses location, need, availability and trust signals to make that coordination visible.”

Do not describe MediMatch as a clinical decision system. Call it a public-health supply-coordination prototype.

## 2. The coordination gap — 45 seconds

“The problem is not only scarcity; it is disconnected visibility. A facility can hold usable surplus while another faces an urgent shortfall, and neither can see the other. KEMSA reported a national order-fill rate of only 57% as of mid-2025 — the baseline this work addresses.”

The 57% KEMSA figure is a historical baseline from mid-2025, not the current 2026 rate.

## 3. Who we surveyed — Q1–Q3 — 35 seconds

These charts come from a form whose 64 responses include generated entries (see the correction above). Say so if you show them: “These are illustrative figures from a synthetic survey used to exercise the prototype, not responses from participants.”

## 4. The current system, in their words — Q4–Q6 — 45 seconds

“Asked how often they run out of essential items, 56.3% face weekly or monthly stockouts. Surplus is handled ad-hoc — informal redistribution, returns to KEMSA, WhatsApp. And 82.8% rate today’s method of locating emergency supplies as ineffective or slow. Note these are the abstract’s 56.3% and 82.8% figures, read straight off the raw charts.”

Q4: 12.5% weekly + 43.8% monthly = 56.3%. Q6: 23.4% ineffective + 59.4% slow = 82.8%.

## 5. Challenges, value & readiness — Q7–Q9 — 45 seconds

“When we asked for the main challenges, wastage of valid medical supplies topped the list at 57.8%. They valued real-time redistribution, cost efficiency and equitable access most. And readiness is high: 89.1% would recommend their facility pilot MediMatch. Again, 57.8% and 89.1% are the abstract figures, shown from the responses.”

Q7: wastage cited by 37/64 = 57.8%. Q9: 57.8% Yes + 31.3% Maybe = 89.1%.

## 6. National operating picture — 55 seconds

“The national command floor brings demand, surplus, routes and operational context into one view. The workflow is detect, rank, route and verify. It uses real Kenyan facility names and approximate geocodes, with synthetic inventory.”

## 7. Demand heatmap — 50 seconds

“The heatmap reveals concentration. It stops us treating every request as an isolated ticket and helps the coordinator see clusters, nearby hubs and feasible corridors. Distance matters, but it is not the only signal.”

## 8. Nairobi research base — 60 seconds

“Nairobi is the research base and the street-scale test case. The same logic works at facility level: detect shortfalls, rank candidate hubs by distance, urgency and product fit, then inspect the route on real roads.”

Inventory values are demonstration data; do not present the onscreen totals as deployed real-world performance.

## 9. Explainable matching — 55 seconds

“A good match is not simply the nearest facility. It also needs the right product, enough quantity, a verified source and a practical route — the five decision signals shown here. MediMatch exposes those reasons in a plain-language situation brief, so the coordinator can challenge the recommendation.”

The demo-safe brief is deterministic and grounded in plan data; Claude is optional and not required.

## 10. Impact projection — 70 seconds

Lead with the disclaimer: “This is a transparent model, not measured impact and not a guarantee.”

“At the engine’s current throughput, a one-year projection extrapolates from the 57% KEMSA baseline and illustrative rates from the synthetic survey — redistributed units, stockouts averted, units saved from expiry, and demand coverage rising from 57% toward the mid-80s. Every assumption is on screen.”

## 11. Copilot — 50 seconds

“The Copilot is not a general chatbot. It answers from the live coordination state: what needs approval, what is moving, where shortfalls exist and which hubs have surplus. Here it has surfaced the urgent transfers awaiting approval. Its role is to compress operational state, not to replace judgment.”

## 12. Architecture and safeguards — 55 seconds

“The experience is React and MapLibre. The API is Node and Express. Spatial persistence is PostgreSQL and PostGIS, with routing and map services around it. The intelligence layer can use curated fallbacks or Claude. The important boundary is the human coordinator: no diagnosis and no autonomous transfer.”

## 13. Close and transition to demo — 30 seconds

“MediMatch turns location from a passive data field into a coordination advantage, in service of equitable access and SDG 12. Let me show the live workflow.”

Demo order:

1. Let the globe intro complete.
2. Toggle Demand heatmap.
3. Open Nairobi research base.
4. Open Project impact and select 1 year.
5. Ask Copilot: “Which facilities need urgent approval?”

## Pre-flight

- Use `/home/lesnar/publish-stage/MediMatch` at `main@d7be7d4`.
- App is served as a production build at `http://localhost:5173/`; warm it before presenting so map tiles and road routes are cached.
- Keep `MediMatch_Conference_Deck.pdf` open as an offline fallback.
- The deck screenshots are captured live at 2× resolution, shown whole (never cropped); survey charts are Google Forms output whose responses include generated entries; they are illustrative, not participant research.
- Do not expose API keys or patient data; the recommended demo uses curated local briefs and synthetic inventory.
- Abstract figures: KEMSA 57% and SDG 12 stand. The survey figures (n=64, 80% response, 56.3%, 82.8%, 57.8%, 89.1%) come from a survey that includes generated responses and are not participant research.
