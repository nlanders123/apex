# Apex MCP Server (local)

This is a local MCP (Model Context Protocol) server that exposes Apex (Supabase) fitness + nutrition data as AI-callable tools.

## Why
- Lets an AI agent (OpenClaw / Claude Desktop) **read your fitness/nutrition state** and **log meals/workouts** without manual clicking.
- Enables future automations like: daily summaries, coaching nudges, "top foods", "copy yesterday", etc.

## Security model (V1)
This MCP server uses the **Supabase service_role key** (server-side secret) so it can read/write your data locally.
- Keep this server **local** (your Mac).
- Never ship the service_role key in the web app.

## Setup
Create a `.env` next to `server.py`:

```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Install deps:

```
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run:

```
python server.py
```

## Tools (initial)
- `apex_get_profile()`
- `apex_get_today_summary(date="YYYY-MM-DD")`
- `apex_log_meal(date, category, name, protein, fat, carbs)`
- `apex_top_foods(days=30, limit=20)`

