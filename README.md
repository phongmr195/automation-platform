# Automation Platform (skeleton)

This repository contains a minimal skeleton for an automation platform with three parts:

- `backend/` — Hono API and Prisma schema
- `worker/` — BullMQ worker
- `frontend/` — React + React Flow app

Quick start (requires Docker):

```bash
# from repository root
docker-compose up --build
```

Notes:
- Each service has a minimal `package.json` and starter files under `src/`.
- Update `backend/.env` for database/redis connection values when running outside Docker.

Next steps you may want me to do:
- Add `Dockerfile`s for `backend` and `worker` and switch `docker-compose` to build images instead of running `npm install` each start.
- Install and configure Prisma client and run migrations.
- Wire the backend to start an HTTP server (e.g. with `node`/`bun` or a small runner script).
- Create a `Makefile` or developer scripts for local dev.
