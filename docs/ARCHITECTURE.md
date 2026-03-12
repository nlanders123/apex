# Apex — Architecture

## Frontend

- React + Vite
- Tailwind via `@tailwindcss/vite`

### Key modules

- `src/lib/supabase.js`
  - Supabase client (browser) using `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

- `src/contexts/AuthContext.jsx`
  - Reads the current session on load.
  - Subscribes to auth changes.

## Supabase

### Auth
- Supabase Auth handles passwords + sessions.
- `profiles` table is linked to `auth.users` via trigger on sign-up.

### Data model (MVP)
- `profiles`
- `daily_logs` (one per user/day)
- `logged_meals`
- `workout_templates`
- `template_exercises` (migration 001)
- `workout_sessions`
- `logged_exercises`
- `logged_sets`

### Security
Row Level Security (RLS) is enabled.
Policies scope reads/writes to `auth.uid()`.

## AI Door: MCP server

Folder: `mcp_apex/`

Purpose:
- Expose controlled read/write tools over Apex data to AI agents (OpenClaw, Claude Desktop, etc.).

V1 security model:
- Runs locally.
- Uses Supabase **service_role** key (server-side secret).
- Never ship the service_role key to the web frontend.

