import os
from datetime import date as date_cls, datetime, timedelta
import requests
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

load_dotenv()

mcp = FastMCP("Apex")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def _headers():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env")
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


def _get(path: str, params: dict | None = None):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=_headers(), params=params)
    r.raise_for_status()
    return r.json()


def _post(path: str, body: dict | list):
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers={**_headers(), "Prefer": "return=representation"},
        json=body,
    )
    r.raise_for_status()
    return r.json()


def _patch(path: str, body: dict, params: dict):
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers={**_headers(), "Prefer": "return=representation"},
        params=params,
        json=body,
    )
    r.raise_for_status()
    return r.json()


@mcp.tool()
def apex_get_profile(user_id: str) -> dict:
    """Fetch a user's profile row (targets etc.) by user_id (auth.users.id)."""
    rows = _get("profiles", params={"id": f"eq.{user_id}", "select": "*"})
    return rows[0] if rows else {}


@mcp.tool()
def apex_get_today_summary(user_id: str, date: str | None = None) -> dict:
    """Return totals + remaining for a given date (YYYY-MM-DD)."""
    d = date or date_cls.today().isoformat()
    prof = apex_get_profile(user_id)

    logs = _get("daily_logs", params={"user_id": f"eq.{user_id}", "date": f"eq.{d}", "select": "id"})
    if not logs:
        totals = {"protein": 0, "fat": 0, "carbs": 0, "calories": 0}
    else:
        log_id = logs[0]["id"]
        meals = _get("logged_meals", params={"daily_log_id": f"eq.{log_id}", "select": "protein,fat,carbs,calories"})
        totals = {
            "protein": sum(m.get("protein", 0) or 0 for m in meals),
            "fat": sum(m.get("fat", 0) or 0 for m in meals),
            "carbs": sum(m.get("carbs", 0) or 0 for m in meals),
            "calories": sum(m.get("calories", 0) or 0 for m in meals),
        }

    remaining = {
        "protein": max(0, int((prof.get("target_protein") or 0) - totals["protein"])),
        "fat": max(0, int((prof.get("target_fat") or 0) - totals["fat"])),
        "carbs": max(0, int((prof.get("target_carbs") or 0) - totals["carbs"])),
        "calories": max(0, int((prof.get("target_calories") or 0) - totals["calories"])),
    }

    return {"date": d, "totals": totals, "remaining": remaining, "targets": {
        "protein": prof.get("target_protein"),
        "fat": prof.get("target_fat"),
        "carbs": prof.get("target_carbs"),
        "calories": prof.get("target_calories"),
    }}


@mcp.tool()
def apex_log_meal(user_id: str, date: str, category: str, name: str, protein: int = 0, fat: int = 0, carbs: int = 0) -> dict:
    """Log a meal (quick-add macros). Category: breakfast|lunch|dinner|snack."""
    calories = int(protein) * 4 + int(carbs) * 4 + int(fat) * 9

    logs = _get("daily_logs", params={"user_id": f"eq.{user_id}", "date": f"eq.{date}", "select": "id"})
    if not logs:
        created = _post("daily_logs", {"user_id": user_id, "date": date})
        log_id = created[0]["id"]
    else:
        log_id = logs[0]["id"]

    meal = _post("logged_meals", {
        "daily_log_id": log_id,
        "user_id": user_id,
        "name": name,
        "category": category,
        "protein": int(protein),
        "fat": int(fat),
        "carbs": int(carbs),
        "calories": calories,
    })

    return {"ok": True, "meal": meal[0] if meal else None}


@mcp.tool()
def apex_top_foods(user_id: str, days: int = 30, limit: int = 20) -> dict:
    """Return most frequently logged meal names over last N days (approx; v1 uses client-side aggregation)."""
    since = (date_cls.today() - timedelta(days=int(days))).isoformat()

    # Find logs since date
    logs = _get(
        "daily_logs",
        params={
            "user_id": f"eq.{user_id}",
            "date": f"gte.{since}",
            "select": "id,date",
        },
    )

    if not logs:
        return {"since": since, "items": []}

    # Pull meals for each log and aggregate
    counts = {}
    for log in logs:
        meals = _get("logged_meals", params={"daily_log_id": f"eq.{log['id']}", "select": "name"})
        for m in meals:
            nm = (m.get("name") or "").strip()
            if not nm:
                continue
            counts[nm] = counts.get(nm, 0) + 1

    items = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[: int(limit)]
    return {"since": since, "items": [{"name": k, "count": v} for k, v in items]}


def main():
    mcp.run()


if __name__ == "__main__":
    main()
