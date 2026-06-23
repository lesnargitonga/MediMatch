# MediMatch conference speaker notes

Target: 10–12 minutes, then a 3–5 minute live demo.

All figures below match the published GPH2026 abstract (ISBN 978-1-988652-96-2, p.6) exactly, so nothing on screen contradicts the abstract book in the room.

## 1. Opening — 45 seconds

“MediMatch starts with a simple contradiction: one facility can have usable stock approaching expiry while another facility is urgently searching for the same category of supply. The missing layer is coordination. MediMatch uses location, need, availability and trust signals to make that coordination visible.”

Do not describe MediMatch as a clinical decision system. Call it a public-health supply-coordination prototype.

## 2. The coordination gap — 45 seconds

“The problem is not only scarcity; it is disconnected visibility. A facility can hold usable surplus while another faces an urgent shortfall, and neither can see the other. KEMSA reported a national order-fill rate of only 57% as of mid-2025 — the baseline this work addresses.”

The 57% KEMSA figure is a historical baseline from mid-2025, not the current 2026 rate.

## 3. The field evidence — survey results — 70 seconds

These are real, unedited Google Forms charts (n=64). Each maps to a headline figure in the abstract:
- Stockouts: 12.5% weekly + 43.8% monthly = **56.3%** weekly or monthly.
- Effectiveness: 23.4% ineffective + 59.4% slow = **82.8%** ineffective or slow.
- Challenges: wastage of valid supplies cited by 37 respondents = **57.8%**.
- Pilot: 57.8% Yes + 31.3% Maybe = **89.1%** willing to pilot.

“We engaged 64 healthcare professionals across Nairobi County, with an 80% response rate. The findings are stark — and these are the raw survey charts, not a redrawn summary. 56.3% face weekly or monthly stockouts; 82.8% rate current methods ineffective or slow; 57.8% cite wastage of valid supplies; and 89.1% are willing to pilot. The need is not contested — it is quantified by the people who run the supply rooms.”

## 4. Respondent profile — 40 seconds

“Who answered matters. Half are clinical staff — nurses and pharmacists who handle stock daily — alongside administrators and technical personnel. The workforce is predominantly under 40 and digitally fluent, and gender is balanced with a slight female majority. Today they cope with ad-hoc methods: informal redistribution, returns to KEMSA, and WhatsApp. That is the gap MediMatch formalises.”

## 5. National operating picture — 60 seconds

“The national command floor brings demand, surplus, routes and operational context into one view. The workflow is detect, rank, route and verify. The live demo uses real Kenyan facility names and approximate geocodes, with synthetic inventory.”

## 6. Demand heatmap — 55 seconds

“The heatmap reveals concentration. It stops us treating every request as an isolated ticket and helps the coordinator see clusters, nearby hubs and feasible corridors. Distance matters, but it is not the only signal.”

## 7. Nairobi research base — 70 seconds

“Nairobi is the research base and the street-scale test case. Here the same logic works at facility level: detect shortfalls, rank candidate hubs by distance, urgency and product fit, then inspect the route on real roads.”

Mention that inventory values are demonstration data. Avoid presenting the onscreen totals as deployed real-world performance.

## 8. Explainable matching — 65 seconds

“A good match is not simply the nearest facility. It also needs the right product, enough quantity, a verified source and a practical route. MediMatch exposes those reasons in the situation brief, so the coordinator can challenge the recommendation.”

“The demo-safe brief is deterministic and grounded in the plan data. Claude can be enabled for richer analysis, but the presentation does not depend on an API key.”

## 9. Impact projection — 75 seconds

Lead with the disclaimer: “This is a transparent model, not measured impact and not a guarantee.”

Then say: “At the engine’s current synthetic throughput, a one-year projection extrapolates from the 57% KEMSA baseline and the 64-professional field study — redistributed units, stockouts averted, units saved from expiry and demand coverage rising from 57% toward the mid-80s. Every assumption is displayed on screen.”

## 10. Copilot — 55 seconds

“The Copilot is not a general chatbot. It answers from the live coordination state: what needs approval, what is moving, where a shortfall exists and which hubs have surplus. Its role is to compress operational state, not to replace judgment.”

## 11. Architecture and safeguards — 60 seconds

“The experience is React and MapLibre. The API is Node and Express. Spatial persistence is PostgreSQL and PostGIS, with routing and map services around it. The intelligence layer can use curated fallbacks or Claude. The important boundary is the human coordinator: no diagnosis and no autonomous transfer.”

## 12. Close and transition to demo — 30 seconds

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
- Do not expose API keys or patient data; the recommended demo uses curated local briefs and synthetic inventory.
- KEMSA baseline source: KEMSA national order-fill rate of 57%, as of mid-2025 (per the abstract).
- Abstract figures (memorise): n=64, 80% response · 56.3% · 82.8% · 57.8% · 89.1% · KEMSA 57% · SDG 12.
