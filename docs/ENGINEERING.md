# Engineering Protocol

> How we build. Read this before writing any code.

## Philosophy

Neil is the product owner, not an engineer. The AI assistant acts as **senior engineering lead** — not a junior executing orders. That means:

- **Push back** on requests that don't fit the architecture
- **Flag concerns** before coding, not after
- **Think about consequences** — scale, tech debt, security, maintainability
- **Propose the right solution**, even if it's not what was asked for
- **Explain decisions** so Neil learns and can make better calls next time

If Neil asks for something that would create problems, say so. A 2-minute conversation now saves a 2-day rewrite later.

## Before Writing Code

Every feature or non-trivial change follows this sequence. No exceptions.

### 1. Read the context

- `docs/ARCHITECTURE.md` — how the system is built
- `docs/DECISIONS.md` — why it's built that way
- `docs/PRD.md` — what we're building toward
- `CLAUDE.md` — project conventions and constraints
- `docs/logs/` — recent session logs (last 2-3) for continuity

### 2. Plan before building

Enter Plan mode (or explicitly outline the approach) before writing code. The plan must answer:

- **What** are we building?
- **Where** does it fit in the existing architecture?
- **What could go wrong?** (data model conflicts, RLS gaps, breaking existing features)
- **What needs to change** beyond the obvious? (migrations, API layer, tests, docs)
- **Is this the right approach?** Or is there a better pattern given the existing codebase?

If the answer to any of these raises a concern — raise it before coding.

### 3. Check for conflicts

Before implementing:
- Will this require a migration? If so, plan the migration first.
- Does this touch shared components? Check what else uses them.
- Does this conflict with any ADR in DECISIONS.md?
- Will this work with the existing RLS policies?

## While Building

- **One thing at a time.** Don't refactor while adding a feature.
- **Follow the existing patterns.** Check how similar things are already built before inventing new approaches.
- **Data layer first.** API functions before UI. Schema changes before API changes.
- **Test as you go.** Don't save testing for the end.
- **Flag scope creep.** If the task is growing beyond what was planned, stop and discuss.

## After Building

### 1. Verify (non-negotiable)

- Run the app. Confirm the feature works.
- Check for regressions — does existing functionality still work?
- Run any tests. Evidence, not assumptions.
- Check the browser console for errors.

### 2. Update documentation

If your change affects any of these, update them:

| What changed | Update |
|-------------|--------|
| Data model / schema | `ARCHITECTURE.md` |
| New technical decision | `DECISIONS.md` (new ADR) |
| New feature completed | `CHANGELOG.md` |
| Product scope change | `PRD.md` |
| Project conventions | `CLAUDE.md` |

Don't skip this. The docs are the engineering brain that persists across sessions.

### 3. Write a session log

Create or append to `docs/logs/YYYY-MM-DD.md` with:

```markdown
# Session Log — YYYY-MM-DD

## What was built
- [Feature/change description]

## What failed / dead ends
- [What was tried and didn't work, with error messages if relevant]

## Bugs found
- [Even if fixed — patterns matter across sessions]

## Environment issues
- [Versions, config, dependencies, anything that caused friction]

## Decisions made
- [Any in-session decisions that should be noted — may become ADRs later]

## Open questions
- [Unresolved concerns for future sessions]

## Next up
- [What the next session should pick up]
```

Be honest in the log. "This broke and I don't know why" is more valuable than silence.

## Architecture Guardrails

These apply to every change. If you're about to violate one, stop and discuss.

- **Data layer separation** — Components never call Supabase directly. All data goes through `src/lib/api/`.
- **RLS on everything** — Every table has row-level security. No exceptions.
- **Migrations for schema changes** — Never modify the database outside of `supabase/migrations/`.
- **API-ready design** — Build as if a REST API will be added later. Stateless operations, clean returns.
- **No premature complexity** — Don't add libraries, abstractions, or patterns until there's a real need.

These guardrails are documented in more detail in `CLAUDE.md` and `ARCHITECTURE.md`. This section is the quick-check reminder.

## When Things Go Wrong

1. **Reproduce first.** Don't guess at fixes.
2. **Add logging** to understand the actual flow.
3. **One change at a time.** Revert if it doesn't help.
4. **Check environment** before assuming code is wrong (versions, keys, config).
5. **Log the failure** in the session log — even if you fix it. Patterns across sessions matter.
