docker-compose up --build

# Automation Platform

This repository is a minimal skeleton for an automation platform with three components:

- `backend/` — Hono API and Prisma schema
- `worker/` — BullMQ worker that executes workflows
- `frontend/` — React + React Flow app

This README documents how to set up and run the project for local development.

**Prerequisites**:

- **Docker** (optional but recommended for DB & Redis)
- **Node.js** (v18+ recommended) and `npm`
- `psql` (optional, for manual DB inspection)
- macOS users: default shell is `zsh` (commands below use zsh)

**Ports used by the stack**:

- `3000` — backend HTTP API
- `5432` or `5433` — Postgres (depends on local conflict; see notes)
- `6379` — Redis

**Quick start (Docker)**

This starts a Postgres and Redis instance using `docker-compose` (no build required):

```bash
# from repository root
docker-compose up -d

# backend will still need its dependencies installed (see below)
```

If your machine already has Postgres running on port `5432`, Docker may bind Postgres to another host port (or you can edit `docker-compose.yml`).

**Backend — Local development**

1. Install dependencies and generate Prisma client:

```bash
cd backend
npm install
npx prisma generate
```

2. Apply migrations / reset DB (destructive):

```bash
# destructive: drops all data and reapplies migrations
npx prisma migrate reset --force

# or apply existing migrations to the target DB
npx prisma migrate deploy
```

3. Start the backend in dev mode:

```bash
npm run dev
```

### Environment Variables

⚠️ **Important**: Never commit `.env` files with sensitive credentials to version control.

Environment variables are read from `backend/.env`. For security:

1. Copy the example file:

   ```bash
   cp backend/.env.example backend/.env
   ```

2. Fill in your actual credentials in `backend/.env`:

   ```env
   DATABASE_URL="postgresql://prisma:prisma@localhost:5432/automation?schema=public"
   REDIS_URL="redis://localhost:6379"
   PORT=3000
   CREDENTIAL_ENCRYPTION_KEY="your-32-byte-base64-key"
   TELEGRAM_BOT_TOKEN="your-bot-token"
   TELEGRAM_CHAT_ID="your-chat-id"
   ```

3. Generate a secure encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

📖 See [SECURITY.md](./SECURITY.md) for complete security best practices.

**Worker — Local development**

1. Install dependencies and generate Prisma client for the worker package:

```bash
cd worker
npm install
npx prisma generate
```

2. Start the worker (dev):

```bash
npm run dev
```

The worker expects `REDIS_URL` and `DATABASE_URL` to be set (it reads from the same `.env` if you started it from the repo root or you can create a `worker/.env`).

**Frontend — Local development**

1. Install dependencies and run the dev server:

```bash
cd frontend
npm install
npm run dev
```

2. The Vite dev server will print the local URL (e.g. `http://localhost:5173`).

**Common Prisma commands**

- Generate client after schema changes:

```bash
npx prisma generate
```

- Create and inspect migrations:

```bash
npx prisma migrate dev --name "my-change"
npx prisma migrate deploy   # apply existing migrations (CI/production)
```

**Resetting the DB (destructive)**

If you are in development and want to drop all data and reapply migrations:

```bash
cd backend
npx prisma migrate reset --force
```

**Troubleshooting notes**

- If you see errors about `@prisma/client did not initialize yet`, run `npx prisma generate` in the package where the error originated (`backend` or `worker`).
- Keep `prisma` (devDependency) and `@prisma/client` versions aligned across `backend` and `worker` to avoid runtime mismatches.
- If you run into `PRISMA_CLIENT_ENGINE_TYPE` or query-engine panics, try switching engine type or reinstalling dependencies:

```bash
# try forcing binary engine
PRISMA_CLIENT_ENGINE_TYPE=binary npm run dev

# or reinstall packages
rm -rf node_modules package-lock.json && npm install
```

**Developer tips**

- Each package has its own `prisma/schema.prisma`. You can keep these copies if you want isolation. Run `npx prisma generate` inside each package after schema changes.
- To run the whole system quickly during development: start Redis and Postgres with docker-compose, then start the backend and worker in separate terminals.

If you want, I can add scripted shortcuts (root-level `package.json` scripts) to run generate/migrate for both `backend` and `worker`, or add `Dockerfile`s and update `docker-compose` to build service images.
