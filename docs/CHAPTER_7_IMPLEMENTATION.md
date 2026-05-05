# CHAPTER 7: IMPLEMENTATION (Corrected to Actual System)

## 7.1 System Implementation

MediMatch was implemented as a full-stack web platform using a TypeScript/Node.js backend, a React frontend, and PostgreSQL with PostGIS for geospatial features. Work followed an iterative, research-driven approach: core capabilities (authentication, listings, matching, messaging) were built incrementally and validated against the system goals derived from Chapters 16.

Implementation highlights:
- **Environment setup**: Dockerized PostgreSQL + PostGIS; Node/Express API; Vite-based React client; shared TypeScript types.
- **Migrations**: Idempotent script ensures PostGIS extension, adds listings.location geography(Point,4326), spatial index (GiST), and other columns/indexes used by features.
- **Matching engine**: Multi-factor, weighted scoring implemented in the API (/api/matches/suggest). It dynamically detects PostGIS availability and falls back to a non-spatial query when unavailable while preserving response shape.
- **Frontend integration**: Dashboard includes a Suggested tab with category/radius filters, optional geolocation, score breakdown UI, and actions (map, chat, rate, save).
- **Security hardening**: Helmet, CORS allowlist with credentials, rate limiting, JWT cookies (HttpOnly), Zod request validation, and no-store Cache-Control on API routes to support polling endpoints (e.g., unread counts).
- **Observability**: Health (/api/health), readiness (/api/readiness), and stats (/api/stats) endpoints for quick operational checks.

This implementation reflects production-minded practices while remaining lightweight for a prototype.

---

## 7.2 Technologies Used

### 7.2.1 Hardware Platform
- **Development machine**: Windows 10/11 PC (Intel Core i7 ~2.5GHz, 816GB RAM, SSD). The stack runs comfortably on standard institutional hardware and typical student laptops.

### 7.2.2 Programming Languages
- **TypeScript 5.x**: Primary language for backend (Node/Express) and frontend (React), plus shared types.
- **SQL (PostgreSQL + PostGIS)**: Schema, constraints, indexes, and geospatial queries.
- **JavaScript (ES2020+)**: Runtime target for compiled TypeScript and browser-side code.
- **HTML/CSS**: Frontend UI layout and styling.

### 7.2.3 Development Tools and Frameworks
CHAPTER SEVEN
IMPLEMENTATION (PROTOTYPE FRAMEWORK)

7.1 System Implementation

This chapter describes the actual implementation of the MediMatch prototype. The production codebase uses a modern full‑stack TypeScript stack (Node.js + Express on the backend, React + Vite on the frontend) and PostgreSQL with PostGIS for spatial features. Development followed an iterative, research‑driven approach: the design and research outcomes shaped priorities (matching, geolocation, usability) and features were implemented incrementally and validated against sample data and manual testing.

Key activities during implementation:
- Local development environment setup with Docker (Postgres+PostGIS) and Node/Vite development servers.
- Backend API development (Express, TypeScript) with controllers for authentication, listings, matches, messages, ratings, notifications, and admin functions.
- Database migrations and schema evolution to add `location geography(Point,4326)`, GiST spatial index, and other production-oriented constraints.
- Matching engine implementation: multi-factor weighted scoring exposed via `/api/matches/suggest`, with PostGIS-aware distance calculations and a safe fallback when PostGIS functions are unavailable.
- Frontend implementation: React dashboard with tabs for Create/Browse/Suggested listings, interactive maps (Leaflet), chat modal, and rating flows.
- Security and validation: JWT authentication (HttpOnly cookies), bcrypt password hashing, Zod request validation, Helmet, CORS allowlist, and rate limiting.

7.2 Technologies Used

7.2.1 Hardware Platform

- Development machine used during the project: standard student/institution laptop (Intel Core i5/i7, 8–16 GB RAM, SSD). The prototype is intentionally lightweight and runs on modest hardware.

7.2.2 Programming Languages

- TypeScript (backend and frontend): main implementation language for type safety and shared types.
- SQL (PostgreSQL + PostGIS): persistent storage, constraints, and geospatial queries.
- JavaScript/HTML/CSS: browser runtime and UI markup/styling.

7.2.3 Development Tools and Frameworks

- Backend:
  - Express (HTTP server)
  - pg (Postgres client)
  - zod (input validation)
  - jsonwebtoken, bcrypt (auth and password hashing)
  - helmet, express-rate-limit, cors (security middleware)
- Frontend:
  - React + Vite (SPA)
  - react-router-dom (routing)
  - axios (HTTP client)
  - leaflet + react-leaflet (maps)
  - react-hot-toast, nprogress (UX)
- Tooling:
  - TypeScript, ts-node-dev, vitest (testing), Docker & Docker Compose
  - Adminer included in `db/docker-compose.yml` for quick DB access

7.2.4 External Services

- Nominatim (OpenStreetMap) used for address -> coordinate lookups on the client.
- No Google Forms/Sheets are used in the implemented prototype; data is persisted in PostgreSQL.

7.3 Features of the Prototype

Implemented (core):
- Authentication & Authorization: register/login/logout, JWT cookies, role flags (user/admin).
- Listings Management: CRUD listings with category, quantity, urgency flag, optional location stored as PostGIS geography.
- Matching Suggestions: `/api/matches/suggest` — weighted scoring combining distance, urgency, reputation, recency, verification, category match, and quantity; PostGIS-aware with a safe fallback.
- Chat/Messaging: conversation and message models, endpoints to list/create conversations and messages.
- Ratings & Reputation: users can rate others; reputation aggregates are maintained.
- Notifications: in-app notifications, unread counts, mark-as-read endpoints.
- Favorites: save/unsave listings per user.
- Admin Tools: admin routes to view stats, list users, manage user roles/verification/disable, and moderate listings.
- Mapping & Geocoding: Leaflet map modal and Nominatim geocoding for user-entered locations.

Planned / Next priorities:
- Stricter password rules and account security features (refresh-token rotation, MFA), central error-handling middleware, paginated messages, observability metrics (Prometheus), and role-based access refinements.

7.4 Database Management System

- Engine: PostgreSQL with PostGIS extension (geography types and spatial functions).
- Migrations: implemented in `server/src/tools/migrate.ts` — creates PostGIS extension (if permitted), adds `listings.location geography(Point,4326)`, GiST index, and other necessary columns and constraints.
- Key entities (high level):
  - `users` (auth info, org metadata, verification, disabled flag)
  - `listings` (owner_id, title, description, category, quantity, is_urgent, is_hidden, location, created_at)
  - `conversations` and `messages` (chat)
  - `ratings` (rating, rater_id, target_id)
  - `notifications` (recipient_id, type, payload, read_state)
- Indexes & constraints: GiST on `listings.location`, B-tree indexes on filter columns (category, is_urgent), unique constraints (e.g., conversation uniqueness), and rating constraints to avoid duplicates.
- Spatial behavior: when PostGIS is available the server uses `ST_Distance` and `ST_SetSRID` for accurate distance-based scoring; if unavailable the API returns results without distance but keeps other scoring components.

Developer runbook (quick):

```powershell
# Start DB
cd db; docker compose up -d

# Install deps
npm install

# Build server and run migrations
cd server; npm run build; npm run migrate

# (Optional) bootstrap admin
npm run admin:bootstrap

# Start dev servers (two terminals)
# API
cd server; npm run dev
# Client
cd client; npm run dev
```

---

If you want, I can:
- add an admin report generator endpoint (CSV/JSON export) and an admin UI to download system reports;
- create a CLI `seed` script that inserts 50 realistic users and sample listings (I can implement and run it now if you confirm);
- expand the runbook with environment variable descriptions and troubleshooting tips.

End of corrected Chapter 7
   - Save/unsave listings; quick access in the UI.
8. **Admin Dashboard**
   - View users/listings; moderation (hide/delete), verification flags, system stats.
9. **Mapping & Geocoding**
   - Interactive maps via Leaflet; address-to-coordinates lookup via Nominatim.
10. **Security**
    - Helmet headers, CORS allowlist, rate limiting, payload validation, cache-control safeguards on API routes.

### 7.3.2 Extended Features (Planned/Next)
- Stricter password complexity validation, central error handler, message pagination, unread tracking at participant level, refresh-token rotation, Prometheus metrics endpoint, and RBAC refinements.

---

## 7.4 Database Management System

- **Engine**: PostgreSQL with PostGIS extension enabled for geospatial types and functions.
- **Migrations**: server/src/tools/migrate.ts ensures schema elements exist idempotently.
- **Key Entities** (illustrative, not exhaustive):
  - users: auth info, org metadata (name/type/license/contact), org_verified, disabled.
  - listings: title, description, category, quantity, is_urgent, is_hidden, location geography(Point,4326), timestamps.
  - conversations: unique pairs (or listing-specific) between users; enforced uniqueness to avoid duplicates.
  - messages: conversation messages with sender, body, timestamps.
  - 
atings: 15 star ratings, one-per-transaction safeguards, aggregates for reputation.
  - 
otifications: recipient, type, payload, read state, timestamps.
- **Indexing & Constraints**:
  - GiST index on listings.location for spatial queries.
  - B-tree indexes on frequently filtered columns (e.g., category, is_urgent).
  - Unique constraints to protect integrity (e.g., conversation uniqueness, rating rules).
- **Spatial Logic**:
  - Distance calculations use ST_Distance on geography points when PostGIS is present; otherwise, the API degrades gracefully (distance omitted, other factors maintained).

---

## Appendix: Developer Runbook (Dev)

`powershell
# 1) Start database
cd db; docker compose up -d

# 2) Install dependencies (root workspaces)
npm install

# 3) Build server and run migrations
cd server; npm run build; npm run migrate

# 4) (Optional) Bootstrap an admin account
npm run admin:bootstrap

# 5) Start servers (two terminals recommended)
# API
cd server; npm run dev
# Client
cd client; npm run dev
`

**Notes**:
- **CORS origins**: configure via CORS_ORIGIN env var for allowed frontends.
- **Rate limits**: adjustable via environment; disabled in dev if needed.
- **Matching**: pass user location and filters to tune suggestions in the Dashboard UI.
