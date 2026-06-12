Status: done
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

Post-edit visual confirmation — after the LLM finishes editing code and HMR re-renders the page, briefly flash the affected elements with a green outline so the user can see what changed.

### Interface

- After receiving `design:done` from the server, the client script:
  1. Waits ~500ms for HMR to re-render
  2. Queries each previously-submitted `data-oid` element
  3. Applies a green outline (`2px solid #a6e3a1`) for ~2 seconds
  4. Removes the outline
- The widget already tracks which elements were submitted (the `selections` array before `setProcessing(true)` clears it)
- Need to preserve the submitted `data-oid` list before clearing so we can flash them on `design:done`

### Behaviours to test

No automated test seam (browser DOM code). Manual test only.

1. Submit a design change → LLM edits code → HMR fires → green outline appears on changed elements for 2s
2. If the element no longer exists after HMR (component removed), no error — just skip
3. If multiple elements were submitted, all get the green flash simultaneously
4. After the 2s flash, outlines are removed cleanly (no residual styles)
5. Flash does not interfere with subsequent Alt+Click selections

### Key files

- `packages/react-plugin/src/vite-plugin.ts` — preserve submitted data-oids before clearing, add green flash logic in `setProcessing(false)` or in `handleServerMessage` for `design:done`

## Acceptance criteria

- [ ] After `design:done`, previously-submitted elements flash green for ~2s
- [ ] Missing elements (removed by edit) handled gracefully
- [ ] Green flash clears cleanly after timeout
- [ ] Does not interfere with subsequent selections
