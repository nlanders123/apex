# Contributing to Apex

## Development Setup

```bash
git clone https://github.com/nlanders123/gym-tracker.git apex
cd apex
npm install
```

Create `.env` in the project root:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Run the dev server:
```bash
npm run dev
```

## Branch Strategy

- `main` — production. Always deployable. Never push directly.
- `feat/<name>` — new features (e.g., `feat/exercise-library`)
- `fix/<name>` — bug fixes (e.g., `fix/copy-yesterday-timezone`)
- `refactor/<name>` — structural changes (e.g., `refactor/data-layer`)
- `docs/<name>` — documentation only

### Workflow

1. Create a branch from `main`
2. Make changes in small, atomic commits
3. Push and open a PR
4. Merge to `main` after review

## Commit Messages

Use imperative mood. Focus on *why*, not *what*.

Good:
- `add exercise library for progressive overload tracking`
- `separate Supabase calls into API layer for testability`
- `fix timezone bug in copy-yesterday feature`

Bad:
- `updated stuff`
- `fix`
- `WIP`

## Database Changes

All schema changes go through Supabase CLI migrations:

```bash
# Create a new migration
supabase migration new descriptive_name

# Edit the generated SQL file in supabase/migrations/

# Apply to remote
supabase db push
```

Never run ad-hoc SQL in the Supabase dashboard for schema changes. If you need to, capture it as a migration afterward.

## Code Organisation

- **Data operations** → `src/lib/api/` (never call Supabase directly from components)
- **Shared components** → `src/components/`
- **Page components** → `src/pages/`
- **Auth** → `src/contexts/AuthContext.jsx`

## Documentation

When you make a significant change, update:
- `docs/CHANGELOG.md` — what changed
- `docs/DECISIONS.md` — if an architectural decision was made
- `docs/ARCHITECTURE.md` — if the data model or structure changed
- `CLAUDE.md` — if conventions or project structure changed
