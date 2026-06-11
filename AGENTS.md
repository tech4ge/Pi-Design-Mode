## Communication

Caveman mode. See `.pi/skills/caveman/SKILL.md`. Do not revert unless explicitly asked.

---

## Process state machine

Every issue follows this sequence. No step may be skipped.

```
TRIAGE ──► PLAN ──► BRANCH ──► TDD-LOOP ──► COMMIT ──► REVIEW ──► FIX ──► ASK-MERGE ──► DONE
  │           │         │          │          │          │         │         │
  │           │         │          │          │          │         │         └─ merge → delete branch → return to main
  │           │         │          │          │          │         └─ fix all C+W findings
  │           │         │          │          │          └─ async delegate to `reviewer` subagent → `.scratch/<feature>/review.md`
  │           │         │          │          └─ msg refs issue # (e.g. `fix: thing (#01)`)
  │           │         │          └─ one test → one impl → repeat. Refactor only on GREEN. See tdd skill.
  │           │         └─ from `main` only. Slug: `feature/X`, `fix/Y`
  │           └─ confirm interface + behaviours with user. See tdd skill "Planning" step.
  └─ must be `ready-for-agent` or `ready-for-human`. See triage skill.
      │
      └─► DIAGNOSE (bug path only — skip for features)
              │
              └─ reproduce → hypothesise → instrument → fix. See diagnose skill.
                 Must have a feedback loop before hypothesising.
                 Must show ranked hypotheses to user before testing.
                 After fix, re-enter PLAN or go straight to BRANCH if cause is clear.
```

For new features that need a PRD first, the full lifecycle is:

```
DISCOVERY ──► PRD ──► ISSUES ──► (pick an issue → state machine above)
  │             │         │
  │             │         └─ tracer-bullet vertical slices. Quiz user. See to-issues skill.
  │             └─ identify testing seams, get user approval, then write PRD. See to-prd skill.
  └─ explore codebase, understand current state
```

### Transition guards

| Transition | Guard |
|---|---|
| TRIAGE → PLAN | Issue status = `ready-for-agent` or `ready-for-human` |
| PLAN → BRANCH | User confirms interface + behaviours to test |
| BRANCH → TDD-LOOP | On new branch from `main` |
| TDD-LOOP → COMMIT | All suites green (`supabase db test` + `vitest run`). Pre-existing failures OK. |
| COMMIT → REVIEW | Commit exists with issue reference |
| REVIEW → FIX | Review report saved to `.scratch/<feature>/review.md` |
| FIX → ASK-MERGE | All critical + warning findings resolved |
| ASK-MERGE → DONE | **Explicit user approval. No exceptions.** |

### TDD-LOOP detail (see tdd skill)

Vertical slicing only. Never write all tests then all implementation.

```
RED:   write ONE failing test for ONE behaviour
GREEN: minimal code to pass
REFACTOR: clean up — only on GREEN
→ repeat for next behaviour
```

Rules:
- One test at a time. Only enough code to pass current test.
- Never refactor while RED.
- Mock only at system boundaries (external APIs, time). Never mock collaborators.
- Integration-style tests through public interfaces. Tests survive internal refactors.

### PRD detail (see to-prd skill)

1. Explore codebase to understand current state.
2. Identify testing seams — prefer existing seams, use highest seam possible. Propose new seams at highest point. **Get user approval on seams before writing PRD.**
3. Write PRD (problem, solution, user stories, implementation decisions, testing decisions, out of scope). Publish with `ready-for-agent` label.

If the plan is fuzzy or the user's terminology conflicts with `CONTEXT.md`, run a grill-with-docs session first. Challenge every branch of the design tree, sharpen terms, update `CONTEXT.md` + ADRs inline as decisions crystallise.

### Issue breakdown detail (see to-issues skill)

Cut PRDs into vertical-slice tracer bullets. Each slice cuts ALL layers end-to-end. Quiz user on granularity + dependencies before publishing.

### Diagnose detail (see diagnose skill)

Bug path only. Skip for features/enhancements.

1. **Build a feedback loop.** Failing test, curl script, replay harness — whatever gives a deterministic pass/fail signal. Spend disproportionate effort here. Do not proceed without a loop.
2. **Reproduce.** Run the loop. Confirm the failure matches what the user described.
3. **Hypothesise.** Generate 3–5 ranked, falsifiable hypotheses. Show to user before testing.
4. **Instrument.** One probe per hypothesis. Tag debug logs with unique prefix (e.g. `[DEBUG-a4f2]`).
5. **Fix + regression test.** Write regression test at a correct seam before applying fix. If no seam exists, flag it.
6. **Cleanup.** Remove instrumentation, delete throwaway prototypes, state correct hypothesis in commit message.

### Triage detail (see triage skill)

Unlabeled → `needs-triage` → `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`. Quick-override if user says "move to X". If issue needs fleshing out, grill with `/grill-with-docs` before setting status.

---

## Shell & tool rules

1. **No redundant `cd`.** Working directory is already set. Only `cd` to operate outside the project.
2. **Supabase CLI only for DB.** Never `psql`, `pg_dump`, or direct Postgres. Inspect: `supabase db diff` / `supabase gen types`. Test: `supabase db test <path> --local`. Migrate: `supabase migration up`. Never `supabase db reset` unless explicitly asked.
3. **Review output.** `.scratch/<feature>/review.md`. Delete post-merge.

---

## Testing strategy

| Layer | Tool | When |
|---|---|---|
| DB logic (RPCs, constraints, triggers) | pgTAP `supabase/tests/` | Every RPC change. Red first. |
| Pure TypeScript (schemas, maps, functions) | Vitest `src/**/*.spec.ts` | Pure input→output. No mocks. |
| Orchestration (services, actions, handlers) | **Don't unit-test** | Wiring — RPC tests prove the logic. |

---

## Tech stack

TO BE ADDED

---

## Architecture

TO BE ADDED

---

## Agent skills

### Issue tracker

Local markdown — issues live as files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles using default strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
