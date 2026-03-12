# Project PRD (Draft)

## 1. Core Objective (MVP)
A minimalist, frictionless progressive web app (PWA) to track both workouts and nutrition. Built specifically to solve the "bloat" problem of MyFitnessPal while adding essential workout history sync.

## 2. MVP Scope (What it DOES do)
### Workouts
*   **Sessions & Templates:** Start a workout from a saved template or empty session.
*   **Logging:** Log Exercises, Sets, Reps, and Weight.
*   **History (Progressive Overload):** While doing an exercise, instantly see the weight/reps from the *last* time you did it.

### Nutrition (The Core MFP Alternative)
*   **Daily Dashboard:** See today's total Calories, Protein, Fat, Carbs against a set target.
*   **Frictionless Entry:** "Quick Add" capability (e.g., entering "30g P, 10g F, 40g C" without searching for a specific food).
*   **Saved Meals:** Create and reuse "Standard Meals" (e.g., "Morning Oats: 50C, 20P, 10F").
*   **Repeat Yesterday:** One-click copy a meal from the day before.

### Architecture
*   **Auth:** Simple email/password login so data isn't lost if the browser cache clears.
*   **Sync:** Real-time sync across devices (Mac, iPhone).

## 3. What it DOES NOT do (MVP)
*   No barcode scanning yet (Phase 2).
*   No global food database search (OpenFoodFacts) yet (Phase 2).
*   No Apple Health integration yet.
