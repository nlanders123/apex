# Architectural Decision Records (ADRs)

This log captures key technical and product decisions for Apex — what we decided, why, and what we considered. If you're wondering "why is it built this way?", start here.

---

## ADR-001: Supabase Over Custom Backend

- **Date:** 2026-03-02
- **Status:** Accepted
- **Context:** Apex is built by a solo non-developer (Neil) with AI coding tools. Need auth, database, real-time sync, and row-level security without writing backend code.
- **Decision:** Use Supabase (hosted Postgres + Auth + RLS + REST API).
- **Why:** Zero backend code to maintain. Generous free tier. Neil already has Supabase CLI installed and authenticated. Postgres is industry-standard — not locked into a proprietary query language.
- **Trade-offs:** Vendor dependency on Supabase. Less control over auth flows than a custom backend. RLS policies can become complex at scale.
- **Alternatives considered:** Firebase (proprietary query model, harder to migrate off), custom Express/Node backend (too much maintenance for a solo builder).

---

## ADR-002: Client-Side PWA Over SSR/Next.js

- **Date:** 2026-03-02
- **Status:** Accepted
- **Context:** Apex is a mobile-first tool used in the gym. Needs to feel like a native app, work offline for basic caching, and be installable.
- **Decision:** React SPA deployed to Vercel with PWA manifest and service worker.
- **Why:** Simpler architecture. No server-side rendering needed — all data comes from Supabase client SDK. PWA gives install-to-homescreen, offline caching, and push notification capability for later.
- **Trade-offs:** No SSR means no SEO (acceptable — this is an app, not a content site). Initial load slightly slower than SSR.
- **Alternatives considered:** Next.js (adds complexity without SSR benefits for this use case), React Native (premature — validate with PWA first, native later if needed).

---

## ADR-003: Quick-Add Macros Over Food Database for MVP

- **Date:** 2026-03-02
- **Status:** Accepted
- **Context:** MyFitnessPal forces you to search a food database for every entry. This is slow and often inaccurate (user-submitted data). Most gym-focused users already know their macros.
- **Decision:** MVP uses quick-add only — enter protein/fat/carbs directly. No food search.
- **Why:** Fastest possible logging. Removes the biggest friction point in MFP. Users who track macros seriously already know the values.
- **Trade-offs:** Less accessible for beginners who don't know macro values. No barcode scanning.
- **Future:** Phase 2 adds OpenFoodFacts API search and barcode scanning as *optional* features. Quick-add remains the primary flow.

---

## ADR-004: Normalised Exercise Library Over Free-Text Names

- **Date:** 2026-03-12
- **Status:** Accepted
- **Context:** The original implementation stored exercise names as free-text strings on templates and logged exercises. "Bench Press", "bench press", and "BP" would all be treated as different exercises, breaking progressive overload tracking (the core workout feature).
- **Decision:** Create an `exercises` reference table with canonical names, muscle groups, and equipment. Templates and logged exercises reference this table by ID.
- **Why:** Progressive overload requires matching the *same* exercise across sessions. Free text makes this impossible reliably. A normalised library also enables filtering by muscle group, search, and analytics.
- **Trade-offs:** Users can't instantly type any exercise name — they pick from a list (with search) or create a new entry. Slightly more friction on first use.
- **Alternatives considered:** Fuzzy matching on free-text names (fragile, error-prone), forcing exact string matches (bad UX).

---

## ADR-005: Data Layer Separation (API Module)

- **Date:** 2026-03-12
- **Status:** Accepted
- **Context:** The original codebase had Supabase queries inline in React components. Nutrition.jsx alone had 8 separate `supabase.from()` calls mixed with UI state management.
- **Decision:** All Supabase data operations go through `src/lib/api/` modules. Components call API functions, not Supabase directly.
- **Why:** (1) Frontend can be redesigned without rewriting data logic. (2) Business logic is testable independently. (3) Queries are reusable across components. (4) If we ever move off Supabase, we change one layer.
- **Trade-offs:** Slight indirection. More files to maintain.
- **Alternatives considered:** Keep inline (faster to write, but creates tech debt that compounds with every new feature).

---

## ADR-006: JavaScript Over TypeScript (For Now)

- **Date:** 2026-03-12
- **Status:** Accepted (revisit at 20+ components)
- **Context:** Neil is not a developer. TypeScript adds cognitive load and build complexity. The project is small (~15 files of source code).
- **Decision:** Stay with JavaScript. Revisit when the codebase exceeds ~20 components or when we add contributors.
- **Why:** Faster iteration. AI tools generate JS just as well. Type safety matters more when multiple developers are collaborating or when the codebase is large enough that you can't hold it in your head.
- **Trade-offs:** No compile-time type checking. Potential for runtime type errors that TS would catch.

---

## Template for New Decisions

```
## ADR-XXX: Title

- **Date:** YYYY-MM-DD
- **Status:** Proposed | Accepted | Superseded by ADR-XXX
- **Context:** What situation prompted this decision?
- **Decision:** What did we decide?
- **Why:** The reasoning — constraints, goals, trade-offs that led here.
- **Trade-offs:** What we gave up or what risks we accepted.
- **Alternatives considered:** What else we looked at and why we didn't pick it.
```
