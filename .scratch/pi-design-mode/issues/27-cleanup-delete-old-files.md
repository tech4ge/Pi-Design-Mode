Status: done

## Parent

PRD: `.scratch/pi-design-mode/prd-browser-client-consolidation.md`

## What to build

Final cleanup after #25 and #26 are merged. Remove dead code and verify the full test suite passes.

- Remove `HIGHLIGHT_STYLE_ID` constant (was declared but never used in vite-plugin.ts template — now irrelevant since template is deleted, but verify no remnants)
- Remove `generateClientScript`-related test expectations if any linger
- Verify `formatDataOid` in `react-plugin/src/data-oid.ts` has the conditional projectHash guard (matching `extension/src/data-oid.ts`)
- Run full test suite: `vitest run` in both `packages/react-plugin` and `packages/extension`
- Verify both test apps work end-to-end with the consolidated client
- Update layout import in `test-app-nextjs` if not done in #26

## Acceptance criteria

- [ ] All 34 tests pass (`vitest run` in both packages)
- [ ] No remnants of `generateClientScript` or `HIGHLIGHT_STYLE_ID` in the codebase
- [ ] `formatDataOid` in react-plugin matches extension version
- [ ] Vite test app: design mode fully functional (select, submit, inspect, flash)
- [ ] Next.js test app: design mode fully functional (select, submit, inspect, flash)

## Blocked by

- #25 Vite plugin reads built file
- #26 Next.js import rework
