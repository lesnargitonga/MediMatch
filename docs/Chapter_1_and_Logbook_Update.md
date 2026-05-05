# MediMatch — Chapter 1 (Introduction) and Weekly Logbook Update

Date: 2025-10-03

---

## Table of Contents
- 1. Introduction
- 2. System Overview
- 3. Requirements
- 4. Methodology Overview
- 5. Ethical, Privacy, and Security Considerations
- 6. Project Plan (MVP)
- 7. Current System Snapshot
- 8. How to Run (Local Development)
- 9. Chapter Structure (For Full Report)
- 10. Definitions and Acronyms
- 11. Styling and Branding (New)
- Weekly Logbook Update
   - Week 1 (Recap)
   - Week 2 (This Week)

## 1. Introduction

### 1.1 Background of the Study
Healthcare systems often face imbalances in the availability of medical supplies. During routine operations and crises alike, some facilities experience surpluses while others struggle with shortages. Traditional redistribution is slow and opaque, relying on manual outreach and fragmented communications. Digital platforms can help match supply to demand faster, transparently, and with auditable records.

MediMatch is a lightweight web application that connects donors, clinics, and communities to list available medical supplies or request what they need. The platform aims to reduce friction in discovery, streamline coordination, and provide a foundation for matching based on proximity and urgency.

### 1.2 Problem Statement
- There is no quick and transparent mechanism to connect those with surplus medical supplies to those in need.
- Manual processes (phone calls, emails, spreadsheets) are slow, error-prone, and difficult to scale.
- Lack of standardized data and geospatial context hinders efficient redistribution decisions.

### 1.3 Aim
To design and develop a simple, secure, and extensible platform that enables users to list, find, and match medical supplies efficiently, with a clear path to incorporate geospatial proximity and prioritization rules.

### 1.4 Objectives
- Implement user authentication (registration, login, session validation).
- Enable users to create and browse supply listings with quantity and location.
- Provide a matching capability prototype (API scaffolding) for future proximity-based matching.
- Establish a maintainable, testable codebase with automated tests and clear run instructions.
- Support multiple data backends for development and deployment: in-memory mock, local file-based persistence, and Postgres/PostGIS.

### 1.5 Research Questions (if applicable)
- How can a simple matching model (distance, quantity, urgency) improve redistribution speed and success rates?
- What data attributes are essential to automate or semi-automate matching decisions?
- How can privacy and ethics be safeguarded when handling sensitive locations and contact data?

### 1.6 Significance of the Project
- Practical impact: faster redistribution of supplies can improve care outcomes and reduce waste.
- Operational transparency: consistent data models and APIs enable auditing and reporting.
- Scalability: a modular architecture supports incremental feature growth (e.g., matching algorithms, notifications, analytics).

### 1.7 Scope and Delimitations
- In scope (MVP): registration, login, “me” endpoint, create/browse listings, JWT-based auth, simple location capture, and a baseline matching endpoint stub.
- Out of scope (MVP): payments, comprehensive logistics (pickup/delivery scheduling), user roles/permissions, advanced matching (multi-criteria optimization), and production-grade notifications.
- Delimitations: the MVP emphasizes usability and testability over exhaustive features; geospatial logic is kept minimal or stubbed pending iteration.

### 1.8 Constraints and Assumptions
- Assumes end-users can access the internet and use modern browsers.
- Development constraints: limited time and resources; simplicity favored over breadth.
- Data constraints: limited availability of standardized supply taxonomies and urgency data during MVP.

---

## 2. System Overview

![System Architecture](./assets/system-architecture.svg)

### 2.1 High-Level Architecture
- Client (React + Vite): SPA with routes for Home, Auth, and Dashboard (protected).
- Server (Express + TypeScript): REST API with JWT auth; adapters for three data backends.
- Data Backends:
  1) Mock (in-memory) for quick tests and examples.
  2) File DB (JSON persistence) for local development without Postgres.
  3) Postgres/PostGIS for production or advanced geospatial features.

Data flow summary:
1. Client authenticates via `/api/auth/login` to receive a JWT.
2. Client attaches `Authorization: Bearer <token>` to protected API calls.
3. Listings are created with title, quantity, and location; the server persists them according to configured backend.
4. Future matching will use proximity and basic heuristics to form matches.

### 2.2 Key Modules
- Auth: Register, Login, Me (JWT validation)
- Listings: Create and List endpoints; lat/lon captured and stored as WKT or geography
- Matches: Create match (scaffolded; extends in later phases)

### 2.3 Technologies & Tools
- Frontend: React 18, React Router, Vite, TypeScript
- Backend: Node.js, Express, TypeScript, JWT, bcrypt
- Data: Postgres + PostGIS (optional), file-based JSON DB, in-memory mock DB
- Testing: Vitest, Supertest
- Dev Experience: ts-node-dev, concurrently, Axios
- Containerization (optional for DB): Docker Compose

---

## 3. Requirements

### 3.1 Functional Requirements (MVP)
- Users can register and log in.
- Authenticated users can view their profile (`/api/auth/me`).
- Anyone can view public listings; authenticated users can create listings.
- Listings include title, optional description, quantity, and location (lat/lon).
- Basic API health endpoint.

### 3.2 Non-Functional Requirements
- Usability: simple, intuitive UI; quick feedback on forms and validation.
- Security: JWT for protected endpoints; password hashing using bcrypt.
- Reliability: server tests for key endpoints; deterministic mock data for tests.
- Maintainability: TypeScript throughout, modular routing/controllers.
- Portability: dev runs without Postgres via mock or file DB.
- Performance: suitable for MVP scale; no heavy operations on the critical path.

### 3.3 Stakeholders & Users
- Donors (individuals/organizations with surplus supplies)
- Requesters (clinics, NGOs, community groups)
- Operators/Moderators (future scope for validation and oversight)

### 3.4 User Stories (Samples)
- As a donor, I want to create a listing with my location so nearby requesters can find it.
- As a requester, I want to browse listings near me to reach out to donors quickly.
- As a user, I want to register and sign in so my posts are associated with my account.

---

## 4. Methodology Overview

### 4.1 Approach
- Iterative, feature-driven development in weekly sprints.
- Early emphasis on scaffolding, auth, and CRUD; follow with geospatial and matching.
- Automated tests for critical API paths; manual E2E validation via the client.

### 4.2 High-Level Process
1. Requirements clarification and MVP scoping.
2. Architecture and repository setup (monorepo, workspaces).
3. Backend endpoints and data adapters.
4. Frontend pages and protected routes.
5. Testing and validation.
6. Documentation and deployment guidance.

### 4.3 Testing Strategy
- Unit/Integration (server): Vitest + Supertest cover health, auth, list/create.
- Manual E2E: use client dev server to exercise login, list, and create flows.
- Future: add Playwright/Cypress for browser automation.

---

## 5. Ethical, Privacy, and Security Considerations
- Protect user credentials with salted password hashing (bcrypt).
- Secure token handling via JWT with expiration.
- Avoid exposing precise locations publicly without user consent; consider rounding coordinates or role-based visibility (future work).
- Minimal data collection: only store necessary attributes for matching and contact.
- Compliance awareness: prepare for data protection regulations depending on deployment region.

---

## 6. Project Plan (MVP)

### 6.1 Milestones
- Week 1–2: Repo setup; Auth endpoints and client forms; Listings list/create; file DB adapter.
- Week 3–4: Matching API + basic proximity logic; notifications prototype; UX polish.
- Week 5: Testing coverage, documentation, and demo preparation.

### 6.2 Risks and Mitigations
- Data accuracy (locations): validate inputs; offer geolocation capture.
- Security: enforce JWT on protected endpoints; validate request payloads.
- Scope creep: prioritize MVP core; backlog advanced features.
- Infrastructure: allow file DB locally; support Postgres for production.

---

## 7. Current System Snapshot

### 7.1 Implemented Endpoints
- GET `/api/health` – health check.
- POST `/api/auth/register` – create user; returns token + user.
- POST `/api/auth/login` – authenticate; returns token + user.
- GET `/api/auth/me` – current user (JWT required).
- GET `/api/listings` – list public listings.
- POST `/api/listings` – create listing (JWT required). Body supports either `{ lat, lon }` or `{ location: { lat, lon } }`.
- POST `/api/matches` – create match (JWT required, scaffold for future logic).

### 7.2 Data Models (MVP)
- User: `{ id, email, name?, password_hash (server only) }`
- Listing: `{ id, title, description?, quantity?, location_wkt? | location?, created_at? }`

### 7.3 Development Backends
- Mock: `USE_MOCK_DB=true` – in-memory seeded data; fast tests.
- File: `USE_FILE_DB=true` – JSON persistence in `server/data/filedb.json`.
- Postgres/PostGIS: defaults read from `.env`; used when neither mock nor file DB is enabled.

---

## 8. How to Run (Local Development)

### 8.1 Prerequisites
- Node.js LTS installed.

### 8.2 Quick Start (file DB, no Postgres required)
1. Install dependencies from repository root:
   - `npm install`
2. Start both client and server concurrently:
   - `npm run dev`
3. Open the app in your browser:
   - Client: http://localhost:5173
   - API: http://127.0.0.1:4000 (health at `/api/health`)

Note: A `.env` file exists in `server/.env` configured for `USE_FILE_DB=true` so data persists locally to JSON.

### 8.3 Optional: Postgres/PostGIS
1. Start the DB:
   - `cd db` then `docker compose up -d`
2. Update `server/.env` to disable `USE_FILE_DB` and configure DB_*.
3. Run `npm --prefix server run dev`.

### 8.4 Tests
- Run server tests (mock DB): `npm --prefix server run test:run`

---

## 9. Chapter Structure (For Full Report)
- Chapter 1: Introduction (this document)
- Chapter 2: Literature Review (related work; matching algorithms; geospatial systems)
- Chapter 3: Methodology (detailed design, data models, algorithms)
- Chapter 4: System Implementation (architecture, APIs, UI)
- Chapter 5: Testing and Evaluation (test plan, metrics, results)
- Chapter 6: Conclusions and Future Work

---

## 10. Definitions and Acronyms
- JWT: JSON Web Token
- WKT: Well-Known Text (geometry representation)
- MVP: Minimum Viable Product
- SPA: Single Page Application

## 11. Styling and Branding (New)

This section summarizes the current UI style and proposes improvements for Week 2 implementation.

### Current Style Summary
- Clean, modern look defined in `client/src/styles.css` with variables for colors, spacing, and radius.
- Components: buttons, cards, headings, muted text, tabs, and basic layout grid.
- Responsive tweaks at 920px breakpoint.

### Proposed Enhancements
1. Brand palette refinement
   - Keep primary (#0b5fff → #0a58ff gradient) and introduce a consistent accent usage for actions vs. info.
   - Add semantic colors for success/warning/danger with consistent contrast.
2. Typography
   - Ensure fallbacks are present (Inter → system stack is already in place).
   - Harmonize heading scales (H1/H2/H3) and adjust spacing rhythm.
3. Components
   - Add button states (hover/active/focus-visible) and subtle transitions.
   - Create reusable Alert component (.success, .warning, .danger variants).
   - Listing card: include small icon/avatar and clearer metadata layout.
4. Accessibility
   - Ensure color contrast AA for text on primary buttons and muted text on white.
   - Add :focus-visible outlines to interactive elements.
5. Visuals
   - Introduce simple SVGs/illustrations for Home and Dashboard empty states.
   - Add a small logo mark for navbar (SVG) to pair with the “MediMatch” wordmark.

### UI Flow Overview
![UI Flow](./assets/ui-flow.svg)

### Image Placeholders
- Home hero illustration: `docs/assets/home-hero.png` (to be added)
- Dashboard empty state: `docs/assets/empty-listings.png` (to be added)
- Logo mark: `docs/assets/logo.svg` (to be added)

If you’d like, I can generate these SVG/PNG assets and wire them into the client (Home header, Dashboard browse empty state, and favicon/logo).

---

# Weekly Logbook Update

Week of: 2025-09-29 to 2025-10-03 (Week 1 Recap)

## Summary
- Set up monorepo (client, server, shared) and bootstrapped TypeScript across the stack.
- Implemented Auth (register, login, me) and Listings (list, create) endpoints.
- Added file-based JSON DB for local persistence (no Postgres needed).
- Built React client pages (Home, Auth, Dashboard) with protected routes and form validation.
- Added lightweight tests (Vitest + Supertest) covering health, login, and listing creation (mock DB).

## Activities Completed
- Configured `server/.env` for `USE_FILE_DB=true` and JWT settings.
- Verified server compile and type-checking.
- Started server and client; validated flows end-to-end (register → login → create listing → browse).
- Wrote and ran API tests (4 passing).

## Deliverables Produced
- Running dev environment (server + client).
- Chapter 1 / logbook documentation (this file).
- Basic styles and UX for core flows.

## Issues/Blockers
- None critical; Postgres is optional and deferred for later once geospatial functions are needed.

## Next Week’s Plan
- Add Vite API proxy or environment-based `VITE_API_URL` for easier environment switching.
- Implement basic matching logic (proximity by haversine) and integrate UI feedback.
- Add more tests (edge cases, negative paths) and begin E2E automation.
- Discuss/define data privacy policy for location precision and access control.

## Time Log (example — adjust as appropriate)
- Repo setup and configuration: 4 hrs
- Backend endpoints and testing: 6 hrs
- Frontend pages and validation: 6 hrs
- Documentation: 2 hrs

## Resources/References
- Express, JWT, bcrypt docs
- PostGIS docs (for future work)
- React Router, Vite documentation

## Risk Review
- Scope creep risk managed by weekly milestones.
- Security risk mitigated by JWT + hashed passwords.
- Data privacy considerations identified for upcoming sprints.

## QA Snapshot
- Build: PASS (server TS compile)
- Unit/Integration tests: PASS (4/4)
- Manual smoke test: PASS (auth + listing flows)

---

## Requirements Coverage (MVP)
- Auth endpoints (register/login/me): Done
- Listings (list/create): Done
- Basic Postgres/PostGIS schema (scaffold available; active use deferred): Deferred
- Minimal React login + dashboard: Done
- Tests for critical API paths: Done

---

End of document.

---

# Weekly Logbook Update — Week 2

Week of: 2025-10-06 to 2025-10-10 (Planned + In-Progress)

## Objectives
- UX polish: refine styles, add branding assets, and improve responsiveness.
- Complete registration UX: field validations, password hints, and success toast.
- Implement Vite API proxy or `VITE_API_URL` for environment flexibility.
- Add basic matching logic prototype (distance-based; haversine) and endpoint.
- Expand test coverage: negative cases for auth and listings; snapshot tests for controllers.

## Detailed Plan
1. Styling and Branding
   - Add logo mark and favicon; update navbar to include small logo.
   - Implement alert components and hover/focus states on buttons and inputs.
   - Polish Dashboard cards (metadata hierarchy, icons).
2. Client Enhancements
   - Introduce `.env` variables (e.g., `VITE_API_URL`), update `API` service to use it.
   - Add form validation messages (min password length/complexity hints); disable submit until valid.
   - Add toast/snackbar component for success/error.
3. Server Enhancements
   - Add a simple `/api/matches/suggest` (GET) that returns the top N nearby listings for a given lat/lon.
   - Implement haversine utility and unit tests.
   - Input validation: add basic request schema checks (e.g., zod or manual guards).
4. Testing
   - Increase Vitest coverage for error paths (401/400 cases).
   - Add test for `createListing` validation (lat/lon bounds, missing title).

## In-Progress (as of 2025-10-03)
- Drafted architecture/UI diagrams and Chapter 1 documentation.
- Identified styling improvements and assets to create.
- Scoped env handling for client API base URL.

## Risks/Assumptions
- Timebox for visual asset creation; fallback to simple SVGs if needed.
- Keep matching prototype stateless and read-only for now to limit complexity.

## Deliverables (Week 2)
- Updated client styles, added logo and empty state illustrations.
- `VITE_API_URL` support and/or dev proxy config.
- `/api/matches/suggest` endpoint with tests.
- Updated docs: screenshots/diagrams and revised “How to Run” for env.

## QA Targets
- All existing tests remain passing; add 4–8 new tests (auth and listings negative paths, haversine unit tests).
- Manual UX walkthrough across mobile and desktop widths.
