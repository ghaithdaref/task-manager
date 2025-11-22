# Smart Task Manager Documentation

This document provides a quick reference for setting up the project locally, understanding the repository layout, and reviewing the core technologies that power the app.

## Setup Steps

1. **Install prerequisites**
   - Node.js 18+ and npm
   - PostgreSQL 14+ (ensure you can create databases)

2. **Clone & install dependencies**
   ```bash
   git clone <repo>
   cd main
   npm install
   ```

3. **Configure environment variables**
   - Copy `apps/api/.env.example` to `apps/api/.env` (create one if it doesn’t exist).
   - Define at least: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `JWT_REFRESH_SECRET`.

4. **Initialize the database**
   ```bash
   cd apps/api
   npm run build       # optional, for TypeScript output
   npm run dev -- --init-db  # or ts-node create-database.ts
   ```
   - Running the API once will execute the SQL in `src/db/schema.sql` to create tables.

5. **Run the API**
   ```bash
   cd apps/api
   npm run dev
   ```
   - Default port: `localhost:4000`

6. **Run the web client**
   ```bash
   cd apps/web
   npm run dev
   ```
   - Open `http://localhost:5173`

## Project Structure

```
h-2/
├─ apps/
│  ├─ api/         # Node.js + Express + PostgreSQL backend (TypeScript)
│  └─ web/         # React + Vite frontend (TypeScript)
├─ docs/           # Project documentation (this directory)
├─ package.json    # Root scripts (install, format, etc.)
└─ package-lock.json
```

- **apps/api**
  - `src/routes` – Express routers (auth, tasks, recurring, analytics)
  - `src/store.ts` – Database access layer
  - `src/db/schema.sql` – PostgreSQL schema

- **apps/web**
  - `src/pages` – Top-level screens (Dashboard, Tasks, Calendar, etc.)
  - `src/components` – Reusable UI blocks (modals, timers, notifications)
  - `src/hooks` – Client-side state helpers (focus sessions, notifications)
  - `src/api` – Axios client wrapper
  - `src/styles.css` – Global theme + layout styles

## Technologies Used

- **Frontend**
  - React 18 + TypeScript
  - Vite dev server
  - React Router
  - TanStack Query for data fetching
  - DnD Kit for drag-and-drop task ordering

- **Backend**
  - Express.js + TypeScript
  - Zod for request validation
  - PostgreSQL with node-postgres
  - JWT auth with short-lived access tokens + refresh tokens

- **Tooling**
  - ESLint + TypeScript configs per package
  - npm workspaces-style dependency layout
  - Local storage for theme + focus timer persistence on the client

Refer to `docs/api.md` for endpoint-level details.
