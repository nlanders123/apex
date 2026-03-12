# Apex — Design Principles

This file defines the design/product rules for Apex.

## North Star
Apex should feel like a premium, calm, **low-friction** tool you can use in a noisy gym.

## UX Rules

1. **Fast logging beats perfect logging**
   - Default to Quick Add macros.
   - Avoid forced food search in V1.

2. **1 task per screen**
   - Nutrition screen logs meals.
   - Workouts screen logs sets.
   - No “kitchen sink” dashboards.

3. **No dead ends**
   - Every screen has a next action.

4. **Minimal taps**
   - Primary actions are obvious.
   - Keep forms short.

5. **Progressive disclosure**
   - Advanced features exist, but don’t block beginners.

## Visual System

- Default: **Dark mode first** (zinc palette).
- Typography: bold headers, small supporting copy.
- Components:
  - Prefer reusable patterns (cards, buttons, modals).
  - Avoid custom one-off CSS.

## Accessibility basics

- Tap targets >= 44px
- High contrast text
- Clear error states

## Anti-patterns (avoid)

- “AI slop” (random gradients, inconsistent spacing, mismatched button styles)
- Overstuffed screens
- Requiring users to learn the app before it’s useful

