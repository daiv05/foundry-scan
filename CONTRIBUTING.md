# Contributing to FoundryScan

Thank you for your interest in contributing! This document covers everything you need to get started.

## Ways to contribute

- **Bug reports** - open an issue with the *bug report* template
- **Feature requests** - open an issue with the *feature request* template
- **Pull requests** - fixes, features, docs, tests - all welcome
- **Data sources** - new collectors (LinkedIn, Indie Hackers, GitHub Discussions, etc.)

## Development setup

Follow the [Quick Start](README.md#quick-start) in the README to get the stack running locally.

### Project layout

```
alcsaas/
├── backend/          FastAPI application
│   └── app/
│       ├── routers/  HTTP endpoints
│       ├── services/ Business logic & collectors
│       └── models/   Pydantic schemas
├── frontend/         Next.js 16 app (App Router)
│   └── src/
│       ├── app/      Pages and layouts
│       ├── components/
│       └── lib/      API client, types, utilities
├── pocketbase/       Dockerfile + migrations
└── docs/             Feature specs
```

## Code style

- **Backend**: follow existing patterns - async/await throughout, Pydantic for all I/O, no global mutable state
- **Frontend**: RawBlock design system (no Tailwind component libraries, no rounded corners, no shadows). Match the existing visual language exactly
- **Commits**: conventional format preferred - `feat:`, `fix:`, `refactor:`, `docs:`

## Adding a new data source collector

1. Create `backend/app/services/collector/your_source.py`
2. Implement `async def collect(keywords: list[str]) -> list[dict]`
3. Register it in `scan_service.py` inside `collection_tasks`
4. Add a timeout-safe entry to `task_labels`
5. Open a PR with a short description of the source and its collection method

## Environment variables

Copy the example files and fill in your values:

```bash
cp .env.example .env.local           # docker-compose overrides (optional)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Product Hunt token is the only optional external credential - all other data sources require no API keys.

## Pull request process

1. Fork the repository and create a feature branch
2. Make your changes with clear, focused commits
3. Confirm `docker compose up --build` runs cleanly
4. Open a PR against `main` - the template will guide you

## Code of conduct

Be respectful. Constructive feedback only. No harassment of any kind.
