# CLAUDE.md — Apex

> AI coding context file. Read by Claude Code, Codex, Cursor, and other AI dev tools.
> For product details see `docs/PRD.md`. For architecture see `docs/ARCHITECTURE.md`.

## What Is Apex

A fitness tracker PWA that combines workout logging and nutrition tracking in one app. Built as a Supabase + React product targeting users who find MyFitnessPal bloated and expensive, and who currently split their tracking across multiple apps/spreadsheets.

**Owner:** Neil Landers (nmalanders@yahoo.com)
**Repo:** github.com/nlanders123/gym-tracker (to be renamed to `apex`)
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
│   │       ├── workouts.js   # Template, session, set operations
│   │       └── profile.js    # Profile CRUD
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

**Version:** 0.1.0 (MVP foundation)
**What works:** Auth, nutrition logging, workout templates + session logging
**What's in progress:** Data layer refactor, exercise library, progressive overload
**What's next:** See `docs/PRD.md` for roadmap

## Local Development

```bash
# Clone and install
git clone https://github.com/nlanders123/gym-tracker.git apex
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
