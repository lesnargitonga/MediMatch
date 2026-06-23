# MediMatch — National Medical-Supply Redistribution Command

**MediMatch** is a geospatial intelligence platform that moves surplus medical supplies to the facilities that need them most. Well-resourced referral hospitals hold stock that expires while county hospitals in arid and marginalised regions run out — MediMatch makes that gap visible and routes supply across it, ranked by distance, urgency, verification and product fit.

> Research-grounded: *"Leveraging Geospatial Technology for Equitable Medical Supply Redistribution: A Case Study of Nairobi County"* — Lesnar Gitonga, USIU-Africa. Built TypeScript end-to-end.

---

## What's in the box

### 🛰 National command floor (`/`) — the showcase
- A **real, rotatable 3D map of Kenya** (MapLibre + CARTO dark basemap) with **Kenya highlighted**, every facility plotted, and **road-routed supply flows** (live OSRM geometry).
- A **cinematic globe intro**: a hand flicks the globe, it lands on East Africa, a finger taps Kenya, and it hands off to the live map.
- **Auto-cycling AI situation briefs** (one per ~15s) that type in live — curated per supply type so no two read alike.
- A **demand heatmap** toggle showing where shortfall concentrates.
- **Clickable facilities** — popups with role, county, surplus/shortfall and connected transfers, at both national and Nairobi level.
- A **collapsible impact panel** (facilities served, units routed, coverage, hubs engaged, routing mode) so nothing blocks the map.

### 🔬 Nairobi research-base deep-dive
- Click the **Nairobi pin** → a street-scale close-up of ~24 city facilities on the real Nairobi map, with intra-city flows.
- An **ops console**: filter the network by supply category (equipment / medication / supplies) and urgency, with live stat pills and a legend.
- The **field-study findings** surfaced inline: 64 healthcare professionals surveyed (80% response), 56.3% face weekly/monthly stockouts, 82.8% call manual redistribution ineffective or slow, 57.8% report wastage of valid supplies, 89.1% willing to pilot — alongside KEMSA's 57% national order-fill rate.

### 📈 Impact projection simulator
Extrapolates the engine's live throughput against **real, citable baselines** over **1 month / 6 months / 1 year**: units redistributed, patient courses enabled, stockouts averted, units saved from expiry, demand coverage trajectory (**57% → 85%**), value recovered, equity reach — with a status-quo→MediMatch comparison and assumptions on screen.

### ✦ MediMatch Copilot
A conversational assistant that answers from the **live coordination state** — *"which facilities need urgent approval"*, *"what's in transit"*, *"shortfalls in Mandera"*, *"who has surplus oxygen"*, *"summarise the situation"* — with suggestion chips and a typing reveal.

### 🏥 The working platform
Landing page, browsable **listings**, a coordinator **dashboard** (create/browse/match/message/account/admin), **split-screen auth**, ratings, favorites, notifications — all in one cohesive warm "Savannah" identity.

---

## AI configuration (briefs & Copilot)

The AI briefs and Copilot ship **hardcoded** — curated, varied, grounded in the live data — so they work with **no API key, never hallucinate, and need no network**. This is the recommended mode for a live presentation.

To upgrade the **briefing card** to genuine Claude-written analysis, set an Anthropic key on the server:

```env
# server/.env
ANTHROPIC_API_KEY=sk-ant-...
```

The `/api/redistribution/brief` endpoint then calls **Claude `claude-opus-4-8`**; without a key it returns the intelligent local fallback. (The front-end currently renders the curated briefs by default for presentation reliability.)

---

## Tech stack

**Client** — React 18, TypeScript, Vite, React Router v6, **MapLibre GL** (3D vector maps), **three.js / react-three-fiber** (globe + intro), Axios.

**Server** — Node.js, Express 4, TypeScript, Zod, bcrypt, JWT, `@anthropic-ai/sdk`.

**Data** — PostgreSQL 15 + PostGIS 3 in production; an **in-memory mock DB** (real Kenyan facilities, ~65 nodes) for zero-setup demos. Road routing via **OSRM**; geocoding via **Nominatim**; basemap via **CARTO**.

---

## ▶ Step-by-step startup (mock DB — zero setup)

This is the mode to run for the demo. No database required.

**1. Prerequisites** — Node.js 18+ and npm. Check:
```bash
node -v        # should print v18 or higher
```

**2. Get the code & install** (from the repo root):
```bash
git clone git@github.com:lesnargitonga/MediMatch.git
cd MediMatch
npm install            # installs root, client and server deps
```

**3. Create the server environment file** at `server/.env`:
```env
PORT=4000
USE_MOCK_DB=true
JWT_SECRET=dev_secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
DISABLE_RATE_LIMIT=true
# Optional — enables live Claude briefs:
# ANTHROPIC_API_KEY=sk-ant-...
```

**4. Start both servers** (one command, from the repo root):
```bash
npm run dev
```
This launches the API on **http://localhost:4000** and the client on **http://localhost:5173**.

> Prefer separate terminals? `npm run dev --prefix server` and `npm run dev --prefix client`.

**5. Open the app:** http://localhost:5173 — the globe intro plays (~7s), then the national command map loads.

### Stopping / restarting
- Stop: `Ctrl-C` in the terminal running `npm run dev`.
- If a server gets wedged, free the ports and restart:
  ```bash
  pkill -f ts-node-dev ; pkill -f vite        # stop stragglers
  npm run dev                                  # start fresh
  ```

---

## 🎤 Presentation playbook (online demo from your PC)

You're presenting online from your own machine — the safest setup. A 3-minute pre-flight makes it bulletproof:

**Before you go live**
1. **Restart fresh:** `pkill -f ts-node-dev ; pkill -f vite` then `npm run dev`. Wait for both "ready" lines.
2. **Warm the tab:** open http://localhost:5173, let the globe intro play through once, click around the map so tiles cache. Present from this warmed tab.
3. **Internet check:** if your screen-share is streaming, your connection is already carrying the map tiles + routing — you're covered.
4. **Optional insurance:** record a clean 3-minute run; if the network blips on stage, play the clip.

**What to show** (all on the command floor, error-free)
- The globe intro → national map (Kenya highlighted, real road flows).
- Toggle the **Demand heatmap** (top-right controls).
- Click a **facility** → popup.
- Open **Nairobi research base** → filters, the 64-professional study stats.
- **Project impact over time** → 1 month vs 1 year.
- **Ask Copilot** → "which facilities need urgent approval".
- The landing page (`/about`) and listings for the platform story.

**Demo accounts** (mock DB) — for the coordinator dashboard:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@medimatch.test` | `Admin1234` |
| **User** | `demo@medimatch.test` | `Demo1234` |
| **Supplier** | `supplier@medimatch.test` | `Supply1234` |

Register a new admin via the UI with admin code **`ADMIN2025`**.

---

## Option B — Postgres + PostGIS (production-like)

```bash
docker compose -f docker-compose.postgres.yml up -d
```
Then in `server/.env` swap `USE_MOCK_DB=true` for:
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/medimatch
```
Apply the schema once (`db/init/postgis.sql`) and `npm run dev`.

---

## Project structure

```
MediMatch/
├── client/src/
│   ├── pages/
│   │   ├── SavannahCommand.tsx   # national command floor (the showcase)
│   │   ├── GlobeIntro.tsx        # 3D globe cinematic intro
│   │   ├── NationalMap.tsx       # real Kenya MapLibre map + heatmap + popups
│   │   ├── NairobiMap.tsx        # Nairobi street-scale close-up
│   │   ├── SimPanel.tsx          # impact projection simulator
│   │   ├── Copilot.tsx           # conversational assistant
│   │   ├── Home.tsx              # landing (/about)
│   │   ├── Listings.tsx · Dashboard.tsx · Login.tsx · Auth.tsx
│   │   └── data/                 # bundled land + Kenya outlines
│   ├── components/ · context/ · services/
│   └── styles.css                # the single design system
├── server/src/
│   ├── routes/ controllers/ middleware/
│   ├── controllers/redistribution.controller.ts  # matching engine + OSRM routing
│   ├── controllers/brief.controller.ts            # Claude AI briefs (+ fallback)
│   └── mock/db.ts                # real Kenyan facilities (~65 nodes)
└── docs/                         # logbook, chapters, field-study documentation
```

---

## Key API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/redistribution/plan?roads=1` | Facility nodes + road-routed supply flows + impact metrics |
| POST | `/api/redistribution/brief` | Claude situation brief for a transfer (fallback if no key) |
| POST | `/api/auth/login` · `/register` | Auth (JWT httpOnly cookie) |
| GET | `/api/listings` · `/api/listings/:id` | Listings |
| GET | `/api/admin/stats` · `/users` | Admin (mock-safe) |

---

## Environment variables

| Variable | Description |
|---|---|
| `PORT` | API port (default `4000`) |
| `USE_MOCK_DB=true` | In-memory data — **no DB needed** (demo mode) |
| `JWT_SECRET` | Token signing secret (required in production) |
| `CORS_ORIGIN` | Allowed client origin |
| `ANTHROPIC_API_KEY` | Optional — enables live Claude AI briefs |
| `DATABASE_URL` | Postgres connection (when not using mock) |
| `DISABLE_RATE_LIMIT=true` | Dev convenience |

---

## Notes & honest caveats

- **Facility names and geocodes are real and verifiable**; KEMSA and field-study figures are published. **Inventory quantities are demonstration data** pending live integration — labelled as such in the UI.
- The maps require internet (CARTO tiles + OSRM routing). For an online demo this rides the same connection as your screen-share.
- Built for Kenya as a case study; the engine and UI are county- and country-agnostic by design.
