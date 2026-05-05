# Database options

This project supports multiple backends during development and production:

- File DB (default in dev): fast JSON file at `server/data/filedb.json`.
- Postgres (recommended for production): use Docker compose or a managed provider.

## Managed Postgres (Supabase, Neon, Render)

1. Create a project (e.g., Supabase) and obtain the connection string (DATABASE_URL).
2. Enable PostGIS extension:
   - In SQL console, run: `CREATE EXTENSION IF NOT EXISTS postgis;`
3. Apply schema (matches `db/init/postgis.sql`). You can run it directly in their SQL editor.
4. Configure the server to connect:
   - Create `server/.env` with:
```
DATABASE_URL=postgres://<user>:<pass>@<host>:<port>/<db>
DISABLE_RATE_LIMIT=true
```
   - The code in `server/src/config/db.ts` uses DATABASE_URL automatically and enables SSL for common providers.
5. Import your existing file data (optional):
```
npm --prefix server run build
npm --prefix server run db:import:file
```
6. Start the server without `USE_FILE_DB`/`USE_MOCK_DB` to use Postgres.

## Local Postgres via Docker

Start services:
```
docker compose -f db/docker-compose.yml up -d
```
- Adminer web UI: http://localhost:8080
  - System: PostgreSQL
  - Server: db (or 127.0.0.1)
  - User: medimatch
  - Password: medimatchpass
  - Database: medimatchdb

## Switching backends

- File DB: set `USE_FILE_DB=true` in env or use file inspector script.
- Mock DB: set `USE_MOCK_DB=true` (tests/demos).
- Postgres: remove both flags; set `DATABASE_URL` or rely on default `DB_*` envs.

Check readiness and stats:
- `GET /api/readiness`
- `GET /api/stats`
