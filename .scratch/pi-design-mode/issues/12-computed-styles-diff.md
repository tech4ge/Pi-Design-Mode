Status: ready-for-agent
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

Send the computed styles of selected elements *after* Pi finishes editing, so Pi can verify its changes actually applied correctly. Currently Pi has no way to confirm its edits had the desired visual effect.

### Changes

1. **Agent-end style snapshot**: On `agent_end` (alongside `design:done`), capture computed styles for each selected element and send as a `design:style-snapshot` message to Pi. Pi can compare "before" vs "after" to verify changes.

2. **Extension processes snapshot**: When extension receives `design:style-snapshot`, log it or include it in the session as a verification message so Pi can self-correct if styles didn't change as expected.

### Interface

**New WS message (Browser→Pi):**
```typescript
{ type: "design:style-snapshot", styles: Record<dataOid, Record<CSSProperty, string>> }
```

**Extension behavior:**
- On `agent_end`, after `design:done`, wait ~300ms then request style snapshot from browser
- Browser captures computed styles for all selected elements (same properties as `design:select`)
- Extension receives snapshot, compares with original, sends `pi.sendMessage` with diff as a verification context message (not triggering a new turn)

### Behaviours to test

1. After Pi edits, style snapshot captured and sent
2. Diff between original and new styles logged
3. No new turn triggered — verification only

### Key files

- `packages/react-plugin/src/vite-plugin.ts` — style capture function in client script
- `packages/extension/src/index.ts` — `agent_end` handler, diff logic
- `packages/extension/src/server.ts` — new message type

## Acceptance criteria

- [ ] `design:style-snapshot` message type defined
- [ ] Browser captures computed styles for selected elements after `agent_end`
- [ ] Extension compares before/after styles and logs diff
- [ ] No new turn triggered by verification
