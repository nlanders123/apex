# Changelog

All notable changes to **Apex** will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- (placeholder)

---

## [0.2.0] - 2026-03-27

### Added
- Workout duration timer with live elapsed time display
- "Finish Workout" button with session completion summary (exercises, sets, volume, duration)
- Recent meals quick-log in meal picker (deduplicated last 14 days, one-tap re-log)
- Session notes (free text on workout sessions)
- Exercise notes (free text per exercise during a session)
- Notes display in past session summary view

### Changed
- MealLoggerModal pick view now shows "Recent" section above "Saved" section
- TemplateEditor refactored to use data layer API instead of direct Supabase calls

### Fixed
- Data layer violation in TemplateEditor (was calling supabase.from() directly)

---

## [0.1.0] - 2026-03-02

### Added
- Supabase-backed auth (sign up / sign in / sign out)
- Bottom navigation (Home / Workout / Food)
- Dashboard with nutrition summary, last workout, workout stats, body weight chart, quick-start templates
- Nutrition logging:
  - Quick-add macros (protein/fat/carbs, auto-calculated calories)
  - Meal categories (breakfast, lunch, dinner, snacks)
  - Edit and delete meals
  - Copy yesterday's meals per category
  - Saved meals with use_count sorting
  - Recipe builder modal
  - Barcode scanner (html5-qrcode)
  - Open Food Facts integration (text search + barcode lookup)
  - Water tracking (incremental amounts)
  - Micronutrients (fiber, sugar, sodium)
  - Weekly averages (per-day breakdown)
  - Editable macro targets
  - Date navigation
- Workout logging:
  - Templates (create, delete, list)
  - Exercise library (~140 seeded global exercises with search)
  - Session creation from template
  - Set logging (weight, reps, set number, warmup flag)
  - Progressive overload ("Last time" display per exercise)
  - Exercise history page with PR badge and weight progression chart
  - Session summary view (read-only for past sessions)
  - Workout stats (this week, streak, total)
- Body weight tracking (log from dashboard, 30-day chart, trend indicator)
- PWA (service worker, web manifest, offline caching)
- MCP server scaffold (4 nutrition tools: get_profile, today_summary, log_meal, top_foods)
- Error boundaries and fatal overlay for mobile debugging
- Toast notification system
