---
name: review
description: Delegate a verification and code review before merge. Use after committing implementation on a feature branch, before asking user to merge. ALWAYS delegates to a subagent — never reviews own work inline. Persists review output to the relevant .scratch/ directory.
---

# Pre-merge Review

Delegate a verification and code review to the `reviewer` subagent before asking the user to merge. This runs **after** step 6 (commit) and **before** step 7 (update issue status / ask merge) in the implementation checklist.

## Hard rules

1. **Always delegate.** The implementing agent NEVER reviews its own work inline. Always use the `reviewer` subagent. No exceptions.
2. **Persist the output.** The review report MUST be saved to the relevant `.scratch/<feature-slug>/review.md` so it's linked to the PRD and issues it covers. This is the audit trail — the review does not exist if it's not in `.scratch/`.

## When to trigger

**Every feature branch** — no exceptions. Single-issue or multi-issue, the review step always runs.

## What the reviewer checks

1. **Acceptance criteria** — Every criterion from each issue file verified against actual code. Cite file paths and line numbers.
2. **PRD decisions** — If the branch implements a PRD, verify all resolved decisions (D1–Dn) are reflected in code.
3. **Code quality** — Correctness, error handling, race conditions, consistency with established patterns.
4. **Type safety** — Unsafe casts, type mismatches, generated types out of date.
5. **Security** — RLS protection, auth checks in server actions, input validation.
6. **Completeness** — UI that calls non-existent actions, actions referencing missing services/columns.
7. **Tests** — All suites run and pass (Vitest + pgTAP). New failures are not acceptable.

## Severity scale

| Level | Meaning | Merge gate |
|---|---|---|
| **Critical** | Logic bug, security hole, data corruption risk | Must fix |
| **Warning** | Wrong behavior per spec, type-safety issue, pattern violation | Must fix |
| **Nitpick** | Style, DRY, minor refactor, could-be-better | Optional — log or skip |

## Merge gate rule

**Fix all critical + warning findings before merge.** Nitpicks are optional — commit them if trivial, log as separate issues if not.

## How to delegate

Use the `reviewer` subagent. Set `output` to persist the review report to `.scratch/`:

```
subagent({
  agent: "reviewer",
  output: ".scratch/<feature-slug>/review.md",
  outputMode: "file-only",
  task: `
    ## Review: <branch-name>
    
    <brief description of what the branch implements>
    
    ### Issues to verify
    
    <list issue files with paths>
    
    ### Key files to review
    
    <list new files and modified files with paths>
    
    ### PRD decisions to verify
    
    <path to PRD, list relevant D-numbers>
    
    ### Test commands
    
    - npx vitest run
    - supabase test db -- --match <relevant test prefixes>
    - npx tsc --noEmit 2>&1 | grep -c "error TS"
    
    ### Output format
    
    Produce a markdown report with:
    1. Acceptance criteria checklist (per issue, ✅ or ❌ with file+line evidence)
    2. Code review findings (critical / warning / nitpick)
    3. Test results
    4. PRD decisions verified
    5. Overall verdict: merge-ready / needs fixes before merge
    
    This report will be saved to .scratch/<feature-slug>/review.md.
  `,
  acceptance: {
    criteria: [
      { id: "acceptance-criteria-verified", must: "All acceptance criteria checked against code", evidence: ["review-findings"] },
      { id: "code-review-complete", must: "Findings at critical/warning/nitpick severity", evidence: ["review-findings"] },
      { id: "test-results", must: "All test suites run and reported", evidence: ["commands-run"] },
      { id: "prd-decisions-checked", must: "PRD decisions verified against implementation", evidence: ["review-findings"] },
    ],
    evidence: ["review-findings", "commands-run"],
    maxFinalizationTurns: 3,
  }
})
```

## After the review

1. **Read the review report** at `.scratch/<feature-slug>/review.md`. If the subagent failed but produced partial output in the artifact file, copy it to the `.scratch/` path manually.
2. **Fix critical + warning findings** — commit fixes with message like `fix: reviewer findings — <summary>`.
3. **Optionally fix nitpicks** — if trivial, include in the same commit.
4. **Re-run tests** to confirm fixes don't break anything.
5. **If reviewer verdict was "needs fixes"**, re-delegate a focused review on just the fixes (lighter scope). Append findings to the same `review.md`.
6. **Proceed to step 9** (update issue status, ask user to merge).

## Implementation checklist (updated)

1. Check issue status
2. Create branch from main
3. Write failing tests
4. Implement fix
5. Run all test suites
6. Commit with issue reference
7. **Delegate review** (output to `.scratch/<feature-slug>/review.md`) ← this step
8. Fix critical + warning findings from review
9. Update issue status
10. Ask user to merge
11. After merge, delete branch and return to main
