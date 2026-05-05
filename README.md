# MediMatch - Scaffold

Stage 1 (this scaffold)
- Auth endpoints (register/login/me)
- Listings endpoints (list/create)
- Basic Postgres + PostGIS schema
- Minimal React login + dashboard

How to run
1. Start DB:

```powershell
cd db; docker compose up -d
```

2. Install dependencies:

```powershell
# from project root
npm install
```

3. Start server & client (separate terminals recommended):

```powershell
# Terminal 1  API server (port 4000)
cd server; npm run dev

# Terminal 2  Web client (port 5173)
cd client; npm run dev
```

Quick demo without Docker
1. Copy `server/.env.example` to `server/.env` and keep `USE_MOCK_DB=true`.
2. From `server` run `npm run dev` then open the client and test login/register; the server will use an in-memory mock DB.

Dev accounts (local)

- Admin: lesnar@admin.com / admin123
- User: user1@example.com / password123

Admin reports

- GET `/api/admin/reports/summary`  JSON summary (totals and recent counts)
- GET `/api/admin/reports/summary.csv`  CSV export

Maintenance scripts (server)

From the `server` folder:

```powershell
# Reset core tables (users/listings/matches)
npm run db:reset

# Seed ~50 users and sample listings
npm run db:seed

# Create or promote admin using env vars
# Use values from server/.env or set inline for this session
$env:ADMIN_EMAIL='lesnar@admin.com'; $env:ADMIN_PASSWORD='admin123'; npm run admin:bootstrap
```

Health, readiness, and stats

- Health: `GET /api/health`
- Readiness: `GET /api/readiness`  checks DB connectivity when Postgres backend is active
- Stats: `GET /api/stats`  returns counts of users/listings/matches for the active backend

Inspect DB from CLI (server)

From the `server` folder:

- `npm run db:inspect`        # uses Postgres by default
- `npm run db:inspect:file`   # inspects file DB (sets USE_FILE_DB=true)
- `npm run db:inspect:mock`   # inspects mock DB (sets USE_MOCK_DB=true)

Production (Docker)

Run a production-like setup with Postgres + the Node server using Docker:

1. Ensure Docker Desktop is installed and running.
2. From repo root:

```powershell
docker compose -f docker-compose.prod.yml up --build
```

3. Server will be on port 4000, Postgres on 5432.

Environment variables:

- `JWT_SECRET`: secret used to sign tokens
- `CORS_ORIGIN`: comma-separated allowed origins (default `http://localhost:5173`)
- `DATABASE_URL`: Postgres connection string (used by server)
- `ADMIN_EMAIL`: email used by `admin:bootstrap`
- `ADMIN_PASSWORD`: password used by `admin:bootstrap`
- `USE_MOCK_DB`: when `true`, server uses in-memory mock DB
- `USE_FILE_DB`: when `true`, server uses file-based DB
