# Project Logbook — MediMatch

Prepared on: 2025-12-12

- Student name: ________________________________
- Student ID: ________________________________
- Programme/Course: ________________________________
- Supervisor: ________________________________
- Project title: MediMatch — Medical Supplies Matching Platform
- Period covered: Weeks 1–2 filled; Week 3+ template included

Supervisor Acknowledgement (cover):

- Name: ________________________________
- Signature: ________________________________  Date: _____________

---

## Week 1
- Dates: 2025-09-29 → 2025-10-03

Quick fill (optional):

| Field | Entry |
| --- | --- |
| Goals (top 1–3) | _______________________________________________ |
| Evidence/Links | _______________________________________________ |
| Hours | ______ |
| Notes | _______________________________________________ |
| Supervisor initials | ______ |

- Objectives:
  - Establish codebase scaffolding for client, server, and shared types.
  - Implement core auth and listings endpoints.
  - Provide an initial React UI with basic flows (Auth, Dashboard, Home).
- Activities:
  - Initialized monorepo with workspaces: `server/`, `client/`, `shared/`.
  - Implemented API routes: auth (register/login/me), listings (list/create), matches (scaffold), health.
  - Set up data backends: mock (in-memory), file DB (JSON), Postgres/PostGIS (configurable).
  - Server: TypeScript, `ts-node-dev`, `dotenv`, `jwt`, `bcrypt`.
  - Client SPA (React + Vite + TS) with Home, Auth, Dashboard; protected routes.
  - Shared TypeScript interfaces for `User` and `Listing`.
- Deliverables/Evidence:
  - Running dev environment (server + client), README instructions, baseline UI.
- Validation/Testing:
  - TypeScript build checks PASS (server).
  - Tests PASS (4/4) with mock DB; manual smoke tests for register/login/create listing.
- Time spent (hrs): 8–10 (setup, endpoints, UI, tests).
- Challenges/Risks:
  - None critical; Postgres optional for MVP.
- Next steps:
  - Polish UI/UX; assets/branding; one-command developer experience.
  
Supervisor comments (Week 1):

- Comments: ________________________________________________________________
- Signature: ________________________________  Date: _____________
- Student signature: ________________________________  Date: _____________

---

<div style="page-break-before: always;"></div>

## Week 2
- Dates: 2025-10-06 → 2025-10-10

Quick fill (optional):

| Field | Entry |
| --- | --- |
| Goals (top 1–3) | _______________________________________________ |
| Evidence/Links | _______________________________________________ |
| Hours | ______ |
| Notes | _______________________________________________ |
| Supervisor initials | ______ |

- Objectives:
  - Make the app presentation-ready (polished UI/UX for Home/Auth/Dashboard).
  - Add media assets and branding.
  - Ensure a one-command developer experience.
- Activities:
  - Server/dev experience: `USE_FILE_DB=true` for local, API at `http://127.0.0.1:4000`.
  - One-command startup via root scripts: `predev` (sync assets), `dev` (concurrently run), `up`.
  - Client/UI/UX: hero background with gradient, glass overlay card, CTA; feature cards; auth form polish; dashboard empty state; styles in `client/src/styles.css`.
  - Assets integrated (icons and photos) via sync script to `client/public/images`.
  - Config: `VITE_API_URL` support; updated `tsconfig` and favicon/title.
- Deliverables/Evidence:
  - Polished Home/Auth/Dashboard UI, assets in repo, start scripts.
- Validation/Testing:
  - Client dev server PASS; server health PASS; tests PASS (4/4); manual UX walkthrough PASS.
- Time spent (hrs): 10–12 (UX polish, assets, scripts, validation).
- Challenges/Risks:
  - Minor `npm audit` items; a benign deprecation warning; deferred.
- Next steps:
  - Prototype matching `/api/matches/suggest`; add input validation; toasts; expand tests.
  
Supervisor comments (Week 2):

- Comments: ________________________________________________________________
- Signature: ________________________________  Date: _____________
- Student signature: ________________________________  Date: _____________

---

<div style="page-break-before: always;"></div>

## Week 3 (Template)
 - Dates: 2025-10-13 → 2025-10-17

 Quick fill (optional):

 | Field | Entry |
 | --- | --- |
 | Goals (top 1–3) | Matching prototype; client Suggested tab; input validation |
 | Evidence/Links | `/api/matches/suggest`; client Dashboard Suggested tab |
 | Hours | 10–12 |
 | Notes | Haversine fallback for non-PostGIS; simple filters (category/radius) |
 | Supervisor initials | ______ |

 - Objectives:
   - Implement matching prototype using haversine distance and simple weighting.
   - Add `/api/matches/suggest` endpoint and unit tests.
   - Add client “Suggested” tab with basic filters and toasts.
 - Activities:
   - Server: added matching utility; route/controller for suggest; manual guards for query params.
   - Client: new Suggested tab; radius/category filters; lightweight result cards; success/error toasts.
   - Updated API service to accept `VITE_API_URL` base and new endpoint.
 - Deliverables/Evidence:
   - Endpoint: GET `/api/matches/suggest?lat=..&lon=..&radiusKm=..&limit=..`.
   - Tests: vitest coverage for input guards and ranking order.
   - UI: Suggested tab with filter controls and results list.
 - Validation/Testing:
   - Unit tests PASS; manual checks with seeded sample data; edge cases for missing/invalid lat/lon handled.
 - Time spent (hrs): 10–12
 - Challenges/Risks:
   - Geolocation availability and accuracy; mitigated with manual lat/lon inputs.
 - Next steps:
   - Integrate PostGIS for accurate distance and indexing; prepare migrations.

Supervisor comments (Week 3):

- Comments: ________________________________________________________________
- Signature: ________________________________  Date: _____________
- Student signature: ________________________________  Date: _____________

---

<div style="page-break-before: always;"></div>

## Week 4 (Template)
 - Dates: 2025-10-20 → 2025-10-24

 Quick fill (optional):

 | Field | Entry |
 | --- | --- |
 | Goals (top 1–3) | Postgres/PostGIS setup; migrations; distance via ST_Distance |
 | Evidence/Links | `db/docker-compose.yml`; `server/src/tools/migrate.ts` |
 | Hours | 8–10 |
 | Notes | Fallback to file DB maintained for dev |
 | Supervisor initials | ______ |

 - Objectives:
   - Provision Postgres + PostGIS via Docker and run schema migrations.
   - Add spatial index and geography(Point,4326) column for listings.
   - Update matching to use `ST_Distance` when PostGIS is available.
 - Activities:
   - Authored idempotent migration script; enabled PostGIS extension; created GiST index.
   - Wired server config to detect PostGIS and switch distance strategy.
   - Updated docs/runbook; added Adminer note for DB inspection.
 - Deliverables/Evidence:
   - Migrations (`server/src/tools/migrate.ts`); PostGIS init (`db/init/postgis.sql`).
   - Verified spatial query path and fallback path via logs/tests.
 - Validation/Testing:
   - Ran `docker compose up -d` for DB; executed migrations; manual query checks for `ST_Distance`.
 - Time spent (hrs): 8–10
 - Challenges/Risks:
   - Windows Docker resource limits; tuned WSL integration and memory.
 - Next steps:
   - Seed data for realistic spatial distribution; continue performance checks.

Supervisor comments (Week 4):

- Comments: ________________________________________________________________
- Signature: ________________________________  Date: _____________
- Student signature: ________________________________  Date: _____________

---

<div style="page-break-before: always;"></div>

## Week 5 (Template)
 - Dates: 2025-10-27 → 2025-10-31

 Quick fill (optional):

 | Field | Entry |
 | --- | --- |
 | Goals (top 1–3) | Messaging (conversations/messages); Chat modal; REST flows |
 | Evidence/Links | `server/src/controllers/messages.controller.ts`; ChatModal UI |
 | Hours | 9–11 |
 | Notes | REST polling for simplicity; sockets deferred |
 | Supervisor initials | ______ |

 - Objectives:
   - Implement conversations/messages models and REST endpoints.
   - Build client Chat modal integrated with listings/users.
 - Activities:
   - Server: routes/controllers for conversations list/create and message send/list; basic guards.
   - Client: ChatModal wired from listing detail; unread badge concept stubbed.
   - Tests: integration tests for message creation/listing.
 - Deliverables/Evidence:
   - Endpoints under `/api/messages` and `/api/chat/*` (per routing structure).
   - UI demo showing send/receive via polling.
 - Validation/Testing:
   - Supertest flows PASS; manual two-user conversation verified.
 - Time spent (hrs): 9–11
 - Challenges/Risks:
   - Real-time complexity; decision to keep polling for MVP.
 - Next steps:
   - Add minimal unread counts; consider WebSocket upgrade later.

Supervisor comments (Week 5):

- Comments: ________________________________________________________________
- Signature: ________________________________  Date: _____________
- Student signature: ________________________________  Date: _____________

---

<div style="page-break-before: always;"></div>

## Week 6 (Template)
 - Dates: 2025-11-03 → 2025-11-07

 Quick fill (optional):

 | Field | Entry |
 | --- | --- |
 | Goals (top 1–3) | Ratings & reputation; Notifications plumbing |
 | Evidence/Links | `ratings.controller.ts`; `notifications.controller.ts`; RatingModal |
 | Hours | 8–10 |
 | Notes | Aggregates recalculated on write; simple notification types |
 | Supervisor initials | ______ |

 - Objectives:
   - Allow users to rate others; compute basic reputation aggregates.
   - Implement in-app notifications and listing of unread items.
 - Activities:
   - Server: ratings create/list; uniqueness/limits; aggregate updates.
   - Server: notifications model + list/mark-as-read endpoints.
   - Client: RatingModal and badge indicators for notifications.
 - Deliverables/Evidence:
   - Endpoints for ratings and notifications; UI integration points.
 - Validation/Testing:
   - Unit tests for aggregates; manual test of rating flow and unread counters.
 - Time spent (hrs): 8–10
 - Challenges/Risks:
   - Preventing rating spam; enforced one-per-relationship guard.
 - Next steps:
   - Expand notification types (match suggestions, new messages).

Supervisor comments (Week 6):

- Comments: ________________________________________________________________
- Signature: ________________________________  Date: _____________
- Student signature: ________________________________  Date: _____________

---

<div style="page-break-before: always;"></div>

## Week 7 (Template)
 - Dates: 2025-11-10 → 2025-11-14

 Quick fill (optional):

 | Field | Entry |
 | --- | --- |
 | Goals (top 1–3) | Admin dashboard; user verification; listing moderation |
 | Evidence/Links | `server/src/routes/admin.routes.ts`; `pages/Admin.tsx` |
 | Hours | 9–11 |
 | Notes | Guarded by `authMiddleware` + `requireAdmin` |
 | Supervisor initials | ______ |

 - Objectives:
   - Provide admin endpoints for stats, users, and listings moderation.
   - Add verification and disable flags management.
 - Activities:
   - Implemented admin routes (stats, users list/update, listings list/hide/delete).
   - Added safeguards: cannot demote/disable self; cannot remove last active admin; verify org fields present.
   - Client admin page to view and act on users/listings.
 - Deliverables/Evidence:
   - Admin endpoints including `/api/admin/stats`, `/api/admin/users`, `/api/admin/listings`, and reports.
 - Validation/Testing:
   - Manual admin flows; unit tests for protected route guards.
 - Time spent (hrs): 9–11
 - Challenges/Risks:
   - Avoiding lockout and ensuring last-admin protection.
 - Next steps:
   - CSV/JSON export for admins; refine UI batch actions.

Supervisor comments (Week 7):

- Comments: ________________________________________________________________
- Signature: ________________________________  Date: _____________
- Student signature: ________________________________  Date: _____________

---

<div style="page-break-before: always;"></div>

## Week 8 (Template)
 - Dates: 2025-11-17 → 2025-11-21

 Quick fill (optional):

 | Field | Entry |
 | --- | --- |
 | Goals (top 1–3) | Security hardening; JWT cookies; CORS/Helmet/rate limit |
 | Evidence/Links | security middleware config; auth cookie settings |
 | Hours | 8–9 |
 | Notes | Cache-control no-store on API; input validation tightened |
 | Supervisor initials | ______ |

 - Objectives:
   - Harden security: Helmet, CORS allowlist, rate limiting, stricter validation.
   - Move JWT to HttpOnly cookies for improved handling.
 - Activities:
   - Added Helmet/CORS/rate-limit; adjusted cookie flags; refined request validation.
   - Updated docs for environment variables and origins.
 - Deliverables/Evidence:
   - Middleware configuration; updated auth flows and docs.
 - Validation/Testing:
   - Manual verification of cookie flags; negative-path tests for validation.
 - Time spent (hrs): 8–9
 - Challenges/Risks:
   - Balancing developer convenience with stricter CORS/rate limits.
 - Next steps:
   - Pen-test checklist and dependency updates.

Supervisor comments (Week 8):

- Comments: ________________________________________________________________
- Signature: ________________________________  Date: _____________
- Student signature: ________________________________  Date: _____________

---

<div style="page-break-before: always;"></div>

## Week 9 (Template)
 - Dates: 2025-11-24 → 2025-11-28

 Quick fill (optional):

 | Field | Entry |
 | --- | --- |
 | Goals (top 1–3) | Observability endpoints; admin reports CSV/JSON |
 | Evidence/Links | `/api/admin/reports/summary(.csv)`; `/api/health|readiness|stats` |
 | Hours | 7–9 |
 | Notes | Category breakdown and 7/30-day metrics implemented |
 | Supervisor initials | ______ |

 - Objectives:
   - Add health/readiness/stats endpoints and admin reporting (JSON/CSV).
 - Activities:
   - Implemented summary queries (users/listings/matches/messages, last 7/30 days, categories).
   - CSV generator with safe value sanitization; content-disposition headers.
 - Deliverables/Evidence:
   - Endpoints: `/api/admin/reports/summary` and `/api/admin/reports/summary.csv`.
   - Example CSV exported for review.
 - Validation/Testing:
   - Manual verification of counts vs database; CSV downloaded and opened successfully.
 - Time spent (hrs): 7–9
 - Challenges/Risks:
   - Query performance on large datasets; mitigated with indexes and simple aggregations.
 - Next steps:
   - Pagination for large admin lists; scheduled exports (cron) later.

Supervisor comments (Week 9):

- Comments: ________________________________________________________________
- Signature: ________________________________  Date: _____________
- Student signature: ________________________________  Date: _____________

---

<div style="page-break-before: always;"></div>

## Week 10 (Template)
 - Dates: 2025-12-01 → 2025-12-05

 Quick fill (optional):

 | Field | Entry |
 | --- | --- |
 | Goals (top 1–3) | QA hardening; docs finalization; demo prep |
 | Evidence/Links | Chapter 7 updates; logbook PDF; runbook scripts |
 | Hours | 8–10 |
 | Notes | Focus on polish, tests, and submission assets |
 | Supervisor initials | ______ |

 - Objectives:
   - Stabilize MVP, improve tests and documentation, and prepare demo.
 - Activities:
   - Expanded negative-path tests; refreshed screenshots; updated runbook and quick-start.
   - Image optimization and minor UI polish; resolved small bugs.
 - Deliverables/Evidence:
   - Updated docs (Chapter 7, logbook); final build instructions; demo outline.
 - Validation/Testing:
   - All server tests PASS; manual E2E walkthrough PASS.
 - Time spent (hrs): 8–10
 - Challenges/Risks:
   - Timeboxing scope; deferred advanced features to future work.
 - Next steps:
   - Post-submission retrospective and backlog grooming.

Supervisor comments (Week 10):

- Comments: ________________________________________________________________
- Signature: ________________________________  Date: _____________
- Student signature: ________________________________  Date: _____________

---

## Appendix (Artifacts/References)
- `docs/Logbook_Week1-2.md` (source notes for Weeks 1–2)
- `docs/Chapter_1_and_Logbook_Update.md` (intro, plan, weekly notes)
- `docs/CHAPTER_7_IMPLEMENTATION.md` (implementation details)
- Quick run (file DB): `npm run up`
- Postgres dev: `cd db; docker compose up -d`

