# Apex — Product Requirements Document

## Vision

A personal fitness tracker that replaces MyFitnessPal for nutrition and adds proper workout logging with progressive overload. Built as a PWA — install once, use everywhere, works offline.

**Target user:** Neil Landers (solo user). No multi-tenant, no onboarding flows, no marketing.

**North star:** Open Apex every day without thinking about it. Logging a meal or a set should take fewer taps than any alternative.

---

## Phase 1: MVP — COMPLETE

Everything below is built, deployed, and working.

### Auth
- Email/password sign-up and sign-in (Supabase Auth)
- Auto-profile creation on signup (DB trigger)
- Session persistence across devices
- Protected routes with redirect to `/login`

### Nutrition
- Daily log model (one per user per date)
- Quick-add macros (protein/fat/carbs, auto-calculates calories)
- Meal logging into 4 categories: Breakfast, Lunch, Dinner, Snacks
- Edit and delete logged meals
- Copy yesterday's meals (per category)
- Saved meals with `use_count` sorting (favourites)
- Recipe builder (add ingredients, calculate per-serving macros, save + log)
- Barcode scanner (html5-qrcode — EAN-13, EAN-8, UPC-A/E, CODE-128, CODE-39)
- Open Food Facts integration (text search + barcode lookup)
- Water tracking (incremental logging on daily_logs)
- Micronutrients (fiber, sugar, sodium) on logged_meals and saved_meals
- Weekly averages (per-day breakdown for current week)
- Editable macro targets (protein/fat/carbs, calories auto-derived)
- Date navigation (back/forward, today shortcut)

### Workouts
- Workout templates (create, delete, list)
- Template exercises from normalised library (~140 seeded global exercises)
- Exercise search with autocomplete in template editor
- Free-text custom exercise fallback (with library match attempt)
- Session creation from template (copies exercises)
- Set logging (weight_kg, reps, set_number, is_warmup)
- Progressive overload: "Last time" display per exercise (prefers exercise_id, falls back to name)
- Exercise history page with PR badge and weight progression chart
- Session summary (read-only view for past sessions)
- Workout stats: this week count, streak, total sessions

### Body Weight
- Log weight (kg) from dashboard (upsert by date)
- 30-day weight history with SVG line chart
- Trend indicator (up/down with delta)

### Dashboard
- Today's nutrition summary (calories + P/F/C progress bars)
- Last workout card (clickable)
- Workout stats grid (week/streak/total)
- Body weight card with chart
- Quick-start workout templates (top 4)

### PWA
- Service worker: network-first for HTML, cache-first for hashed assets
- Web manifest with icons (192px, 512px)
- Installable on iOS and Android
- Offline fallback

### Infrastructure
- Data layer: all Supabase calls through `src/lib/api/` (nutrition, workouts, exercises, food, weight, profile)
- RLS on every table, scoped to `auth.uid()`
- 6 versioned migrations
- MCP server: 4 nutrition tools (get_profile, get_today_summary, log_meal, top_foods)
- Error boundaries + fatal overlay for mobile debugging
- Toast notification system
- Deployed on Vercel with SPA rewrite

---

## Phase 2: Daily Driver

Make Apex the app Neil actually opens every day. Eliminate friction in the daily tracking loop.

### Daily loop this phase optimises for:
- **Morning:** Check yesterday's totals, plan today
- **During day:** Log meals with minimum taps
- **Gym:** Start workout, log sets, see overload, finish cleanly
- **Evening:** Review day, log anything missed

### Features

#### 2.1 Workout Duration Timer + Finish Button
- Live elapsed timer in session header (counts from session start)
- "Finish Workout" button saves duration and transitions to completion view
- `duration_minutes` column already exists — just needs UI + API

#### 2.2 Session Completion Summary
- After finishing, show inline summary: duration, exercise count, total sets, total volume
- Per-exercise breakdown with sets and weights
- "Done" button navigates to workout history

#### 2.3 Recent Meals Quick-Log
- When adding a meal, show deduplicated recent meals (last 7 days) for that category
- One tap to re-log — no searching, no forms
- Appears above saved meals in the pick view
- Automatic (no explicit "save" step needed)

#### 2.4 Workout & Exercise Notes
- Add notes to a session ("felt tired, cut short")
- Add notes to individual exercises ("left shoulder tight")
- Notes display in past session views
- Schema columns already exist

#### 2.5 Copy Any Day's Meals
- Generalise "Copy Yesterday" to copy from any previous day
- When viewing a past date, show "Copy to Today" per category

#### 2.6 Dashboard Quick Actions
- One-tap buttons for common daily tasks: log meal per category, add water, start last template
- Reduce navigation depth for the most frequent actions

#### 2.7 Profile/Settings Page
- Dedicated page for: account info, macro targets, units preference, sign out
- Move macro targets editing from nutrition page to settings
- Add route `/settings` and nav tab

---

## Phase 3: Gym Power User

Deeper workout features for someone training seriously.

### Features

#### 3.1 Workout Programs
- Multi-week programs (e.g., 4-week mesocycle)
- Scheduled templates (Mon = Push, Tue = Pull, etc.)
- Program progress tracking

#### 3.2 Rest Timer
- Configurable rest timer between sets
- Default rest per exercise type (e.g., compound = 3min, isolation = 90s)
- Audio/vibration alert when rest is over

#### 3.3 Supersets & Circuits
- Group exercises in templates (superset pairs, circuits)
- Log sets for grouped exercises in alternating order

#### 3.4 RPE / RIR Tracking
- Optional RPE (Rate of Perceived Exertion) or RIR (Reps in Reserve) per set
- Fatigue tracking over time

#### 3.5 Exercise Library Management
- UI for adding custom exercises (API already exists)
- Muscle group filters in template editor
- Exercise categories and tags

#### 3.6 Drag-to-Reorder Exercises
- Reorder exercises in template editor (order_index exists, UI doesn't)

#### 3.7 Plate Calculator
- Given a target weight, show which plates to load per side

#### 3.8 1RM Estimation
- Estimate one-rep max from logged sets (Epley/Brzycki formula)
- Track 1RM trends per exercise

---

## Phase 4: Insights & AI

Charts, trends, and AI-powered coaching.

### Features

#### 4.1 Nutrition Trends
- Weekly/monthly calorie and macro charts
- Rolling averages, compliance rate against targets

#### 4.2 Body Composition
- Body fat %, measurements (waist, chest, arms)
- Progress photos (optional)

#### 4.3 Workout Volume Trends
- Weekly/monthly volume charts per muscle group
- Frequency tracking (days since last trained X)

#### 4.4 Correlation Analysis
- Weight vs calories over time
- Volume vs bodyweight trends

#### 4.5 Expanded MCP Server
- Workout tools (log workout, get history, get PRs, get volume trends)
- AI meal suggestions ("I have 40P 20F 30C left")
- AI workout recommendations ("you haven't trained legs in 8 days")

#### 4.6 Weekly Report
- Auto-generated summary: nutrition adherence, workout volume, weight trend, PRs hit
- Delivered via MCP or rendered in-app

#### 4.7 Data Export
- CSV/JSON export of all data (meals, workouts, body weight)

---

## Phase 5: Public Launch

If/when Apex becomes a product in the sovereign business portfolio.

### Features

#### 5.1 Onboarding
- Goal selection (lose fat, build muscle, maintain)
- Unit preference (metric/imperial)
- Macro target calculator (based on weight, activity, goal)

#### 5.2 Landing Page & Marketing
- Product marketing site
- Custom domain

#### 5.3 Monetisation
- Stripe integration
- Free tier + premium features

#### 5.4 App Store
- Capacitor or TWA wrapper for iOS/Android app stores

#### 5.5 Social Features
- Share workouts or templates
- Challenges / accountability groups

#### 5.6 Apple Health Integration
- Import steps, active calories
- Export workouts

#### 5.7 Public API
- REST API for third-party integrations (PostgREST via Supabase already implicit)
