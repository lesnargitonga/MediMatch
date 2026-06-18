# MediMatch

**MediMatch** is a full-stack medical supply redistribution platform that connects hospitals, clinics, NGOs, and suppliers to move surplus or urgently needed supplies to where they are needed most.

> Built with TypeScript end-to-end. React + Vite client, Node.js/Express API, PostgreSQL + PostGIS, JWT auth.

---

## Features

| Area | What's built |
|---|---|
| **Auth** | Register, login, logout · JWT in httpOnly cookies · role-based routing (user / admin) |
| **Listings** | Create, browse, edit, delete · category, urgency flag, quantity · location autocomplete via Nominatim |
| **Smart matching** | Multi-factor scoring: distance 35%, urgency 20%, reputation 20%, recency 15%, verified 5%, category 4%, quantity 1% |
| **Messaging** | Chat between listing owner and requester |
| **Notifications** | Bell dropdown with unread count, per-user notification feed |
| **Ratings** | Star ratings on users/orgs · aggregate displayed on listings and profiles |
| **Favorites** | Save/unsave listings, synced to server |
| **Map** | Leaflet popup with pin for any listing with coordinates |
| **Admin panel** | User management (role, verify, enable/disable) · listing moderation · CSV export |
| **Dark / light mode** | Full theme support via `data-theme` + localStorage |
| **Mobile nav** | Hamburger drawer on small screens |

---

## Tech Stack

**Client** — React 18, TypeScript, Vite, React Router v6, react-leaflet, react-hot-toast, NProgress, Axios

**Server** — Node.js, Express 4, TypeScript, Zod validation, bcrypt, JWT

**Database** — PostgreSQL 15 + PostGIS 3 (geography columns, `ST_DWithin` distance queries)

**Dev tooling** — ts-node-dev, Docker Compose

---

## Quick Start

### Option A — No setup required (mock DB)

```bash
git clone <repo-url>
cd MediMatch
npm install
```

Create `server/.env` (copy from `server/.env.example`):

```env
PORT=4000
USE_MOCK_DB=true
JWT_SECRET=dev_secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
DISABLE_RATE_LIMIT=true
```

```bash
npm run dev
```

- **Client:** http://localhost:5173
- **API:** http://localhost:4000

### Option B — Postgres + PostGIS

```bash
docker compose -f docker-compose.postgres.yml up -d
```

Create `server/.env`:

```env
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/medimatch
JWT_SECRET=change_me_in_production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

```bash
npm run dev
```

---

## Demo Accounts (mock DB mode)

| Role | Email | Password | Notes |
|---|---|---|---|
| **Admin** | `admin@medimatch.test` | `Admin1234` | Full admin panel access |
| **User** | `demo@medimatch.test` | `Demo1234` | City General Hospital, verified, ⭐ 4.8 |
| **Supplier** | `supplier@medimatch.test` | `Supply1234` | MedSupply Co., unverified |

To register a new **admin** account via the UI, enter code **`ADMIN2025`** in the "Admin code" field on the register page.

---

## Project Structure

```
MediMatch/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── pages/           # Home, Login, Auth (register), Dashboard,
│       │                    # Listings, ListingDetail
│       ├── components/      # Header, MapModal, ChatModal, RatingModal,
│       │                    # ProtectedRoute
│       ├── context/         # AuthContext (JWT state + refresh)
│       └── services/        # Axios API instance
├── server/                  # Express API
│   └── src/
│       ├── routes/          # auth, listings, matches, admin, chat,
│       │                    # ratings, notifications, favorites
│       ├── controllers/     # Business logic per domain
│       ├── middleware/       # Auth guard, rate limiter
│       ├── mock/db.ts       # In-memory seed data (3 users, 3 listings)
│       └── db/fileDb.ts     # JSON file persistence backend
├── docs/                    # Project logbook and implementation docs
├── server/.env.example      # Environment variable reference
└── docker-compose.postgres.yml
```

---

## API Reference (key endpoints)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register new account |
| POST | `/api/auth/login` | — | Login, sets JWT cookie |
| GET | `/api/auth/me` | ✓ | Current user profile |
| PUT | `/api/auth/me` | ✓ | Update profile / password |
| GET | `/api/listings` | — | All visible listings with owner info |
| GET | `/api/listings/:id` | — | Single listing with owner info |
| POST | `/api/listings` | ✓ | Create listing |
| PUT | `/api/listings/:id` | ✓ | Edit own listing |
| DELETE | `/api/listings/:id` | ✓ | Delete own listing |
| GET | `/api/matches/suggest` | ✓ | Scored match suggestions |
| GET | `/api/chat/conversations` | ✓ | Message thread list |
| GET/POST | `/api/chat/messages` | ✓ | Messages in a thread |
| POST | `/api/ratings` | ✓ | Rate a user |
| GET/POST | `/api/notifications` | ✓ | Notification feed |
| GET | `/api/favorites/listings/saved` | ✓ | Saved listings |
| POST | `/api/favorites/listings/save` | ✓ | Save a listing |
| GET | `/api/admin/stats` | admin | Platform stats |
| GET | `/api/admin/users` | admin | All users |
| PUT | `/api/admin/users/:id` | admin | Update role / verify / disable |
| GET | `/api/admin/reports/summary.csv` | admin | CSV report download |

---

## Environment Variables

See `server/.env.example` for the full reference.

| Variable | Description |
|---|---|
| `PORT` | API server port (default `4000`) |
| `JWT_SECRET` | **Required in production.** Secret for signing tokens |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `CORS_ORIGIN` | Allowed client origin |
| `USE_MOCK_DB=true` | In-memory data — no DB needed |
| `USE_FILE_DB=true` | JSON file at `server/data/filedb.json` |
| `DATABASE_URL` | Postgres connection string (when not using mock/file) |
| `DISABLE_RATE_LIMIT=true` | Disable rate limiting in dev |

---

## Deployment

1. Set `NODE_ENV=production` and a strong `JWT_SECRET`.
2. Build the client: `npm run build --prefix client` and serve `client/dist/` via Nginx or a CDN.
3. Deploy the API to any Node host (Railway, Render, Fly.io).
4. For Postgres: enable PostGIS and run `db/init/postgis.sql` once to apply the schema.
5. Set `CORS_ORIGIN` to your production client URL.
