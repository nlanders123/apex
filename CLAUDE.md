# CLAUDE.md — Apex

> AI coding context file. Read by Claude Code, Codex, Cursor, and other AI dev tools.
> **Before writing code, read `docs/ENGINEERING.md`** — it has the dev protocol and session logging requirements.
> For product details see `docs/PRD.md`. For architecture see `docs/ARCHITECTURE.md`.

## What Is Apex

A fitness tracker PWA that combines workout logging and nutrition tracking in one app. Built as a Supabase + React product targeting users who find MyFitnessPal bloated and expensive, and who currently split their tracking across multiple apps/spreadsheets.

**Owner:** Neil Landers (nmalanders@yahoo.com)
**Repo:** github.com/nlanders123/apex
**Live:** Deployed on Vercel (PWA)

## Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Frontend | React 19 + Vite 7 + Tailwind 4 | SPA, mobile-first |
| Backend | Supabase (Postgres + Auth + RLS) | No custom backend server |
| Deployment | Vercel | SPA rewrite rules in `vercel.json` |
| PWA | Web manifest + service worker | Offline caching via `sw.js` |
| AI Integration | MCP server (`mcp_apex/`) | Local Python, uses service_role key |
| Migrations | Supabase CLI | `supabase/migrations/` |

## Project Structure

```
apex/
├── docs/                    # Product & architecture docs
│   ├── PRD.md               # Product requirements
│   ├── ARCHITECTURE.md      # Technical architecture & data model
│   ├── DESIGN.md            # UX/UI principles
│   ├── DECISIONS.md         # Architectural Decision Records (ADRs)
│   └── CHANGELOG.md         # Version history
├── src/
│   ├── lib/
│   │   ├── supabase.js      # Supabase client init
│   │   └── api/             # Data layer (all Supabase calls)
│   │       ├── nutrition.js  # Meal & daily log operations
│   │       ├── workouts.js   # Template, session, set, progressive overload
│   │       ├── exercises.js  # Exercise library search & CRUD
│   │       ├── food.js       # Open Food Facts integration
│   │       ├── weight.js     # Body weight tracking
│   │       └── profile.js    # Profile & targets
│   ├── contexts/
│   │   └── AuthContext.jsx   # Auth state provider
│   ├── components/           # Reusable UI components
│   └── pages/                # Route-level page components
├── supabase/
│   ├── config.toml           # Supabase project config
│   └── migrations/           # Versioned SQL migrations
├── mcp_apex/                 # MCP server for AI agent access
├── CLAUDE.md                 # This file
├── README.md                 # Setup guide
└── CONTRIBUTING.md           # How to work on this project
```

## Design Principles

### API-Readiness
Everything we build should be structured so a public REST API can be added later without refactoring. This means:

- **Data layer separation is mandatory** — all data operations go through `src/lib/api/`, never direct Supabase calls from components. These functions become the future API's business logic.
- **RLS is your API auth** — every table must have row-level security scoped to `auth.uid()`. When we expose the Supabase PostgREST API, RLS policies *are* the access control.
- **Clean, consistent schema** — table and column names should be self-documenting. No abbreviations, no inconsistent casing. The schema will become a public contract.
- **Foreign keys and constraints** — enforce data integrity at the database level, not in application code. API consumers won't have our validation logic.
- **Stateless operations** — API functions should not depend on React state or UI context. They take inputs, hit the database, return results.
- **Error handling at the boundary** — API functions return `{ data, error }`. No throwing, no UI-specific error handling inside data functions.
- **Migrations are the source of truth** — every schema change goes through `supabase migration new`. No ad-hoc SQL in production. API consumers need a stable, versioned schema.

We are NOT building the API now. We are building in a way that makes adding one trivial when the time comes.

## Coding Conventions

### General
- JavaScript (not TypeScript — keep it simple for now)
- React functional components with hooks
- No class components
- Tailwind for all styling — no custom CSS files
- Mobile-first responsive design

### Data Layer
- **All Supabase calls go through `src/lib/api/`** — components never import `supabase` directly (except AuthContext)
- API functions return `{ data, error }` — let the caller decide how to handle errors
- Keep API functions small and single-purpose

### UI Conventions
- Dark mode first (zinc palette: zinc-950 bg, zinc-900 cards, zinc-800 borders)
- Tap targets >= 44px for mobile
- `pb-24` on pages to clear the bottom nav
- Use `lucide-react` for icons
- No emojis in UI (use icons instead)

### Git
- Branch per feature: `feat/exercise-library`, `fix/migration-error`
- Commit messages: imperative mood, describe the *why* not the *what*
- Never push directly to main
- Keep commits small and atomic

### Database
- All tables have RLS enabled, scoped to `auth.uid()`
- Use Supabase CLI for migrations: `supabase migration new <name>`
- Never modify production data directly — always through migrations
- Foreign keys with appropriate CASCADE/SET NULL behaviour

## What NOT To Do

- Don't add TypeScript — we'll migrate later if/when complexity warrants it
- Don't add a state management library (Redux, Zustand) — React state + context is sufficient
- Don't add a component library (Shadcn, MUI) — Tailwind primitives only
- Don't add SSR/Next.js — this is a client-side PWA
- Don't mock Supabase in tests — test against a real local instance
- Don't add features not in the current sprint scope without explicit approval
- Don't use `alert()` for user feedback — use proper UI (toast, inline error)

## Current Status

**Version:** 0.2.0 (Daily Driver)
**Phase 1 (MVP) complete:** Auth, nutrition (quick-add, barcode scan, food search, saved meals, recipe builder, water, micronutrients, weekly averages), workout templates + session logging, exercise library (~140 seeded), progressive overload with history charts, body weight tracking, dashboard, PWA, MCP server (4 nutrition tools), error boundaries
**Phase 2 (Daily Driver) in progress:** Workout timer + finish flow, session completion summary, recent meals quick-log, workout/exercise notes
**What's next:** See `docs/PRD.md` for full phased roadmap

## Local Development

```bash
# Clone and install
git clone https://github.com/nlanders123/apex.git
cd apex
npm install

# Create .env (not committed)
# VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
# VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Run dev server
npm run dev

# Supabase migrations
supabase db push        # Apply migrations to remote
supabase migration new  # Create new migration
```

## Key Decisions

See `docs/DECISIONS.md` for the full log. Key ones:
- Supabase over custom backend (ADR-001)
- Client-side PWA over SSR/Next.js (ADR-002)
- Quick-add macros over food database search for MVP (ADR-003)
- Normalised exercise library over free-text exercise names (ADR-004)
