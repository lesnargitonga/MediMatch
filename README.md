# MediMatch

MediMatch is a full-stack medical supply redistribution platform scaffold. It combines authentication, listing management, admin reporting, and a map-ready client foundation for coordinating the movement of available supplies between facilities.

## Showcase Focus

- Full-stack TypeScript application design.
- Healthcare logistics product thinking.
- Flexible backend architecture with Postgres, file, and in-memory data modes.

## System Capabilities

- User registration, login, and profile retrieval.
- Listing creation and retrieval for supply availability workflows.
- Admin summary reporting in JSON and CSV.
- Health, readiness, and stats endpoints for operational visibility.
- Multiple persistence modes: Postgres, file-based, and in-memory mock DB.
- React client with login and dashboard foundations.

## Tech Stack

- Node.js and TypeScript
- Express API server
- React + Vite client
- PostgreSQL / PostGIS
- Docker Compose for local database services

## Quick Start

```bash
npm install
npm run db:up
npm run dev
```

This starts the API and client from the workspace root. The main surfaces are:

- API server: `http://localhost:4000`
- Web client: `http://localhost:5173`

## Mock-Mode Demo

For a fast local demo without Docker:

1. Copy `server/.env.example` to `server/.env`.
2. Keep `USE_MOCK_DB=true`.
3. Run `npm run dev`.

## Local Accounts

- Mock-mode coordinator: `test@example.com` / `Password123` (seeded automatically when `USE_MOCK_DB=true`).
- Admin: register once with the email set in `ADMIN_EMAIL` (`lesnar@admin.com` by default) — the Login screen's "Create demo admin account" shortcut pre-fills this. Admin role is granted server-side by matching `ADMIN_EMAIL`, never by client input.

## Repository Map

- `server/src/app.ts`: API setup and middleware.
- `server/src/routes/`: users, listings, matches, admin, chat, ratings, notifications, and favorites routes.
- `server/src/db/`: persistence backends and database helpers.
- `client/src/`: React client surfaces.
- `shared/`: shared types and cross-package contracts.
- `db/`: local database support and compose files.

## Notes

- This repository is a strong scaffold rather than a finished healthcare product.
- Several domains such as chat, ratings, notifications, and favorites are present as build surfaces and extension points.
- Environment settings such as `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGIN`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` control local and production-like runs.
