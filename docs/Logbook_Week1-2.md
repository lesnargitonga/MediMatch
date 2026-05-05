# MediMatch — Weekly Logbook (Week 1–2)

Date: 2025-10-03
Author: Team MediMatch

---

## Overview
This logbook records the practical work completed so far on the MediMatch project (Weeks 1–2): monorepo setup, API/auth/listings scaffold, local development quality gates, and a polished Week 1–2 presentation-ready UI/UX.

---

## Week 1 (Recap)

### Objectives
- Establish codebase scaffolding for client, server, and shared types.
- Implement core auth and listings endpoints.
- Provide an initial React UI with basic flows (Auth, Dashboard, Home).

### Activities
- Monorepo initialized with workspaces: `server/`, `client/`, `shared/`.
- API routes created and wired:
  - `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
  - `GET /api/listings`, `POST /api/listings`
  - `POST /api/matches` (scaffold for future logic)
  - `GET /api/health`
- Data backends designed:
  - Mock (in-memory), File DB (JSON), and Postgres/PostGIS (configurable via `.env`).
- Server environment composed with TypeScript, `ts-node-dev`, `dotenv`, `jwt`, `bcrypt`.
- Client SPA (React + Vite + TS) with routes: Home, Auth, Dashboard (protected route).
- Shared TypeScript interfaces for `User` and `Listing` created.

### Validation
- TypeScript build checks: PASS (server).
- Tests (Vitest + Supertest) using mock DB: PASS (4/4).
- Manual smoke test of register/login/create listing flows: PASS.

### Outputs/Artifacts
- Running dev environment with API + client.
- Initial README instructions and baseline UI.

---

## Week 2 (Work Completed)

### Objectives
- Make the app presentation-ready (professional UI/UX for Home/Auth/Dashboard).
- Add media assets and branding.
- Ensure a one-command developer experience.

### Activities Completed
1. Server/Dev Experience
   - Created `server/.env` for local dev using File DB (`USE_FILE_DB=true`) — no Postgres required.
   - Confirmed typecheck/build ok; API starts at `http://127.0.0.1:4000`.
   - Verified tests (4/4, mock DB) and health endpoint.

2. One-command startup
   - Root `package.json` scripts:
     - `predev`: sync images from `docs/` to `client/public/images`.
     - `dev`: runs server and client concurrently.
     - `start`: alias for `dev`.
     - `up`: `npm install && npm run dev` (single command to install + start both).
   - Client dev script opens the browser automatically (`vite --open`).

3. Client/UI/UX polish
   - Header:
     - Brand logo + wordmark with isolated nav styling; cleaner layout.
   - Home (landing):
     - Background hero using a medicine photo (with a gradient overlay for readability).
     - Glass overlay card for hero copy (polished, readable, premium feel).
     - Single primary CTA in the hero (Get started or Go to Dashboard depending on auth state).
     - Feature cards with small SVG icons (List, Browse, Match, Secure) for visual clarity.
     - Bottom call-to-action banner (motivates next steps).
   - Auth page:
     - Illustration added; password hints and improved toggling.
     - Maintains consistent spacing and form feedback.
   - Dashboard:
     - Empty-state image for Browse tab with clear guidance.
   - Styling system updates (`client/src/styles.css`):
     - Button hover/focus-visible states and outline variant.
     - Alerts/badges; hero background variant; feature/CTA styles.
     - Responsive behavior for hero and layout on mid/smaller widths.

4. Assets integration
   - New icons: `icon-list.svg`, `icon-browse.svg`, `icon-match.svg`.
   - Photos from `docs/` integrated:
     - `docs/pexels-pixabay-139398.jpg` → hero background.
     - `docs/360_F_117504933_9F6FUj8oK1YeOCPLSOXYJC6Z49i4fmyf.jpg` → empty state (Dashboard Browse).
   - Asset sync script ensures images are available in `client/public/images/` every dev start.

5. Config improvements
   - API base URL now configurable via `VITE_API_URL` (fallback to `http://127.0.0.1:4000/api`).
   - Client `tsconfig.json` updated for Vite (`module: ESNext`, `types: ["vite/client"]`).
   - Favicon added and page title updated.

### Decisions
- Keep File DB locally for rapid iteration; switch to Postgres later for geospatial features.
- Favor a single primary CTA per section to reduce decision fatigue.
- Use gradient overlays for background images to maintain readability and consistency with the brand’s blue tones.

### Issues/Notes
- `npm audit` reports 4 moderate vulnerabilities in transitive deps: deferred (non-blocking for dev).
- Node `util._extend` deprecation warning from a dependency: benign; monitor and update later.

### Validation
- Client dev server: PASS (auto-opens, pages load).
- Server health: PASS.
- Tests (server): PASS (4/4) with mock DB.
- Manual UI walkthrough across widths: PASS (hero stacks cleanly; CTAs clear; forms usable).

### Screenshots/References (suggested)
- Home hero (background + glass overlay): `client/public/images/pexels-pixabay-139398.jpg`
- Dashboard empty state: `client/public/images/medicine-supplies.jpg`
- Icons: `client/public/images/icon-*.svg`

### Attributions (images)
- Photo: Pixabay via Pexels (file: `pexels-pixabay-139398.jpg`).
- Photo: Stock image (file: `360_F_117504933_9F6FUj8oK1YeOCPLSOXYJC6Z49i4fmyf.jpg`).

---

## Next Steps (Week 3 Preview)
- Matching prototype: add `/api/matches/suggest` with simple haversine distance ranking (mock/file DB initially).
- Input validation: lightweight schema checks (e.g., zod or manual guards) for auth/listings endpoints.
- Toast/snackbar component for success/error feedback (Auth and Create Listing).
- Optional: Vite dev proxy for simplified local API routing.
- Expand tests: error paths for auth/listings; unit tests for distance calc; basic snapshot for controllers.

---

## Time Log (approx.)
- Repo and server setup, env, scripts: 3–4 hrs
- Client structure and auth/dashboard scaffolding: 4–5 hrs
- UI/UX polish (hero, icons, CTA, styles, assets): 4–5 hrs
- Tests and validation: 1–2 hrs
- Documentation (Chapter 1 + logbooks): 1–2 hrs

---

## QA Snapshot
- Build/Typecheck: PASS (server + client)
- Unit/Integration: PASS (4/4)
- Manual smoke: PASS (register/login/create/browse)
- Lint: n/a (ESLint not configured yet; recommended for Week 3)

---

## Quick Run (for future reference)
From the repository root:

```powershell
npm run up
```

This installs dependencies and starts both the server and the client. The browser opens automatically at `http://localhost:5173/`.

---

End of logbook.
