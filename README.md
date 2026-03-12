# Apex

Workout + nutrition tracking in one app. No bloat.

Apex replaces the spreadsheet-for-workouts + MyFitnessPal-for-food combo with a single PWA that does both. Built for people who know their macros and want fast logging with progressive overload tracking.

## Quick Start

```bash
git clone https://github.com/nlanders123/apex.git
cd apex
npm install
cp .env.example .env   # Add your Supabase credentials
npm run dev
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Backend | Supabase (Postgres + Auth + RLS) |
| Deployment | Vercel (PWA) |
| AI Integration | MCP server (Python, local) |

## Documentation

| Doc | Purpose |
|-----|---------|
| [`CLAUDE.md`](./CLAUDE.md) | AI coding context (conventions, structure, rules) |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | How to work on this project |
| [`docs/PRD.md`](./docs/PRD.md) | Product requirements and roadmap |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Technical architecture and data model |
| [`docs/DESIGN.md`](./docs/DESIGN.md) | UX/UI principles |
| [`docs/DECISIONS.md`](./docs/DECISIONS.md) | Architectural Decision Records |
| [`docs/CHANGELOG.md`](./docs/CHANGELOG.md) | Version history |

## Project Structure

```
src/
├── lib/
│   ├── supabase.js         # Supabase client
│   └── api/                # Data layer (all DB operations)
├── contexts/               # React context providers
├── components/             # Reusable UI components
└── pages/                  # Route-level pages
supabase/
└── migrations/             # Versioned SQL migrations
mcp_apex/                   # AI agent access (MCP server)
docs/                       # Product & engineering docs
```

## License

Private. All rights reserved.
