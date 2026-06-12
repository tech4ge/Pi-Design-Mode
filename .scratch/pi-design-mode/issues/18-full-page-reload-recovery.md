Status: done
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

Survive full-page reloads by stashing selection state in `sessionStorage` and restoring on reconnect.

### Changes

1. **Persist on change**: Whenever selections change (add, remove, clear), save to `sessionStorage` under key `pi-design-selections` as JSON array of `{dataOid, tagName, computedStyles, boundingBox}`.

2. **Restore on reconnect**: After WS connects and widget initializes, check `sessionStorage` for saved selections. Re-populate selections array, re-apply highlights. Remove entries that no longer exist in the DOM.

3. **Clear on explicit clear**: When user presses Esc or clicks ✕, clear both the in-memory selections AND the sessionStorage entry.

4. **Session-scoped**: Use `sessionStorage` (not `localStorage`) so state doesn't leak across browser sessions.

### Interface

**JS**:
- `sessionStorage.setItem("pi-design-selections", JSON.stringify(selections))` on every mutation
- On init: `sessionStorage.getItem(...)` → parse → validate against DOM → restore
- On clear: `sessionStorage.removeItem("pi-design-selections")`

### Behaviours to test

1. Hard refresh → selections restored with highlights
2. Elements removed from DOM → skipped silently during restore
3. Esc / clear → sessionStorage cleared
4. New browser tab → no stale state (sessionStorage is tab-scoped)
5. Works with processing state (don't restore during processing)

### Key files

- `packages/react-plugin/src/vite-plugin.ts` — client script JS

## Acceptance criteria

- [ ] Selections persisted to sessionStorage on every change
- [ ] Hard refresh restores selections and highlights
- [ ] Missing DOM elements skipped on restore
- [ ] Esc/clear clears sessionStorage
- [ ] Processing state not persisted (only selections)
